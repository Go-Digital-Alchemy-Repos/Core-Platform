#!/usr/bin/env python3
"""Check the built apply command without source files, secrets, or provider access."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
artifact = root / "dist/operations/probe-upload-ledger.mjs"
node = shutil.which("node")
if not node:
    raise RuntimeError("Node runtime required")
expected = {
    "schemaVersion": 1,
    "mode": "audit-probe",
    "complete": False,
    "error": "Audit probe failed or was rejected; preserve the approved attempt locator. Audit records may exist; no media writes were requested.",
}
with tempfile.TemporaryDirectory(prefix="core-upload-probe-smoke-") as directory:
    isolated = Path(directory)
    shutil.copy2(artifact, isolated / artifact.name)
    (isolated / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)
    (isolated / "alias.mjs").symlink_to(artifact.name)
    for name, arguments in ((artifact.name, []), ("alias.mjs", []), (artifact.name, ["--unknown", "synthetic-secret-marker"])):
        result = subprocess.run(
            [node, str(isolated / name), *arguments], cwd=isolated,
            env={"PATH": os.defpath}, capture_output=True, text=True, timeout=15,
        )
        if result.returncode != 1 or result.stderr or json.loads(result.stdout) != expected:
            raise RuntimeError("Standalone command did not reject missing inputs safely")
print(json.dumps({
    "status": "passed", "artifactSha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
    "entrypointsChecked": 2, "argumentRejectionsChecked": 3, "sourceTreeAvailable": False, "tsxRequired": False,
    "verification": "missing-input rejection only; no database or provider acceptance",
}))
