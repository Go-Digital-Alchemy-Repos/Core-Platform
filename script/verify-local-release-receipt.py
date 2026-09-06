#!/usr/bin/env python3
"""Offline V3 local release receipt consistency verifier. No publishing or credential handling."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess

VERSION = 3
CORE_GATES = frozenset({
    'locked-dependencies', 'types', 'lint', 'format', 'ordinary-tests',
    'deployment-config-source', 'deployment-config-compiled',
    'fresh-migrations-twice', 'historical-populated-upgrade',
    'backup-form-reservation-ny', 'backup-form-reservation-utc', 'atomic-settings',
    'build', 'bundle-budget', 'detached-upload-verifier', 'detached-upload-apply',
    'production-runtime', 'application-browser', 'better-farms-pilot',
})
CRM_GATES = frozenset({'crm-persistence', 'crm-mapping', 'crm-profile-migration',
                       'crm-populated-upgrade', 'crm-capture-restore'})
MIGRATION_GATES = {
    'migrations/0061_standalone_locations.sql': 'standalone-migration',
    'migrations/0063_atomic_ecommerce_fulfillment.sql': 'atomic-fulfillment',
}
DATABASE_FILE_GATES = {
    'server/storage/crm-follow-ups.database.test.ts': 'crm-follow-ups',
    'server/services/woocommerce-import-rollback.database.test.ts': 'woo-catalog-rollback',
    'server/services/woocommerce-import-merchant-race.database.test.ts': 'woo-catalog-rollback',
}
DB_GATES = frozenset(DATABASE_FILE_GATES.values()) | frozenset(MIGRATION_GATES.values()) | frozenset({'backup-form-reservation-ny', 'backup-form-reservation-utc',
                     'atomic-settings', 'crm-persistence', 'crm-mapping', 'crm-profile-migration'})
FIXTURE_GATES = DB_GATES | frozenset({'fresh-migrations-twice', 'historical-populated-upgrade',
    'production-runtime', 'application-browser', 'better-farms-pilot', 'crm-populated-upgrade', 'crm-capture-restore'})
PINNED_INPUTS = {
    'better-farms-pilot': {'siteCommit': '7fd1298beb373ee447aa97f578fb11e575faf8f0'},
    'historical-populated-upgrade': {'baselineCommit': 'a006f36a3c4f37566c71b278d561844b45fb3b81'},
    'crm-populated-upgrade': {'baselineCommit': 'a99bb7efeb4c007789c20da91ff0e2d395452836'},
}
DB_SUITES = {'server/services/system-backup.database.test.ts': {'sha256': '8db3db6ff8d6d1d5c25ab9a8b11734a7ed7d2e4d2bde73431605dfd345c6bb98',
                                                    'passed': 7,
                                                    'ordinarySkipped': 7,
                                                    'gates': ['backup-form-reservation-ny',
                                                              'backup-form-reservation-utc']},
 'server/storage/forms-effects.database.test.ts': {'sha256': 'aed1b51e5c70925a8a2535d622aa096b88486a217b79528168825e6d67435891',
                                                   'passed': 8,
                                                   'ordinarySkipped': 8,
                                                   'gates': ['backup-form-reservation-ny',
                                                             'backup-form-reservation-utc']},
 'server/storage/ecommerce-reservation-expiry.database.test.ts': {'sha256': 'a4d943626effc5d7bb96bb85a344a3a909bdeda2c016afa5d65e76dee87af4d6',
                                                                  'passed': 4,
                                                                  'ordinarySkipped': 4,
                                                                  'gates': ['backup-form-reservation-ny',
                                                                            'backup-form-reservation-utc']},
 'server/__tests__/settings-atomic.db.test.ts': {'sha256': 'ca33232b0c406f32d36dfb9ca16c9729e6ac89324d48a98e3c69f2c1fcfd7a3b',
                                                 'passed': 5,
                                                 'ordinarySkipped': 5,
                                                 'gates': ['atomic-settings']},
 'server/storage/crm-custom-fields.database.test.ts': {'sha256': 'e24549effb9a56bb1a5805bb60ad668c3ab3b0f55ddf736b1bea56fdb33b98bf',
                                                       'passed': 24,
                                                       'ordinarySkipped': 18,
                                                       'gates': ['crm-persistence']},
 'server/storage/crm-form-mapping.database.test.ts': {'sha256': 'f67438a9adced0ee8c6f85650f2072bc911c5b995f5bd6544f6ea583b4a04e47',
                                                      'passed': 11,
                                                      'ordinarySkipped': 11,
                                                      'gates': ['crm-mapping']},
 'server/migrate-crm-profile.database.test.ts': {'sha256': '71cd684638b33c9f307f879b83956be4e47117e20894ab9cdc3b6b4f44687060',
                                                 'passed': 4,
                                                 'ordinarySkipped': 4,
                                                 'gates': ['crm-profile-migration']},
 'server/migrate-standalone-locations.database.test.ts': {'sha256': '17d4af8d2a7ea398193cb1e5e7de68834cd91db6dcde8954fa16cae271e8fee2',
                                                          'passed': 1,
                                                          'ordinarySkipped': 1,
                                                          'gates': ['standalone-migration']},
 'server/storage/ecommerce-atomic-fulfillment.database.test.ts': {'sha256': 'c4dd1cf89fb2927f61f9be5830c1b5728d0ded15a371ed75895d1c19dd4fb5d5',
                                                                  'passed': 14,
                                                                  'ordinarySkipped': 14,
                                                                  'gates': ['atomic-fulfillment']},
 'server/storage/crm-follow-ups.database.test.ts': {'sha256': '176dca8e4caaa6761ac0621674860a6041b45e9039dc156476297534c2ab1068',
                                                    'passed': 7,
                                                    'ordinarySkipped': 7,
                                                    'gates': ['crm-follow-ups']},
 'server/services/woocommerce-import-rollback.database.test.ts': {'sha256': 'd134971f9fd49cbfd871522ede2574647c8c484ec50df79d4ad8e297a0c1c9bc',
                                                                  'passed': 4,
                                                                  'ordinarySkipped': 4,
                                                                  'gates': ['woo-catalog-rollback']},
 'server/services/woocommerce-import-merchant-race.database.test.ts': {'sha256': 'a2a5c76247fc09790a24b430c5d1fe1b6f0dfa1fccdff2e94ef8c5ba7e637dbb',
                                                                       'passed': 16,
                                                                       'ordinarySkipped': 16,
                                                                       'gates': ['woo-catalog-rollback']}}
RUNTIME_GATES = {
    "server/storage/crm-follow-ups.storage.ts": "crm-follow-ups",
    "server/services/crm-follow-ups.service.ts": "crm-follow-ups",
    "server/routes/admin/crm-follow-ups.routes.ts": "crm-follow-ups",
    "server/services/woocommerce-import-drizzle.repository.ts": "woo-catalog-rollback",
}

MAX_MANIFEST = 256 * 1024
MAX_FILE = 32 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024

class InvalidReceipt(ValueError):
    pass

def require(ok, code):
    if not ok:
        raise InvalidReceipt(code)

def keys(value, expected):
    require(type(value) is dict and set(value) == set(expected), 'invalid-fields')

def digest(value, size=64):
    require(type(value) is str and re.fullmatch('[0-9a-f]{'+str(size)+'}', value) is not None, 'invalid-digest')

def identifier(value):
    require(type(value) is str and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.@/-]{0,95}', value) is not None, 'invalid-identity')

def pairs(items):
    result = {}
    for key, value in items:
        require(key not in result, 'duplicate-json-key')
        result[key] = value
    return result

def reject_constant(_value):
    raise InvalidReceipt('invalid-json-number')

def read_bounded(root, relative, maximum):
    """Directory-relative O_NOFOLLOW opens prevent symlink traversal and leaf replacement races."""
    require(type(relative) is str and len(relative) <= 240 and re.fullmatch(r'[A-Za-z0-9_./-]+', relative) is not None, 'invalid-path')
    parts = relative.split('/')
    require(not PurePosixPath(relative).is_absolute() and all(p not in ('', '.', '..') for p in parts), 'invalid-path')
    flags = os.O_RDONLY | os.O_NOFOLLOW
    folder = os.open(root, flags | os.O_DIRECTORY)
    try:
        for part in parts[:-1]:
            child = os.open(part, flags | os.O_DIRECTORY, dir_fd=folder)
            os.close(folder)
            folder = child
        fd = os.open(parts[-1], flags | os.O_NONBLOCK, dir_fd=folder)
        try:
            before = os.fstat(fd)
            require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_size <= maximum, 'invalid-evidence-file')
            with os.fdopen(fd, 'rb', closefd=False) as handle:
                data = handle.read(maximum + 1)
            after = os.fstat(fd)
            require(len(data) <= maximum and (before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (after.st_size, after.st_mtime_ns, after.st_ctime_ns), 'evidence-changed-during-read')
            return data
        finally:
            os.close(fd)
    finally:
        os.close(folder)

def load_manifest(root, relative):
    try:
        return json.loads(read_bounded(root, relative, MAX_MANIFEST), object_pairs_hook=pairs, parse_constant=reject_constant)
    except (UnicodeError, json.JSONDecodeError, RecursionError):
        raise InvalidReceipt('invalid-json') from None

def git(checkout, *args):
    # Explicit executable/arguments only: receipt strings never become commands or Git options.
    env = {'PATH': os.defpath, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_OPTIONAL_LOCKS': '0'}
    result = subprocess.run(['git', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-C', str(checkout), *args], env=env, capture_output=True, timeout=15)
    require(result.returncode == 0, 'checkout-query-failed')
    return result.stdout.decode('utf8').strip()

def checkout_identity(checkout, expected):
    for value in expected.values():
        digest(value, 40)
    require(git(checkout, 'rev-parse', 'HEAD') == expected['candidate'], 'stale-head')
    require(git(checkout, 'rev-parse', 'HEAD^{tree}') == expected['tree'], 'wrong-tree')
    require(not git(checkout, 'status', '--porcelain=v1', '--untracked-files=all'), 'dirty-checkout')
    git(checkout, 'merge-base', '--is-ancestor', expected['base'], expected['candidate'])
    tracked = git(checkout, 'ls-tree', '-r', '--name-only', expected['candidate']).splitlines()
    policy = checkout_policy(tracked)
    required = required_gates(policy)
    required_suites = suite_inventory(required)
    require(set(required_suites) <= set(tracked), 'missing-required-suite-source')
    require((set(DB_SUITES) & set(tracked)) <= set(required_suites), 'uncovered-known-suite')
    for path, suite in required_suites.items():
        data = read_bounded(checkout, path, MAX_FILE)
        require(hashlib.sha256(data).hexdigest() == suite['sha256'], 'changed-suite-source')
    for path in tracked:
        if not re.search(r'\.(?:test|spec)\.[cm]?[jt]sx?$', path):
            continue
        # Conservative supported discovery, not a TypeScript parser. Known suite pins cover aliases.
        data = read_bounded(checkout, path, MAX_FILE).decode('utf8')
        suspicious = path.endswith(('.database.test.ts', '.db.test.ts')) or re.search(r'\b(?:describe|test|it)\s*\.\s*(?:skipIf|runIf|skip)\b', data)
        require(not suspicious or path in DB_SUITES, 'unknown-opt-in-suite')
    return policy

def checkout_policy(tracked):
    # Source presence creates obligations; receipt profile/gate declarations cannot remove them.
    tracked = frozenset(tracked)
    profile = 'crm' if {'shared/schema/crm-custom-fields.ts', 'migrations/0062_crm_custom_fields.sql'} & tracked else 'core'
    source_gates = frozenset(gate for path, gate in {**MIGRATION_GATES, **DATABASE_FILE_GATES, **RUNTIME_GATES}.items() if path in tracked)
    return (profile, source_gates)

def required_gates(policy):
    profile, source_gates = policy
    return CORE_GATES | (CRM_GATES if profile == 'crm' else frozenset()) | source_gates

def suite_inventory(gates):
    return {path: suite for path, suite in DB_SUITES.items() if set(suite['gates']) & set(gates)}

def gate_suites(name):
    return [{'path': path, 'sourceSha256': suite['sha256'], 'testsPassed': suite['passed'], 'testsSkipped': 0}
            for path, suite in sorted(suite_inventory({name}).items())]

def review_digest(manifest):
    body = {key: value for key, value in manifest.items() if key != 'review'}
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()).hexdigest()

def verify(manifest, root, expected, detected_policy):
    detected_profile, source_gates = detected_policy
    keys(manifest, {'version', 'profile', 'candidate', 'tree', 'base', 'operator', 'observations', 'gates', 'evidence', 'artifacts', 'review'})
    require(type(manifest['version']) is int and manifest['version'] == VERSION, 'unsupported-version')
    require(manifest['profile'] in ('core', 'crm') and manifest['profile'] == detected_profile, 'invalid-profile')
    for key in ('candidate', 'tree', 'base'):
        digest(manifest[key], 40)
        require(manifest[key] == expected[key], 'identity-mismatch')
    identifier(manifest['operator'])
    keys(manifest['observations'], {'cleanBefore', 'cleanAfter'})
    require(all(value is True for value in manifest['observations'].values()), 'dirty-observation')
    inventory = manifest['evidence']
    require(type(inventory) is list and 1 <= len(inventory) <= 128, 'invalid-inventory')
    hashes = {}; total = 0
    for entry in inventory:
        keys(entry, {'path', 'sha256', 'sanitized'})
        digest(entry['sha256'])
        require(entry['sanitized'] is True, 'unsanitized-evidence')
        require(type(entry['path']) is str and entry['path'] not in hashes, 'duplicate-evidence')
        data = read_bounded(root, entry['path'], MAX_FILE)
        total += len(data)
        require(total <= MAX_TOTAL, 'evidence-too-large')
        require(hashlib.sha256(data).hexdigest() == entry['sha256'], 'evidence-hash-mismatch')
        hashes[entry['path']] = entry['sha256']
    required = CORE_GATES | (CRM_GATES if detected_profile == 'crm' else frozenset()) | source_gates
    gates = manifest['gates']
    require(type(gates) is list and len(gates) == len(required), 'missing-or-extra-gates')
    seen = set(); referenced = set()
    for gate in gates:
        keys(gate, {'id', 'candidate', 'tree', 'base', 'status', 'exitCode', 'testsPassed', 'testsSkipped', 'optInGateExclusions', 'evidence', 'cleanup', 'inputs', 'testSuites'})
        name = gate['id']
        require(type(name) is str and name in required and name not in seen, 'duplicate-or-unknown-gate')
        seen.add(name)
        require(gate['inputs'] == PINNED_INPUTS.get(name, {}), 'invalid-pinned-input')
        require(all(gate[key] == expected[key] for key in ('candidate', 'tree', 'base')), 'gate-identity-mismatch')
        require(gate['status'] == 'passed' and type(gate['exitCode']) is int and gate['exitCode'] == 0, 'gate-not-passed')
        require(all(type(gate[key]) is int and 0 <= gate[key] <= 1000000 for key in ('testsPassed', 'testsSkipped')), 'invalid-test-count')
        expected_suites = gate_suites(name) if name in DB_GATES else []
        require(type(gate['testSuites']) is list, 'invalid-suite-coverage')
        for suite in gate['testSuites']:
            keys(suite, {'path', 'sourceSha256', 'testsPassed', 'testsSkipped'})
            require(type(suite['testsPassed']) is int and type(suite['testsSkipped']) is int, 'invalid-suite-count')
        require(gate['testSuites'] == expected_suites, 'invalid-suite-coverage')
        if expected_suites:
            require(gate['testsPassed'] == sum(suite['testsPassed'] for suite in expected_suites), 'suite-total-mismatch')
        exclusions = gate['optInGateExclusions']
        require(type(exclusions) is list and all(type(x) is str for x in exclusions), 'invalid-exclusions')
        if name == 'ordinary-tests':
            require(gate['testsSkipped'] == sum(suite['ordinarySkipped'] for suite in suite_inventory(required).values()), 'ordinary-skip-total-mismatch')
        if name == 'ordinary-tests' and gate['testsSkipped']:
            require(len(exclusions) == len(set(exclusions)) and set(exclusions) == DB_GATES & required, 'invalid-opt-in-exclusions')
        else:
            require(gate['testsSkipped'] == 0 and exclusions == [], 'skipped-tests')
        if name in DB_GATES or name in ('ordinary-tests', 'application-browser', 'better-farms-pilot'):
            require(gate['testsPassed'] > 0, 'no-tests-executed')
        refs = gate['evidence']
        require(type(refs) is list and 1 <= len(refs) <= 128 and all(type(x) is str and x in hashes for x in refs) and len(set(refs)) == len(refs), 'missing-gate-evidence')
        referenced.update(refs)
        cleanup = gate['cleanup']
        if name in FIXTURE_GATES:
            keys(cleanup, {'containersRemoved', 'volumesRemoved', 'processesStopped'})
            require(all(value is True for value in cleanup.values()), 'cleanup-unproven')
        else:
            require(cleanup is None, 'unexpected-cleanup')
    artifacts = manifest['artifacts']
    keys(artifacts, {'application', 'deploymentConfig', 'uploadVerifier', 'uploadApply'})
    require(all(type(value) is str and value in hashes for value in artifacts.values()), 'missing-artifact')
    require(len(set(artifacts.values())) == 4, 'artifacts-must-be-distinct')
    referenced.update(artifacts.values())
    require(referenced == set(hashes), 'unreferenced-evidence')
    review = manifest['review']
    keys(review, {'reviewer', 'accepted', 'candidate', 'tree', 'base', 'bundleSha256'})
    identifier(review['reviewer'])
    require(review['reviewer'] != manifest['operator'] and review['accepted'] is True, 'review-not-independent-or-accepted')
    require(all(review[key] == expected[key] for key in ('candidate', 'tree', 'base')), 'review-identity-mismatch')
    digest(review['bundleSha256'])
    require(review['bundleSha256'] == review_digest(manifest), 'review-bundle-mismatch')
    return {'version': VERSION, **expected, 'profile': detected_profile, 'migrationGatesRequired': sorted(source_gates & frozenset(MIGRATION_GATES.values())), 'databaseFileGatesRequired': sorted(source_gates & frozenset(DATABASE_FILE_GATES.values())), 'gatesVerified': len(seen), 'evidenceFilesVerified': len(hashes), 'structuralVerification': 'passed', 'attestationTruth': 'not-established', 'releaseApproved': False}

class SafeParser(argparse.ArgumentParser):
    def error(self, _message):
        self.exit(2, 'Invalid verifier arguments. Use --help for the contract.\n')

def main():
    parser = SafeParser(description=__doc__)
    parser.add_argument('--evidence-dir', required=True, type=Path)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--checkout', required=True, type=Path)
    for item in ('candidate', 'tree', 'base'):
        parser.add_argument('--expected-'+item, required=True)
    args = parser.parse_args()
    try:
        expected = {key: getattr(args, 'expected_'+key) for key in ('candidate', 'tree', 'base')}
        profile = checkout_identity(args.checkout, expected)
        result = verify(load_manifest(args.evidence_dir, args.manifest), args.evidence_dir, expected, profile)
        require(checkout_identity(args.checkout, expected) == profile, 'checkout-changed')
        print(json.dumps(result, sort_keys=True))
        return 0
    except (InvalidReceipt, OSError, subprocess.SubprocessError, UnicodeError, TypeError, KeyError, RecursionError) as error:
        # Never echo manifest fields, file contents, secrets, URLs or command output.
        print(json.dumps({'structuralVerification': 'failed', 'code': str(error) if isinstance(error, InvalidReceipt) else 'validation-error'}))
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
