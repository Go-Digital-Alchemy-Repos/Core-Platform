#!/usr/bin/env python3
"""Rehearse exact live-main to CRM candidate upgrade using synthetic local PostgreSQL."""
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
from rehearsal_cleanup import ChildRuns, capture, cleanup, exclusive_report, persist, LABEL

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASELINE = 'a99bb7efeb4c007789c20da91ff0e2d395452836'
TABLES = ['system_settings', 'cms_forms', 'cms_form_submissions', 'cms_form_effect_jobs', 'crm_leads', 'crm_lead_notes', 'crm_clients', 'crm_client_notes', 'ecommerce_products', 'ecommerce_product_variants', 'ecommerce_customers', 'ecommerce_orders', 'ecommerce_inventory_adjustments', 'ecommerce_notification_jobs']


def main(output):
    name = 'core-crm-upgrade-' + uuid.uuid4().hex[:12]
    report = {'status': 'failed', 'baseline': BASELINE, 'fixture': name}
    report_fd = exclusive_report(output)
    children = ChildRuns()
    owned_identity = None
    owned = False
    stage = 'local-docker-check'
    docker = ['docker']

    def run(args, cwd=ROOT, env=None, data=None, timeout=60, check=True):
        result = children.run(args, cwd=cwd, env=env, input=data, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
        if check and result.returncode:
            raise RuntimeError('command-failed')
        return result

    def sql(query):
        return run(docker + ['exec', '-i', name, 'psql', '-U', 'upgrade', '-d', 'core_crm_upgrade', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], data=query).stdout.strip()

    def require(ok):
        if not ok:
            raise RuntimeError('assertion-failed')

    try:
        context = os.environ.get('DOCKER_CONTEXT')
        endpoint = (os.environ.get('DOCKER_HOST') if not context else None) or run(['docker', 'context', 'inspect', *([context] if context else []), '--format', '{{.Endpoints.docker.Host}}']).stdout.strip()
        require(endpoint.startswith('unix://'))
        docker = ['docker', '--host', endpoint]
        require(run(['git', 'rev-parse', BASELINE+'^{commit}']).stdout.strip() == BASELINE)
        report['candidate'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
        report['workingTreeClean'] = not run(['git', 'status', '--porcelain']).stdout.strip()
        report['producerSha256'] = {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['script/verify-crm-populated-upgrade.py', 'script/rehearsal_cleanup.py']}
        paths = ['server/migrate.ts', 'package-lock.json', 'script/verify-crm-populated-upgrade.py', 'script/fixtures/crm-upgrade-legacy.sql', 'script/fixtures/crm-populated-upgrade.ts']
        report['sourceSha256'] = {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
        report['migrationSqlSha256'] = hashlib.sha256(b''.join(p.name.encode()+b'\0'+p.read_bytes() for p in sorted((ROOT/'migrations').glob('*.sql')))).hexdigest()
        environment = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
        with tempfile.TemporaryDirectory(prefix=name) as directory:
            directory = pathlib.Path(directory)
            base = directory/'baseline'
            base.mkdir()
            stage = 'baseline-archive-install'
            archive = directory/'baseline.tar'
            run(['git', 'archive', '--format=tar', '--output', str(archive), BASELINE])
            run(['tar', '-xf', str(archive), '-C', str(base)])
            run(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=base, env=environment, timeout=240)
            report['baselineDependencyInstall'] = 'npm ci from exact baseline package-lock; lifecycle scripts disabled'
            report['baselineMigrationRunnerSha256'] = hashlib.sha256((base/'server/migrate.ts').read_bytes()).hexdigest()
            stage = 'fixture-start'
            password = secrets.token_hex(24)
            owned = True
            created = run(docker + ['run', '-d', '--label', LABEL+'='+name, '--name', name, '-p', '127.0.0.1::5432', '-e', 'POSTGRES_USER=upgrade', '-e', 'POSTGRES_PASSWORD='+password, '-e', 'POSTGRES_DB=core_crm_upgrade', 'postgres:16-alpine'])
            owned_identity = capture(run, docker, name, created.stdout.strip())
            identity_fd = exclusive_report(output.with_name(output.name+'.ownership.json'))
            try: persist(identity_fd, owned_identity)
            finally: os.close(identity_fd)
            port = run(docker + ['port', name, '5432']).stdout.strip().rsplit(':', 1)[1]
            deadline = time.monotonic()+30
            while run(docker + ['exec', name, 'pg_isready', '-U', 'upgrade', '-d', 'core_crm_upgrade'], check=False, timeout=5).returncode:
                require(time.monotonic() < deadline)
                time.sleep(.25)
            environment.update(NODE_ENV='test', TZ='UTC', DATABASE_URL=f'postgresql://upgrade:{password}@127.0.0.1:{port}/core_crm_upgrade', SESSION_SECRET='synthetic-upgrade-only', PGOPTIONS='-c statement_timeout=15000 -c lock_timeout=10000', CRM_UPGRADE_RESULT=str(directory/'result.json'))

            def migrate(root):
                code = "const {runMigrations}=await import('./server/migrate.ts'); const {pool}=await import('./server/db.ts'); try {await runMigrations();} finally {await pool.end();}"
                run(['node', '--import', 'tsx', '--input-type=module', '-e', code], cwd=root, env=environment, timeout=90)

            def snapshot(columns=None, baseline_rows=None):
                columns = columns or {}
                result = {}
                for table in TABLES:
                    if table not in columns:
                        columns[table] = json.loads(sql(f"SELECT json_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='{table}';"))
                    projection = ','.join('"'+c+'"' for c in columns[table])
                    where = (" WHERE id IN (" + ",".join("'"+str(row["id"]).replace("'", "''")+"'" for row in baseline_rows[table]) + ")") if baseline_rows and baseline_rows[table] else (" WHERE false" if baseline_rows else "")
                    result[table] = json.loads(sql(f"SELECT coalesce(json_agg(t ORDER BY id),'[]'::json) FROM (SELECT {projection} FROM {table}{where}) t;"))
                return result, columns

            stage = 'baseline-migrate-seed'
            migrate(base)
            require(sql("SELECT to_regclass('crm_custom_field_definitions') IS NULL;") == 't')
            sql((ROOT/'script/fixtures/crm-upgrade-legacy.sql').read_text())
            before, columns = snapshot()
            report['baselineRows'] = {table: len(rows) for table, rows in before.items()}
            for attempt in range(2):
                stage = f'candidate-migration-{attempt+1}'
                migrate(ROOT)
                require(snapshot(columns)[0] == before)
            report['baselineColumnsPreservedAcrossTwoStarts'] = True
            stage = 'candidate-custom-fields-mapping'
            result = run(['node', '--import', 'tsx', 'script/fixtures/crm-populated-upgrade.ts'], env=environment, timeout=120, check=False)
            if result.returncode:
                if (directory/'result.json').exists():
                    report.update(json.loads((directory/'result.json').read_text()))
                raise RuntimeError('candidate-fixture-failed')
            report.update(json.loads((directory/'result.json').read_text()))
            stage = 'final-legacy-preservation'
            require(snapshot(columns, baseline_rows=before)[0] == before)
            require(sql("SELECT status FROM cms_form_effect_jobs WHERE id='upgrade-pending';") == 'queued')
            report['legacyPendingJobUnchanged'] = True
            report['historicalEcommerceUnchanged'] = True
            report['explicitClientPreferenceAndNullsPreserved'] = True
            report['status'] = 'passed'
    except Exception:
        report['failedStage'] = stage
        report['error'] = 'Synthetic upgrade rehearsal failed; raw child logs withheld.'
    finally:
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        before_cleanup = children.finish()
        report['cleanup'] = cleanup(run, docker, owned_identity) if owned_identity else {'passed': not owned, 'containersRemoved': not owned, 'volumesRemoved': not owned, 'error': 'No verified ownership inventory; no container removed.'}
        after_cleanup = children.finish()
        report['cleanup']['processesStopped'] = before_cleanup['processesStopped'] and after_cleanup['processesStopped']
        report['cleanup']['processChecks'] = {'beforeCleanup': before_cleanup, 'afterCleanup': after_cleanup}
        report['fixtureRemoved'] = report['cleanup']['containersRemoved']
        if not report['cleanup']['passed'] or not report['cleanup']['processesStopped']:
            report['status'] = 'failed'
        try: persist(report_fd, report)
        finally: os.close(report_fd)
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
