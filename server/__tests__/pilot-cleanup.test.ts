import { expect, it, vi } from "vitest";
import { ChildProcess } from "node:child_process";
import {
  captureOwnedContainer,
  removeOwnedContainer,
  stopOwnedChild,
  spawnOwnedChild,
} from "../../e2e/pilot/cleanup";
const id = "a".repeat(64),
  volume = "b".repeat(64),
  name = "owned-pilot";
it("refuses identity mismatch and never removes external named volumes", () => {
  for (const item of [
    { Id: id, Name: "/wrong" },
    {
      Id: id,
      Name: `/${name}`,
      Config: { Labels: { "core.rehearsal.attempt": name } },
      Mounts: [{ Type: "volume", Name: "external" }],
    },
  ]) {
    expect(() => captureOwnedContainer(() => JSON.stringify([item]), name, id)).toThrow();
  }
});
it("reports remaining owned volumes without deleting them when container is absent", () => {
  const calls: string[][] = [];
  const result = removeOwnedContainer(
    (...args) => {
      calls.push(args);
      return args[0] === "volume" ? volume : "";
    },
    { containerId: id, containerName: name, anonymousVolumes: [volume] },
  );
  expect(result.passed).toBe(false);
  expect(result.remainingOwnedVolumes).toEqual([volume]);
  expect(calls.some((args) => args[0] === "rm")).toBe(false);
});
it("awaits actual SIGKILL exit after child ignores SIGTERM", async () => {
  const child = spawnOwnedChild(
    process.execPath,
    ["-e", "process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)"],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  await new Promise<void>((resolve) => child.stdout!.once("data", () => resolve()));
  expect(await stopOwnedChild(child, 50, 2000)).toBe(true);
  expect(child.signalCode).toBe("SIGKILL");
});

it("does not report success when owned container removal fails", () => {
  const result = removeOwnedContainer(
    (...args) => {
      if (args[0] === "inspect")
        return JSON.stringify([
          {
            Id: id,
            Name: `/${name}`,
            Config: { Labels: { "core.rehearsal.attempt": name } },
            Mounts: [{ Type: "volume", Name: volume }],
          },
        ]);
      if (args[0] === "rm") throw new Error("synthetic removal failure");
      return id;
    },
    { containerId: id, containerName: name, anonymousVolumes: [volume] },
  );
  expect(result.passed).toBe(false);
  expect(result.containersRemoved).toBe(false);
});

it("stops the owned group after its parent exits leaving an unref descendant", async () => {
  const parent = spawnOwnedChild(
    process.execPath,
    [
      "-e",
      `
    const child = require('node:child_process').spawn(process.execPath,
      ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],
      {stdio:'ignore'});
    console.log(child.pid); child.unref();
  `,
    ],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  const pid = await new Promise<number>((resolve) =>
    parent.stdout!.once("data", (data) => resolve(Number(String(data).trim()))),
  );
  await new Promise<void>((resolve) => parent.once("exit", () => resolve()));
  expect(() => process.kill(pid, 0)).not.toThrow();
  try {
    expect(await stopOwnedChild(parent, 50, 2000)).toBe(true);
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    await stopOwnedChild(parent, 50, 2000);
  }
});

function groupAbsent(pid: number) {
  try {
    process.kill(-pid, 0);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return true;
    throw error;
  }
}

async function deferredExitPublication(delayMs: number) {
  const child = spawnOwnedChild(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
  // Controlled ordering, not a claim about a prior incident: libuv reaps the
  // real child before this internal callback publishes exitCode in JavaScript.
  const handle = (
    child as unknown as {
      _handle: { onexit: (code: number, signal: string) => void };
    }
  )._handle;
  const original = handle.onexit;
  const observed = new Promise<void>((resolve) => {
    handle.onexit = function (code, signal) {
      setTimeout(() => original.call(this, code, signal), delayMs);
      resolve();
    };
  });
  await observed;
  return child;
}

it("waits for delayed leader exit publication after the real group disappears", async () => {
  const child = await deferredExitPublication(60);
  try {
    expect(groupAbsent(child.pid!)).toBe(true);
    expect(child.exitCode).toBeNull();
    expect(child.signalCode).toBeNull();
    expect(await stopOwnedChild(child, 1000, 1000)).toBe(true);
    expect(child.exitCode).toBe(0);
    expect(groupAbsent(child.pid!)).toBe(true);
  } finally {
    // Reap even if the old implementation returns its premature false result.
    if (child.exitCode === null && child.signalCode === null)
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
    expect(await stopOwnedChild(child, 100, 1000)).toBe(true);
  }
});

it("does not succeed when leader exit publication exceeds both deadlines", async () => {
  const child = await deferredExitPublication(200);
  try {
    expect(await stopOwnedChild(child, 10, 10)).toBe(false);
    expect(child.exitCode).toBeNull();
  } finally {
    if (child.exitCode === null && child.signalCode === null)
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
    expect(await stopOwnedChild(child, 100, 1000)).toBe(true);
  }
});

it("waits for an ordinary owned leader to exit gracefully", async () => {
  const child = spawnOwnedChild(
    process.execPath,
    [
      "-e",
      'process.on("SIGTERM",()=>process.exit(0));console.log("ready");setInterval(()=>{},1000)',
    ],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  await new Promise<void>((resolve) => child.stdout!.once("data", () => resolve()));
  try {
    expect(await stopOwnedChild(child, 1000, 1000)).toBe(true);
    expect(child.exitCode).toBe(0);
    expect(groupAbsent(child.pid!)).toBe(true);
  } finally {
    await stopOwnedChild(child, 100, 1000);
  }
});

it("never signals an unregistered child", async () => {
  const child = new ChildProcess();
  const kill = vi.spyOn(child, "kill");
  const groupKill = vi.spyOn(process, "kill");
  try {
    expect(await stopOwnedChild(child, 10, 10)).toBe(false);
    expect(kill).not.toHaveBeenCalled();
    expect(groupKill).not.toHaveBeenCalled();
  } finally {
    kill.mockRestore();
    groupKill.mockRestore();
  }
});

it.each(["EPERM", "EIO"])("fails closed on %s from a group observation", async (code) => {
  const child = spawnOwnedChild(
    process.execPath,
    ["-e", 'console.log("ready");setInterval(()=>{},1000)'],
    {
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  await new Promise<void>((resolve) => child.stdout!.once("data", () => resolve()));
  const original = process.kill.bind(process);
  const probe = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
    if (pid === -child.pid!)
      throw Object.assign(new Error("Synthetic observation error"), { code });
    return original(pid, signal);
  });
  try {
    expect(await stopOwnedChild(child, 20, 20)).toBe(false);
  } finally {
    probe.mockRestore();
    if (child.exitCode === null && child.signalCode === null)
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
    expect(await stopOwnedChild(child, 100, 1000)).toBe(true);
  }
});

it("does not succeed while the owned group is still reported present", async () => {
  const child = spawnOwnedChild(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
  await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  const original = process.kill.bind(process);
  const probe = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
    if (pid === -child.pid! && signal === 0) return true;
    return original(pid, signal);
  });
  try {
    expect(await stopOwnedChild(child, 20, 20)).toBe(false);
  } finally {
    probe.mockRestore();
    expect(await stopOwnedChild(child, 100, 1000)).toBe(true);
  }
});
