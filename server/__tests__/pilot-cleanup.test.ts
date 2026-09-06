import { expect, it } from "vitest";
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
