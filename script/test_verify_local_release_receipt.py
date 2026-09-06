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
        (self.checkout/'tracked.txt').write_text('synthetic\n')
        self.git('add', 'tracked.txt'); self.git('commit', '-qm', 'fixture')
        self.expected = {'candidate': self.git('rev-parse', 'HEAD'), 'tree': self.git('rev-parse', 'HEAD^{tree}'), 'base': self.git('rev-parse', 'HEAD')}
        self.manifest = self.make_manifest('core')

    def git(self, *args):
        return subprocess.check_output(['git', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgSign=false', '-C', str(self.checkout), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def make_manifest(self, profile):
        (self.evidence/'evidence.json').write_text('{"synthetic":true}\n')
        gates = v.CORE_GATES | (v.CRM_GATES if profile == 'crm' else frozenset())
        m = {'version': 1, 'profile': profile, **self.expected, 'operator': 'operator', 'observations': {'cleanBefore': True, 'cleanAfter': True}, 'evidence': [{'path': 'evidence.json', 'sha256': hashlib.sha256((self.evidence/'evidence.json').read_bytes()).hexdigest(), 'sanitized': True}], 'gates': [], 'artifacts': {name:name+'.bin' for name in ('application','deploymentConfig','uploadVerifier','uploadApply')}}
        for path in m['artifacts'].values():
            (self.evidence/path).write_text(path)
            m['evidence'].append({'path':path,'sha256':hashlib.sha256(path.encode()).hexdigest(),'sanitized':True})
        for name in sorted(gates):
            m['gates'].append({'id': name, 'inputs':v.PINNED_INPUTS.get(name, {}), **self.expected, 'status': 'passed', 'exitCode': 0, 'testsPassed': 1, 'testsSkipped': 0, 'optInGateExclusions': [], 'evidence': ['evidence.json'], 'cleanup': {'containersRemoved': True, 'volumesRemoved': True, 'processesStopped': True} if name in v.FIXTURE_GATES else None})
        self.sign(m)
        return m

    def sign(self, m):
        m['review'] = {'reviewer': 'independent-reviewer', 'accepted': True, **self.expected, 'bundleSha256': v.review_digest(m)}

    def check(self, m=None, profile='core'):
        return v.verify(m or self.manifest, self.evidence, self.expected, profile)

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
        for key,value in [('version',2),('version',True),('profile','unknown'),('profile','crm'),('secret','not-accepted')]:
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
        m=copy.deepcopy(self.manifest);g=next(x for x in m['gates'] if x['id']=='ordinary-tests');g['testsSkipped']=57;g['optInGateExclusions']=sorted(v.DB_GATES & v.CORE_GATES);self.sign(m)
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
        self.assertEqual(v.checkout_identity(self.checkout,self.expected),'core')
        (self.checkout/'untracked').write_text('dirty')
        with self.assertRaisesRegex(v.InvalidReceipt,'dirty-checkout'):v.checkout_identity(self.checkout,self.expected)
        (self.checkout/'untracked').unlink()
        wrong={**self.expected,'candidate':'0'*40}
        with self.assertRaisesRegex(v.InvalidReceipt,'stale-head'):v.checkout_identity(self.checkout,wrong)
        marker=self.checkout/'shared/schema/crm-custom-fields.ts';marker.parent.mkdir(parents=True);marker.write_text('// synthetic')
        self.git('add','.');self.git('commit','-qm','crm');expected={**self.expected,'candidate':self.git('rev-parse','HEAD'),'tree':self.git('rev-parse','HEAD^{tree}')}
        self.assertEqual(v.checkout_identity(self.checkout,expected),'crm')

    def test_cli_actual_clean_checkout_and_safe_failure(self):
        (self.evidence/'manifest.json').write_text(json.dumps(self.manifest))
        command=['python3',str(SCRIPT),'--evidence-dir',str(self.evidence),'--manifest','manifest.json','--checkout',str(self.checkout)]
        for k,value in self.expected.items():command += ['--expected-'+k,value]
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        (self.evidence/'manifest.json').write_text('{"secret":"do-not-echo-me"}')
        result=subprocess.run(command,capture_output=True,text=True)
        self.assertEqual(result.returncode,1);self.assertNotIn('do-not-echo-me',result.stdout+result.stderr)

if __name__=='__main__':unittest.main()
