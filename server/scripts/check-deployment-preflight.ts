import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { checkDeploymentPreflight, type DeploymentProfile } from "./deployment-preflight-checks";

// No dotenv, app boot, database client, network calls, or secret-bearing diagnostics.
async function main() {
  const args = process.argv.slice(2);
  if (
    args.length < 4 ||
    args.length > 6 ||
    args[0] !== "--config" ||
    args[2] !== "--profile" ||
    !["normal", "recovery"].includes(args[3]) ||
    args[1].length > 4096 ||
    !args[1] ||
    new Set(args.slice(4)).size !== args.slice(4).length ||
    args.slice(4).some((arg) => !["--runtime-env", "--new-client"].includes(arg))
  )
    throw new Error();
  const handle = await open(
    args[1],
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  let config: string;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 16384) throw new Error();
    const buffer = Buffer.alloc(16385);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > 16384) throw new Error();
    config = buffer.subarray(0, offset).toString("utf8");
  } finally {
    await handle.close();
  }
  const result = checkDeploymentPreflight(
    config,
    args[3] as DeploymentProfile,
    args.includes("--runtime-env") ? process.env : undefined,
    args.includes("--new-client"),
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.configurationAccepted) process.exitCode = 1;
}
main().catch(() => {
  process.stdout.write(
    '{"configurationAccepted":false,"errors":["preflight_input_unavailable"]}\n',
  );
  process.exitCode = 2;
});
