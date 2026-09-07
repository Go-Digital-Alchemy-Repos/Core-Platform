import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
export type Docker = (...args: string[]) => string;
export type OwnedContainer = {
  containerId: string;
  containerName: string;
  anonymousVolumes: string[];
};
export function captureOwnedContainer(docker: Docker, name: string, id: string): OwnedContainer {
  if (!/^[0-9a-f]{64}$/.test(id)) throw new Error("Invalid owned container ID");
  const item = JSON.parse(docker("inspect", id))[0];
  if (
    item.Id !== id ||
    item.Name !== `/${name}` ||
    item.Config?.Labels?.["core.rehearsal.attempt"] !== name
  )
    throw new Error("Container ownership mismatch");
  if (item.HostConfig?.Binds?.length || item.HostConfig?.Mounts?.length)
    throw new Error("External mounts are not owned");
  const anonymousVolumes = (item.Mounts ?? [])
    .map((mount: { Type: string; Name: string }) => {
      if (mount.Type !== "volume" || !/^[0-9a-f]{64}$/.test(mount.Name))
        throw new Error("Non-anonymous volume is not owned");
      return mount.Name;
    })
    .sort();
  return { containerId: id, containerName: name, anonymousVolumes };
}
export function removeOwnedContainer(docker: Docker, owned: OwnedContainer) {
  const result = {
    owned,
    containersRemoved: false,
    volumesRemoved: false,
    remainingOwnedVolumes: [] as string[],
    passed: false,
  };
  try {
    const ids = () =>
      docker("container", "ls", "--all", "--no-trunc", "--format", "{{.ID}}").split("\n");
    if (ids().includes(owned.containerId)) {
      if (
        JSON.stringify(captureOwnedContainer(docker, owned.containerName, owned.containerId)) !==
        JSON.stringify(owned)
      )
        throw new Error("Owned mounts changed");
      docker("rm", "--force", "--volumes", owned.containerId);
    }
    result.containersRemoved = !ids().includes(owned.containerId);
    const volumes = docker("volume", "ls", "--format", "{{.Name}}").split("\n");
    result.remainingOwnedVolumes = owned.anonymousVolumes.filter((name) => volumes.includes(name));
    result.volumesRemoved = result.remainingOwnedVolumes.length === 0;
    result.passed = result.containersRemoved && result.volumesRemoved;
  } catch {
    /* Failure is recorded; no standalone volume deletion is permitted. */
  }
  return result;
}
// Only children spawned here may be signalled as process groups.
const ownedGroups = new WeakMap<ChildProcess, number>();
export function spawnOwnedChild(command: string, args: string[], options: SpawnOptions) {
  const child = spawn(command, args, { ...options, detached: true });
  if (child.pid) ownedGroups.set(child, child.pid);
  return child;
}
export async function stopOwnedChild(child: ChildProcess, graceMs = 15_000, killMs = 5_000) {
  const group = ownedGroups.get(child);
  if (!group) return false;
  const alive = () => {
    try {
      process.kill(-group, 0);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
      throw error;
    }
  };
  const signal = (value: NodeJS.Signals) => {
    try {
      process.kill(-group, value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  };
  const wait = async (milliseconds: number) => {
    const deadline = Date.now() + milliseconds;
    // OS group disappearance can precede Node publishing the leader's exit.
    // Keep yielding until both observations agree or this wait expires.
    const stopped = () => {
      try {
        return !alive() && (child.exitCode !== null || child.signalCode !== null);
      } catch {
        // An observation error is unknown, never evidence of absence. Keep the
        // bounded wait alive so a transient failure can be followed by a real
        // ESRCH observation; persistent failures still exhaust the deadline.
        return false;
      }
    };
    while (!stopped() && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 20));
    return stopped();
  };
  try {
    // Give the app leader its shutdown window before terminating its helpers.
    // An already-exited leader cannot perform that cleanup, so signal its group.
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    else signal("SIGTERM");
    if (await wait(graceMs)) return true;
    signal("SIGKILL");
    return await wait(killMs);
  } catch {
    return false;
  }
}
