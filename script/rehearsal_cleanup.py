"""Evidence for one freshly created, explicitly labelled disposable Docker container."""
import hashlib
import json
import os
import re
import signal
import subprocess
import time

LABEL = 'core.rehearsal.attempt'

def exclusive_report(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    return os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)

def persist(fd, value):
    data = (json.dumps(value, indent=2)+'\n').encode()
    view = memoryview(data)
    while view:
        written = os.write(fd, view)
        view = view[written:]
    os.fsync(fd)


def capture(run, docker, name, container_id):
    if not re.fullmatch('[0-9a-f]{64}', container_id):
        raise RuntimeError('invalid-owned-container-id')
    item = json.loads(run(docker+['inspect', container_id]).stdout)[0]
    if item['Id'] != container_id or item['Name'] != '/'+name or item.get('Config', {}).get('Labels', {}).get(LABEL) != name:
        raise RuntimeError('container-ownership-mismatch')
    if item.get('HostConfig', {}).get('Binds') or item.get('HostConfig', {}).get('Mounts'):
        raise RuntimeError('external-mount-not-owned')
    volumes = []
    for mount in item.get('Mounts', []):
        if mount.get('Type') != 'volume' or not re.fullmatch('[0-9a-f]{64}', mount.get('Name', '')):
            raise RuntimeError('non-anonymous-volume-not-owned')
        volumes.append(mount['Name'])
    return {'containerId': container_id, 'containerName': name, 'anonymousVolumes': sorted(volumes)}


def cleanup(run, docker, owned):
    result = {'owned': owned, 'containersRemoved': False, 'volumesRemoved': False, 'removeExitCode': None}
    try:
        ids = run(docker+['container', 'ls', '--all', '--no-trunc', '--format', '{{.ID}}']).stdout.splitlines()
        if owned['containerId'] in ids:
            current = capture(run, docker, owned['containerName'], owned['containerId'])
            if current != owned:
                raise RuntimeError('owned-mounts-changed')
            removed = run(docker+['rm', '--force', '--volumes', owned['containerId']], check=False)
            result['removeExitCode'] = removed.returncode
        remaining = run(docker+['container', 'ls', '--all', '--no-trunc', '--format', '{{.ID}}']).stdout.splitlines()
        volumes = run(docker+['volume', 'ls', '--format', '{{.Name}}']).stdout.splitlines()
        result['containersRemoved'] = owned['containerId'] not in remaining
        result['remainingOwnedVolumes'] = sorted(set(owned['anonymousVolumes']) & set(volumes))
        result['volumesRemoved'] = not result['remainingOwnedVolumes']
        result['passed'] = result['containersRemoved'] and result['volumesRemoved'] and result['removeExitCode'] in (None, 0)
    except Exception:
        result['passed'] = False
        result['error'] = 'Owned cleanup could not be verified; no standalone volumes deleted.'
    return result


class ChildRuns:
    def __init__(self):
        self.groups = []
        self.active = set()

    def run(self, args, **kwargs):
        timeout = kwargs.pop('timeout', 60)
        data = kwargs.pop('input', None)
        if data is not None:
            kwargs['stdin'] = subprocess.PIPE
        child = subprocess.Popen(args, start_new_session=True, **kwargs)
        self.groups.append(child.pid)
        self.active.add(child.pid)
        try:
            stdout, stderr = child.communicate(data, timeout=timeout)
            return subprocess.CompletedProcess(args, child.returncode, stdout, stderr)
        finally:
            # Also reap a timed-out/interrupted child before fixture teardown.
            if child.poll() is None:
                self.stop_group(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self.stop_group(child.pid, signal.SIGKILL)
                    child.wait(timeout=3)
            for stream in (child.stdout, child.stderr, child.stdin):
                if stream is not None: stream.close()
            try:
                os.killpg(child.pid, 0)
            except ProcessLookupError:
                self.active.discard(child.pid)

    @staticmethod
    def stop_group(pid, signum):
        try:
            os.killpg(pid, signum)
        except ProcessLookupError:
            pass

    def finish(self):
        for pid in self.active.copy():
            self.stop_group(pid, signal.SIGTERM)
        deadline = time.monotonic()+3
        while time.monotonic()<deadline and self.remaining():
            time.sleep(.05)
        for pid in self.remaining():
            self.stop_group(pid, signal.SIGKILL)
        deadline = time.monotonic()+3
        while time.monotonic()<deadline and self.remaining():
            time.sleep(.05)
        return {'processesStopped': not self.remaining(), 'ownedProcessGroupIds': list(self.groups)}

    def remaining(self):
        alive=[]
        for pid in self.active.copy():
            try:
                os.killpg(pid,0)
                alive.append(pid)
            except ProcessLookupError:
                self.active.discard(pid)
        return alive
