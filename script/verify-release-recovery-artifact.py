#!/usr/bin/env python3
"""Detached missing-input check only; no database or provider credentials inherited."""
import hashlib, json, os, pathlib, shutil, subprocess, tempfile
root = pathlib.Path(__file__).resolve().parent.parent
artifact = root / 'dist/operations/release-recovery.mjs'
node = shutil.which('node')
if not node: raise RuntimeError('Node required')
expected = {'status':'failed-or-uncertain','message':'Preserve the exact attempt and private evidence; no payload diagnostics emitted.'}
with tempfile.TemporaryDirectory(prefix='core-recovery-artifact-') as temp:
    directory = pathlib.Path(temp)
    shutil.copy2(artifact, directory / artifact.name)
    (directory/'node_modules').symlink_to(root/'node_modules', target_is_directory=True)
    (directory/'alias.mjs').symlink_to(artifact.name)
    for name,args in [(artifact.name,[]),('alias.mjs',[]),(artifact.name,['capture','--unknown','synthetic-private-marker']),(artifact.name,['retrieve'])]:
        run = subprocess.run([node,str(directory/name),*args],cwd=directory,env={'PATH':os.defpath},capture_output=True,text=True,timeout=15)
        if run.returncode != 1 or run.stderr or json.loads(run.stdout) != expected:
            raise RuntimeError('Detached input rejection failed; diagnostics withheld')
if directory.exists(): raise RuntimeError('Owned directory cleanup incomplete')
print(json.dumps({'passed':True,'artifactSha256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'checks':4,'temporaryDirectoryRemoved':True,'sourceTreeAvailable':False,'tsxRequired':False,'providerOrDatabaseAcceptance':False}))
