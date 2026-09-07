import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('verify-local-release-receipt.py')
spec = importlib.util.spec_from_file_location('receipt_verifier', SCRIPT)
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.evidence = self.root/'evidence'; self.evidence.mkdir()
        self.checkout = self.root/'checkout'; self.checkout.mkdir()
        self.git('init', '-q')
        original_suites = copy.deepcopy(v.DB_SUITES)
        self.addCleanup(lambda: (v.DB_SUITES.clear(), v.DB_SUITES.update(original_suites)))
        synthetic = b'describe.skipIf(!fixture)("synthetic", () => {});\n'
        self.synthetic_source = synthetic
        fixture_script = SCRIPT.read_text()
        for suite in v.DB_SUITES.values():
            fixture_script = fixture_script.replace(suite['sha256'], hashlib.sha256(synthetic).hexdigest())
            suite['sha256'] = hashlib.sha256(synthetic).hexdigest()
        self.script = self.root/'synthetic-verifier.py'
        self.script.write_text(fixture_script)
        for path in v.suite_inventory(v.CORE_GATES):
            file=self.checkout/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(synthetic)
        (self.checkout/'tracked.txt').write_text('synthetic\n')
        self.git('add', '.'); self.git('commit', '-qm', 'fixture')
        self.expected = {'candidate': self.git('rev-parse', 'HEAD'), 'tree': self.git('rev-parse', 'HEAD^{tree}'), 'base': self.git('rev-parse', 'HEAD')}
        self.manifest = self.make_manifest('core')

    def git(self, *args):
        return subprocess.check_output(['git', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgSign=false', '-C', str(self.checkout), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def make_manifest(self, profile):
        (self.evidence/'evidence.json').write_text('{"synthetic":true}\n')
        gates = v.CORE_GATES | (v.CRM_GATES if profile == 'crm' else frozenset())
        m = {'version': v.VERSION, 'profile': profile, **self.expected, 'operator': 'operator', 'observations': {'cleanBefore': True, 'cleanAfter': True}, 'evidence': [{'path': 'evidence.json', 'sha256': hashlib.sha256((self.evidence/'evidence.json').read_bytes()).hexdigest(), 'sanitized': True}], 'gates': [], 'artifacts': {name:name+'.bin' for name in ('application','deploymentConfig','uploadVerifier','uploadApply')}}
        for path in m['artifacts'].values():
            (self.evidence/path).write_text(path)
            m['evidence'].append({'path':path,'sha256':hashlib.sha256(path.encode()).hexdigest(),'sanitized':True})
        for name in sorted(gates):
            m['gates'].append({'id': name, 'inputs':v.PINNED_INPUTS.get(name, {}), **self.expected, 'status': 'passed', 'exitCode': 0, 'testsPassed': sum(x['testsPassed'] for x in v.gate_suites(name)) if name in v.DB_GATES else 1, 'testsSkipped': sum(x['ordinarySkipped'] for x in v.suite_inventory(gates).values()) if name == 'ordinary-tests' else 0, 'optInGateExclusions': sorted(v.DB_GATES & gates) if name == 'ordinary-tests' else [], 'testSuites': v.gate_suites(name) if name in v.DB_GATES else [], 'evidence': ['evidence.json'], 'cleanup': {'containersRemoved': True, 'volumesRemoved': True, 'processesStopped': True} if name in v.FIXTURE_GATES else None})
        self.sign(m)
        return m

    def sign(self, m):
        m['review'] = {'reviewer': 'independent-reviewer', 'accepted': True, **self.expected, 'bundleSha256': v.review_digest(m)}

    def check(self, m=None, profile='core'):
        return v.verify(m or self.manifest, self.evidence, self.expected, (profile, frozenset()))

    def test_valid_core_and_crm(self):
        self.assertEqual(self.check()['gatesVerified'], len(v.CORE_GATES))
        self.assertEqual(self.check(self.make_manifest('crm'), 'crm')['gatesVerified'], len(v.CORE_GATES|v.CRM_GATES))

    def test_required_gates_and_duplicates(self):
        for change in ('missing','duplicate','unknown'):
            m=copy.deepcopy(self.manifest)
            if change=='missing':m['gates'].pop()
            elif change=='duplicate':m['gates'][-1]=m['gates'][0]
            else:m['gates'][0]['id']='invented'
            with self.subTest(change=change), self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_versions_profiles_unknown_fields_and_truthy_values(self):
        for key,value in [('version',1),('version',6),('version',True),('profile','unknown'),('profile','crm'),('secret','not-accepted')]:
            m=copy.deepcopy(self.manifest);m[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(v.InvalidReceipt):self.check(m)
        m=copy.deepcopy(self.manifest);m['observations']['cleanBefore']='true'
        with self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_stale_identity_and_review(self):
        cases=[]
        for key in ('candidate','tree','base'):
            m=copy.deepcopy(self.manifest);m[key]='0'*40;cases.append(m)
            m=copy.deepcopy(self.manifest);m['review'][key]='0'*40;cases.append(m)
            m=copy.deepcopy(self.manifest);m['gates'][0][key]='0'*40;cases.append(m)
        for change in ('missing','unaccepted','same-operator','wrong-bundle'):
            m=copy.deepcopy(self.manifest)
            if change=='missing':del m['review']
            elif change=='unaccepted':m['review']['accepted']=False
            elif change=='same-operator':m['review']['reviewer']='operator'
            else:m['review']['bundleSha256']='0'*64
            cases.append(m)
        for m in cases:
            with self.subTest(m=m),self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_failures_skips_cleanup_and_empty_test_suites(self):
        for field,value in [('exitCode',1),('exitCode',False),('status','skipped'),('testsSkipped',1),('testsPassed',0)]:
            m=copy.deepcopy(self.manifest);g=next(x for x in m['gates'] if x['id']=='atomic-settings');g[field]=value
            with self.subTest(field=field),self.assertRaises(v.InvalidReceipt):self.check(m)
        m=copy.deepcopy(self.manifest);next(x for x in m['gates'] if x['id']=='atomic-settings')['cleanup']['volumesRemoved']=False
        with self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_unit_opt_in_skips_have_fixed_exclusions_and_real_gates(self):
        m=copy.deepcopy(self.manifest);g=next(x for x in m['gates'] if x['id']=='ordinary-tests');g['testsSkipped']=sum(x['ordinarySkipped'] for x in v.suite_inventory(v.CORE_GATES).values());g['optInGateExclusions']=sorted(v.DB_GATES & v.CORE_GATES);self.sign(m)
        self.assertEqual(self.check(m)['structuralVerification'],'passed')
        g['optInGateExclusions'].append('invented-reason')
        with self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_wrong_pilot_pin_and_aliased_artifacts(self):
        m=copy.deepcopy(self.manifest);next(x for x in m['gates'] if x['id']=='better-farms-pilot')['inputs']={'siteCommit':'0'*40}
        with self.assertRaises(v.InvalidReceipt):self.check(m)
        m=copy.deepcopy(self.manifest);m['artifacts']['uploadApply']=m['artifacts']['application']
        with self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_changed_artifact_and_unreviewed_updated_hash(self):
        (self.evidence/'evidence.json').write_text('changed')
        with self.assertRaises(v.InvalidReceipt):self.check()
        self.manifest['evidence'][0]['sha256']=hashlib.sha256(b'changed').hexdigest()
        with self.assertRaisesRegex(v.InvalidReceipt,'review-bundle-mismatch'):self.check()

    def test_missing_evidence_and_artifacts(self):
        m=copy.deepcopy(self.manifest);m['artifacts']['application']='missing.bin'
        with self.assertRaises(v.InvalidReceipt):self.check(m)
        m=copy.deepcopy(self.manifest);m['gates'][0]['evidence']=[]
        with self.assertRaises(v.InvalidReceipt):self.check(m)

    def test_traversal_symlinks_directories_hardlinks_and_fifo(self):
        outside=self.root/'outside';outside.write_text('outside')
        (self.evidence/'link').symlink_to(outside)
        (self.evidence/'dirlink').symlink_to(self.root,target_is_directory=True)
        (self.evidence/'directory').mkdir()
        os.link(outside,self.evidence/'hardlink')
        os.mkfifo(self.evidence/'pipe')
        for name in ('../outside','/outside','a/../outside','link','dirlink/outside','directory','hardlink','pipe'):
            with self.subTest(name=name),self.assertRaises((v.InvalidReceipt,OSError)):
                v.read_bounded(self.evidence,name,100)

    def test_size_bounds_and_duplicate_json(self):
        with self.assertRaises(v.InvalidReceipt):v.read_bounded(self.evidence,'evidence.json',2)
        for raw in ('{"version":1,"version":1}', '{"nested":{"x":1,"x":2}}', '{"x":NaN}', '{"x":Infinity}'):
            (self.evidence/'manifest.json').write_text(raw)
            with self.subTest(raw=raw),self.assertRaises(v.InvalidReceipt):v.load_manifest(self.evidence,'manifest.json')

    def test_real_checkout_identity_dirty_stale_and_detected_crm(self):
        self.assertEqual(v.checkout_identity(self.checkout,self.expected),('core',frozenset()))
        (self.checkout/'untracked').write_text('dirty')
        with self.assertRaisesRegex(v.InvalidReceipt,'dirty-checkout'):v.checkout_identity(self.checkout,self.expected)
        (self.checkout/'untracked').unlink()
        wrong={**self.expected,'candidate':'0'*40}
        with self.assertRaisesRegex(v.InvalidReceipt,'stale-head'):v.checkout_identity(self.checkout,wrong)
        marker=self.checkout/'shared/schema/crm-custom-fields.ts';marker.parent.mkdir(parents=True);marker.write_text('// synthetic')
        for path in v.suite_inventory(v.CRM_GATES):
            file=self.checkout/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(self.synthetic_source)
        self.git('add','.');self.git('commit','-qm','crm');expected={**self.expected,'candidate':self.git('rev-parse','HEAD'),'tree':self.git('rev-parse','HEAD^{tree}')}
        self.assertEqual(v.checkout_identity(self.checkout,expected),('crm',frozenset()))

    def feature_candidate(self, paths):
        for path in paths:
            file=self.checkout/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(self.synthetic_source) if path in v.DB_SUITES else file.write_text('-- synthetic migration\n')
        for path in v.suite_inventory(v.required_gates(v.checkout_policy(paths))):
            file=self.checkout/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(self.synthetic_source)
        self.git('add','.');self.git('commit','-qm','migration features')
        self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
        return v.checkout_identity(self.checkout,self.expected)

    def add_gate(self, manifest, name):
        gate=copy.deepcopy(next(g for g in manifest['gates'] if g['id']=='atomic-settings'))
        gate['id']=name;gate['testSuites']=v.gate_suites(name);gate['testsPassed']=sum(x['testsPassed'] for x in gate['testSuites']);manifest['gates'].append(gate)
        required={g['id'] for g in manifest['gates']}
        ordinary=next(g for g in manifest['gates'] if g['id']=='ordinary-tests')
        ordinary.update(testsSkipped=sum(x['ordinarySkipped'] for x in v.suite_inventory(required).values()),optInGateExclusions=sorted(v.DB_GATES & required))
        self.sign(manifest)

    def test_features_required_independently_of_core_or_crm_profile(self):
        for profile in ('core','crm'):
            with self.subTest(profile=profile):
                tracked=list(v.MIGRATION_GATES)
                if profile=='crm':tracked.append('migrations/0062_crm_custom_fields.sql')
                policy=v.checkout_policy(tracked)
                self.assertEqual(policy[0],profile)
                m=self.make_manifest(profile)
                with self.assertRaisesRegex(v.InvalidReceipt,'missing-or-extra-gates'):
                    v.verify(m,self.evidence,self.expected,policy)
                self.add_gate(m,'standalone-migration')
                with self.assertRaisesRegex(v.InvalidReceipt,'missing-or-extra-gates'):
                    v.verify(m,self.evidence,self.expected,policy)
                self.add_gate(m,'atomic-fulfillment')
                result=v.verify(m,self.evidence,self.expected,policy)
                self.assertEqual(result['migrationGatesRequired'],['atomic-fulfillment','standalone-migration'])

    def test_new_gates_require_positive_counts_zero_skips_and_cleanup(self):
        policy=v.checkout_policy(list(v.MIGRATION_GATES))
        m=self.make_manifest('core')
        for name in v.MIGRATION_GATES.values():self.add_gate(m,name)
        for name in v.MIGRATION_GATES.values():
            for field,value in [('testsPassed',0),('testsSkipped',1),('cleanup',None),('exitCode',1)]:
                broken=copy.deepcopy(m);next(g for g in broken['gates'] if g['id']==name)[field]=value
                self.sign(broken)
                with self.subTest(name=name,field=field),self.assertRaises(v.InvalidReceipt):v.verify(broken,self.evidence,self.expected,policy)
        ordinary=next(g for g in m['gates'] if g['id']=='ordinary-tests')
        ordinary.update(testsSkipped=sum(x['ordinarySkipped'] for x in v.suite_inventory(v.CORE_GATES|policy[1]).values()),optInGateExclusions=sorted(v.DB_GATES & (v.CORE_GATES|policy[1])))
        self.sign(m)
        self.assertEqual(v.verify(m,self.evidence,self.expected,policy)['structuralVerification'],'passed')
        ordinary['optInGateExclusions'].remove('atomic-fulfillment');self.sign(m)
        with self.assertRaisesRegex(v.InvalidReceipt,'invalid-opt-in-exclusions'):v.verify(m,self.evidence,self.expected,policy)

    def test_tracked_migrations_force_cli_gates_not_test_filenames(self):
        policy=self.feature_candidate(list(v.MIGRATION_GATES))
        self.assertEqual(policy,('core',frozenset(v.MIGRATION_GATES.values())))
        self.manifest=self.make_manifest('core')
        (self.evidence/'manifest.json').write_text(json.dumps(self.manifest))
        command=['python3',str(self.script),'--evidence-dir',str(self.evidence),'--manifest','manifest.json','--checkout',str(self.checkout)]
        for key,value in self.expected.items():command.extend(['--expected-'+key,value])
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,1)
        self.assertIn('missing-or-extra-gates',result.stdout)
        for name in v.MIGRATION_GATES.values():self.add_gate(self.manifest,name)
        (self.evidence/'manifest.json').write_text(json.dumps(self.manifest))
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(v.checkout_policy(['server/migrate-standalone-locations.database.test.ts','server/storage/ecommerce-atomic-fulfillment.database.test.ts']),('core',frozenset()))

    def test_v3_new_database_source_obligations_cannot_be_suppressed(self):
        for path, gate in v.DATABASE_FILE_GATES.items():
            policy = v.checkout_policy([path])
            self.assertEqual(policy, ('core', frozenset({gate})))
            manifest = self.make_manifest('core')
            with self.subTest(path=path), self.assertRaisesRegex(v.InvalidReceipt, 'missing-or-extra-gates'):
                v.verify(manifest, self.evidence, self.expected, policy)
            self.add_gate(manifest, gate)
            self.assertEqual(v.verify(manifest, self.evidence, self.expected, policy)['databaseFileGatesRequired'], [gate])

    def test_v4_valid_30_gate_cli_bundle_and_exact_optin_exclusions(self):
        policy = self.feature_candidate(['migrations/0062_crm_custom_fields.sql', *v.MIGRATION_GATES, *v.DATABASE_FILE_GATES])
        manifest = self.make_manifest('crm')
        for name in sorted(policy[1]): self.add_gate(manifest, name)
        ordinary = next(g for g in manifest['gates'] if g['id'] == 'ordinary-tests')
        ordinary.update(testsSkipped=118, optInGateExclusions=sorted(v.DB_GATES & v.required_gates(policy)))
        self.sign(manifest)
        self.assertEqual(v.verify(manifest, self.evidence, self.expected, policy)['gatesVerified'], 30)
        (self.evidence/'manifest.json').write_text(json.dumps(manifest))
        command = ['python3', str(self.script), '--evidence-dir', str(self.evidence), '--manifest', 'manifest.json', '--checkout', str(self.checkout)]
        for key, value in self.expected.items(): command.extend(['--expected-'+key,value])
        result = subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        for name in set(v.DATABASE_FILE_GATES.values()):
            for change in ('missing','old-label','zero','skip','cleanup','exclusion'):
                bad = copy.deepcopy(manifest)
                gate = next(g for g in bad['gates'] if g['id'] == name)
                if change == 'missing': bad['gates'].remove(gate)
                elif change == 'old-label': gate['id'] = 'atomic-settings'
                elif change == 'zero': gate['testsPassed'] = 0
                elif change == 'skip': gate['testsSkipped'] = 1
                elif change == 'cleanup': gate['cleanup']['volumesRemoved'] = False
                elif change == 'exclusion': next(g for g in bad['gates'] if g['id'] == 'ordinary-tests')['optInGateExclusions'].remove(name)
                self.sign(bad)
                with self.subTest(gate=name,change=change),self.assertRaises(v.InvalidReceipt):
                    v.verify(bad,self.evidence,self.expected,policy)
        manifest['version'] = 2
        self.sign(manifest)
        with self.assertRaisesRegex(v.InvalidReceipt,'unsupported-version'):
            v.verify(manifest,self.evidence,self.expected,policy)

    def test_v3_source_hash_missing_runtime_required_and_unknown_suites(self):
        policy = self.feature_candidate(list(v.RUNTIME_GATES))
        self.assertEqual(policy[1], frozenset(v.DATABASE_FILE_GATES.values()))
        path = self.checkout/'server/services/woocommerce-import-merchant-race.database.test.ts'
        path.write_text('changed suite')
        self.git('add','.');self.git('commit','-qm','changed')
        self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
        with self.assertRaisesRegex(v.InvalidReceipt,'changed-suite-source'):
            v.checkout_identity(self.checkout,self.expected)
        path.unlink()
        self.git('add','.');self.git('commit','-qm','removed')
        self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
        with self.assertRaisesRegex(v.InvalidReceipt,'missing-required-suite-source'):
            v.checkout_identity(self.checkout,self.expected)
        path.write_bytes(self.synthetic_source)
        for name,content in [('unknown.database.test.ts','fixture'),('other.test.ts','test.runIf(enabled)("case", () => {});')]:
            unknown=self.checkout/name;unknown.write_text(content)
            self.git('add','.');self.git('commit','-qm','unknown')
            self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
            with self.assertRaisesRegex(v.InvalidReceipt,'unknown-opt-in-suite'):
                v.checkout_identity(self.checkout,self.expected)
            unknown.unlink()

    def test_v4_runtime_triggers_require_new_suites_without_profile_override(self):
        pairs = [('server/services/ecommerce-category-graph.ts', 'category-parent-integrity', 'server/storage/ecommerce-category-parent.database.test.ts'),
                 ('migrations/0064_woo_import_execution_version.sql', 'category-parent-integrity', 'server/storage/ecommerce-category-parent.database.test.ts'),
                 ('server/storage/crm.storage.ts', 'crm-note-attribution', 'server/storage/crm-note-attribution.database.test.ts'),
                 ('shared/crm-note-presentation.ts', 'crm-note-attribution', 'server/storage/crm-note-attribution.database.test.ts'),
                 ('client/src/features/admin/crm-note-list.tsx', 'crm-note-attribution', 'server/storage/crm-note-attribution.database.test.ts')]
        for runtime, gate, suite in pairs:
            self.assertIn(gate,v.checkout_policy([runtime])[1])
        policy=self.feature_candidate([item[0] for item in pairs])
        manifest=self.make_manifest('core')
        for gate in policy[1]:self.add_gate(manifest,gate)
        for runtime,gate,suite in pairs[:1]+pairs[2:3]:
            path=self.checkout/suite
            original=path.read_bytes();path.unlink()
            self.git('add','.');self.git('commit','-qm','missing new suite')
            self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
            with self.subTest(gate=gate),self.assertRaisesRegex(v.InvalidReceipt,'missing-required-suite-source'):
                v.checkout_identity(self.checkout,self.expected)
            path.write_bytes(original)

    def test_v4_new_suite_pin_and_count_tampering(self):
        policy=v.checkout_policy(['server/services/ecommerce-category-graph.ts','server/storage/crm.storage.ts'])
        manifest=self.make_manifest('core')
        for name in policy[1]:self.add_gate(manifest,name)
        for name in policy[1]:
            for change in ('pin','count','total','skip','exclusion','cleanup'):
                bad=copy.deepcopy(manifest);gate=next(g for g in bad['gates'] if g['id']==name)
                if change=='pin':gate['testSuites'][0]['sourceSha256']='0'*64
                elif change=='count':gate['testSuites'][0]['testsPassed']-=1;gate['testsPassed']-=1
                elif change=='total':gate['testsPassed']+=1
                elif change=='skip':gate['testSuites'][0]['testsSkipped']=1
                elif change=='exclusion':next(g for g in bad['gates'] if g['id']=='ordinary-tests')['optInGateExclusions'].remove(name)
                else:gate['cleanup']['processesStopped']=False
                self.sign(bad)
                with self.subTest(gate=name,change=change),self.assertRaises(v.InvalidReceipt):
                    v.verify(bad,self.evidence,self.expected,policy)
        manifest['version']=3;self.sign(manifest)
        with self.assertRaisesRegex(v.InvalidReceipt,'unsupported-version'):
            v.verify(manifest,self.evidence,self.expected,policy)

    def test_known_suite_cannot_be_excluded_by_removed_feature_marker(self):
        path=self.checkout/'server/storage/crm-custom-fields.database.test.ts'
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(self.synthetic_source)
        self.git('add','.');self.git('commit','-qm','uncovered suite')
        self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
        with self.assertRaisesRegex(v.InvalidReceipt,'uncovered-known-suite'):
            v.checkout_identity(self.checkout,self.expected)

    def test_v3_partial_woo_inventory_and_mismatched_aggregates(self):
        policy = v.checkout_policy(list(v.DATABASE_FILE_GATES))
        manifest=self.make_manifest('core')
        for name in sorted(policy[1]):self.add_gate(manifest,name)
        for change in ('only-four','wrong-total','old-source','suite-skipped','ordinary-total','duplicate-suite'):
            bad=copy.deepcopy(manifest)
            gate=next(g for g in bad['gates'] if g['id']=='woo-catalog-rollback')
            if change=='only-four':
                gate['testSuites']=[x for x in gate['testSuites'] if x['testsPassed']==4];gate['testsPassed']=4
            elif change=='wrong-total':gate['testsPassed']=4
            elif change=='old-source':gate['testSuites'][0]['sourceSha256']='0'*64
            elif change=='suite-skipped':gate['testSuites'][0]['testsSkipped']=1
            elif change=='duplicate-suite':gate['testSuites'][1]=gate['testSuites'][0]
            else:next(g for g in bad['gates'] if g['id']=='ordinary-tests')['testsSkipped']+=1
            self.sign(bad)
            with self.subTest(change=change),self.assertRaises(v.InvalidReceipt):v.verify(bad,self.evidence,self.expected,policy)

    def test_crm_migration_cannot_be_hidden_by_declared_core_profile(self):
        policy=self.feature_candidate(['migrations/0062_crm_custom_fields.sql',*v.MIGRATION_GATES])
        with self.assertRaisesRegex(v.InvalidReceipt,'invalid-profile'):
            v.verify(self.make_manifest('core'),self.evidence,self.expected,policy)

    def shipping_manifest(self, all_features=False):
        paths = list(v.SHIPPING_TRIGGERS)
        if all_features: paths += ['migrations/0062_crm_custom_fields.sql', *v.MIGRATION_GATES, *v.DATABASE_FILE_GATES, *v.RUNTIME_GATES]
        policy = self.feature_candidate(paths)
        manifest = self.make_manifest(policy[0])
        for name in sorted(v.required_gates(policy) - {g['id'] for g in manifest['gates']}): self.add_gate(manifest, name)
        for name in ('browser-producer.json','browser-direct.log'):
            data = b'{"synthetic_browser_fixture":true}'; (self.evidence/name).write_bytes(data)
            manifest['evidence'].append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'sanitized':True})
        browser = next(g for g in manifest['gates'] if g['id']=='application-browser')
        browser['evidence'] += ['browser-producer.json','browser-direct.log']
        browser['inputs'] = {'shippingJourneys': {name:{'kind':'actual-browser','producerEvidence':'browser-producer.json','logEvidence':'browser-direct.log'} for name in sorted(v.SHIPPING_JOURNEYS)}}
        self.sign(manifest)
        return policy,manifest

    def test_v5_full_policy_counts_and_optimized_cli(self):
        policy,manifest=self.shipping_manifest(True)
        suites=v.suite_inventory(v.required_gates(policy))
        self.assertEqual(len(suites),19)
        self.assertEqual(sum(x['ordinarySkipped'] for x in suites.values()),174)
        self.assertEqual(sum(sum(x['testsPassed'] for x in v.gate_suites(g)) for g in v.DB_GATES & v.required_gates(policy)),199)
        self.assertEqual(v.verify(manifest,self.evidence,self.expected,policy)['gatesVerified'],35)
        (self.evidence/'manifest.json').write_text(json.dumps(manifest))
        command=['python3','-O',str(self.script),'--evidence-dir',str(self.evidence),'--manifest','manifest.json','--checkout',str(self.checkout)]
        for key,value in self.expected.items():command.extend(['--expected-'+key,value])
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        manifest['version']=4;(self.evidence/'manifest.json').write_text(json.dumps(manifest))
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,1)
        self.assertIn('unsupported-version',result.stdout+result.stderr)

    def test_v5_shipping_each_source_trigger_requires_all_five_gates(self):
        for path in v.SHIPPING_TRIGGERS:
            for crm in (False,True):
                policy=v.checkout_policy([path]+(['migrations/0062_crm_custom_fields.sql'] if crm else []))
                self.assertTrue(v.SHIPPING_GATES <= v.required_gates(policy))
        policy,manifest=self.shipping_manifest()
        for path in v.SHIPPING_SUITES:
            file=self.checkout/path;original=file.read_bytes();file.unlink()
            self.git('add','.');self.git('commit','-qm','missing shipping fixture')
            self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
            with self.subTest(path=path),self.assertRaisesRegex(v.InvalidReceipt,'missing-required-suite-source'):v.checkout_identity(self.checkout,self.expected)
            file.write_bytes(original)

    def test_v5_shipping_gate_tampering(self):
        policy,manifest=self.shipping_manifest()
        for name in v.SHIPPING_GATES:
            for change in ('missing','count','pin','total','skip','cleanup','exclusion'):
                bad=copy.deepcopy(manifest);gate=next(g for g in bad['gates'] if g['id']==name)
                if change=='missing':bad['gates'].remove(gate)
                elif change=='count':gate['testSuites'][0]['testsPassed']-=1;gate['testsPassed']-=1
                elif change=='pin':gate['testSuites'][0]['sourceSha256']='0'*64
                elif change=='total':gate['testsPassed']+=1
                elif change=='skip':gate['testsSkipped']=1
                elif change=='cleanup':gate['cleanup']['processesStopped']=False
                else:next(g for g in bad['gates'] if g['id']=='ordinary-tests')['optInGateExclusions'].remove(name)
                self.sign(bad)
                with self.subTest(gate=name,change=change),self.assertRaises(v.InvalidReceipt):v.verify(bad,self.evidence,self.expected,policy)
        bad=copy.deepcopy(manifest);next(g for g in bad['gates'] if g['id']=='ordinary-tests')['testsSkipped']+=1;self.sign(bad)
        with self.assertRaisesRegex(v.InvalidReceipt,'ordinary-skip-total-mismatch'):v.verify(bad,self.evidence,self.expected,policy)

    def test_v5_browser_requires_bound_producer_and_direct_logs(self):
        policy,manifest=self.shipping_manifest()
        for change in ('missing','boolean','component','unknown-ref','same-file','outside-gate','missing-journey'):
            bad=copy.deepcopy(manifest);gate=next(g for g in bad['gates'] if g['id']=='application-browser')
            journey=next(iter(gate['inputs']['shippingJourneys'].values()))
            if change=='missing':gate['inputs']={}
            elif change=='boolean':gate['inputs']['shippingJourneys']=True
            elif change=='component':journey['kind']='component-test'
            elif change=='unknown-ref':journey['producerEvidence']='absent.json'
            elif change=='same-file':journey['logEvidence']=journey['producerEvidence']
            elif change=='outside-gate':gate['evidence'].remove(journey['producerEvidence'])
            else:gate['inputs']['shippingJourneys'].pop(next(iter(v.SHIPPING_JOURNEYS)))
            self.sign(bad)
            with self.subTest(change=change),self.assertRaises(v.InvalidReceipt):v.verify(bad,self.evidence,self.expected,policy)

    def test_v5_changed_shipping_source_and_unknown_suite(self):
        policy,manifest=self.shipping_manifest()
        path=self.checkout/next(iter(v.SHIPPING_SUITES));original=path.read_bytes();path.write_text('changed')
        self.git('add','.');self.git('commit','-qm','changed shipping source')
        self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
        with self.assertRaisesRegex(v.InvalidReceipt,'changed-suite-source'):v.checkout_identity(self.checkout,self.expected)
        path.write_bytes(original);unknown=self.checkout/'server/new-shipping.database.test.ts';unknown.write_text('new suite')
        self.git('add','.');self.git('commit','-qm','unknown shipping suite')
        self.expected.update(candidate=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
        with self.assertRaisesRegex(v.InvalidReceipt,'unknown-opt-in-suite'):v.checkout_identity(self.checkout,self.expected)

    def test_cli_actual_clean_checkout_and_safe_failure(self):
        (self.evidence/'manifest.json').write_text(json.dumps(self.manifest))
        command=['python3',str(self.script),'--evidence-dir',str(self.evidence),'--manifest','manifest.json','--checkout',str(self.checkout)]
        for k,value in self.expected.items():command += ['--expected-'+k,value]
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        (self.evidence/'manifest.json').write_text('{"secret":"do-not-echo-me"}')
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,1);self.assertNotIn('do-not-echo-me',result.stdout+result.stderr)

if __name__=='__main__':unittest.main()
