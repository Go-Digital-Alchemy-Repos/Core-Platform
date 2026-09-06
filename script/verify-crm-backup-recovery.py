#!/usr/bin/env python3
"""Synthetic CRM backup/restore rehearsal in one owned localhost-only PostgreSQL container."""
import argparse
import hashlib
import json
import os
import pathlib
import secrets
import signal
import subprocess
import tempfile
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main(output):
    name = 'core-crm-recovery-' + uuid.uuid4().hex[:12]
    report = {'status': 'failed', 'fixture': name}
    owned = False
    stage = 'local-docker-check'
    docker = ['docker']

    def run(args, env=None, timeout=60, check=True):
        result = subprocess.run(args, cwd=ROOT, env=env, text=True, capture_output=True, timeout=timeout)
        if check and result.returncode:
            raise RuntimeError('command-failed')
        return result

    try:
        context = os.environ.get('DOCKER_CONTEXT')
        endpoint = (os.environ.get('DOCKER_HOST') if not context else None) or run(['docker', 'context', 'inspect', *([context] if context else []), '--format', '{{.Endpoints.docker.Host}}']).stdout.strip()
        if not endpoint.startswith('unix://'):
            raise RuntimeError('local-unix-socket-required')
        docker = ['docker', '--host', endpoint]
        report['candidate'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
        report['sourceSha256'] = {path: hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in ['server/migrate.ts', 'server/services/system-backup.service.ts', 'server/storage/crm-custom-fields.storage.ts', 'server/services/form-effect-jobs.service.ts', 'script/fixtures/crm-backup-recovery.test.ts']}
        password = secrets.token_hex(24)
        stage = 'database-start'
        owned = True
        run(docker + ['run', '-d', '--name', name, '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=recovery', '-e', 'POSTGRES_PASSWORD='+password, '-e', 'POSTGRES_DB=core_crm_recovery', 'postgres:16-alpine'])
        port = run(docker + ['port', name, '5432']).stdout.strip().rsplit(':', 1)[1]
        deadline = time.monotonic()+30
        while run(docker + ['exec', name, 'pg_isready', '-U', 'recovery', '-d', 'core_crm_recovery'], check=False).returncode:
            if time.monotonic()>deadline:
                raise RuntimeError('database-timeout')
            time.sleep(.25)
        stage = 'crm-backup-restore-rehearsal'
        with tempfile.TemporaryDirectory(prefix=name) as directory:
            result_path = pathlib.Path(directory)/'result.json'
            environment = {key: os.environ[key] for key in ('PATH', 'HOME', 'TMPDIR') if key in os.environ}
            url = f'postgresql://recovery:{password}@127.0.0.1:{port}/core_crm_recovery'
            environment.update(NODE_ENV='test', TZ='UTC', CLIENT_STACK_ID='disposable-crm-recovery', DATABASE_URL=url, CRM_RECOVERY_DATABASE_URL=url, CRM_RECOVERY_RESULT=str(result_path), CRM_RECOVERY_STAGE=str(pathlib.Path(directory)/'stage.txt'), SESSION_SECRET='synthetic-crm-recovery-only', SYSTEM_BACKUPS_ENABLED='false')
            result = run(['node', 'node_modules/vitest/vitest.mjs', 'run', '--config', 'script/verify-crm-backup-recovery.config.ts'], env=environment, timeout=180, check=False)
            if result.returncode or not result_path.exists():
                # Only named assertion diagnostics, never raw query values or process logs.
                report['testFailed'] = True
                stage_file = pathlib.Path(directory)/'stage.txt'
                if stage_file.exists():
                    report['assertionStage'] = stage_file.read_text()[:100]
                raise RuntimeError('rehearsal-failed')
            report.update(json.loads(result_path.read_text()))
            report['status'] = 'passed'
    except Exception:
        report['failedStage'] = stage
        report['error'] = 'Synthetic rehearsal failed; raw child logs withheld.'
    finally:
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        if owned:
            try:
                run(docker + ['rm', '--force', '--volumes', name], check=False)
                inventory = run(docker + ['container', 'ls', '--all', '--format', '{{.Names}}'])
                report['fixtureRemoved'] = name not in inventory.stdout.splitlines()
            except Exception:
                report['fixtureRemoved'] = False
            if not report['fixtureRemoved']:
                report['status'] = 'failed'
        output.parent.mkdir(parents=True, exist_ok=True)
        with os.fdopen(os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600), 'w') as target:
            os.fchmod(target.fileno(), 0o600)
            json.dump(report, target, indent=2)
            target.write('\n')
        print(json.dumps(report, indent=2))
    return 0 if report['status'] == 'passed' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    def interrupted(_number, _frame):
        raise RuntimeError('interrupted')
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    raise SystemExit(main(args.output))
