import json, os, pathlib, signal, subprocess, sys, tempfile, unittest
from rehearsal_cleanup import capture, cleanup, exclusive_report, ChildRuns, LABEL
ID='a'*64
VOL='b'*64
NAME='owned-fixture'
class Docker:
    def __init__(self):self.present=True;self.volumes=[VOL];self.calls=[];self.remove_code=0;self.item={'Id':ID,'Name':'/'+NAME,'Config':{'Labels':{LABEL:NAME}},'HostConfig':{},'Mounts':[{'Type':'volume','Name':VOL}]}
    def run(self,args,check=True):
        self.calls.append(args);cmd=args[1:];out=''
        if cmd[0]=='inspect':out=json.dumps([self.item])
        elif cmd[:2]==['container','ls']:out=ID if self.present else ''
        elif cmd[:2]==['volume','ls']:out='\n'.join(self.volumes)
        elif cmd[0]=='rm':
            if self.remove_code==0:self.present=False;self.volumes=[]
            return subprocess.CompletedProcess(args,self.remove_code,'','')
        else:raise AssertionError(cmd)
        return subprocess.CompletedProcess(args,0,out,'')
class Tests(unittest.TestCase):
    def test_owned_removal_and_absence(self):
        d=Docker();owned=capture(d.run,['docker'],NAME,ID);self.assertTrue(cleanup(d.run,['docker'],owned)['passed']);self.assertIn(['docker','rm','--force','--volumes',ID],d.calls)
    def test_wrong_id_name_label_or_external_mount(self):
        for key,value in [('Id','c'*64),('Name','/other'),('Config',{'Labels':{}}),('HostConfig',{'Binds':['external:/data']}),('Mounts',[{'Type':'volume','Name':'named-external'}])]:
            d=Docker();d.item[key]=value
            with self.subTest(key=key),self.assertRaises(RuntimeError):capture(d.run,['docker'],NAME,ID)
            self.assertFalse(any(c[1]=='rm' for c in d.calls))
    def test_remove_failure_not_pass(self):
        d=Docker();d.remove_code=1;self.assertFalse(cleanup(d.run,['docker'],capture(d.run,['docker'],NAME,ID))['passed'])
    def test_absent_container_orphan_volume_not_deleted(self):
        d=Docker();owned=capture(d.run,['docker'],NAME,ID);d.present=False
        result=cleanup(d.run,['docker'],owned);self.assertFalse(result['passed']);self.assertEqual(result['remainingOwnedVolumes'],[VOL]);self.assertFalse(any(c[1]=='rm' for c in d.calls))
    def test_changed_owned_mounts_blocks_remove(self):
        d=Docker();owned=capture(d.run,['docker'],NAME,ID);d.item['Mounts']=[];self.assertFalse(cleanup(d.run,['docker'],owned)['passed']);self.assertFalse(any(c[1]=='rm' for c in d.calls))
    def test_exclusive_receipt_preserves_failure(self):
        with tempfile.TemporaryDirectory() as root:
            p=pathlib.Path(root)/'receipt.json';p.write_text('failed')
            with self.assertRaises(FileExistsError):exclusive_report(p)
            self.assertEqual(p.read_text(),'failed')
    def test_child_input_is_delivered(self):
        runs=ChildRuns()
        result=runs.run([sys.executable,"-c","import sys; print(sys.stdin.read())"],input="synthetic sql",text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        self.assertEqual(result.stdout.strip(),"synthetic sql")
        self.assertTrue(runs.finish()["processesStopped"])

    def test_timeout_waits_for_killed_child(self):
        runs=ChildRuns()
        with self.assertRaises(subprocess.TimeoutExpired):runs.run([sys.executable,'-c','import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);time.sleep(60)'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=.2)
        self.assertTrue(runs.finish()['processesStopped'])
    def test_cleanup_phase_orphan_is_in_final_process_inventory(self):
        runs=ChildRuns()
        before=runs.finish()
        d=Docker();owned=capture(d.run,['docker'],NAME,ID)
        orphan=[]
        def run(args,check=True):
            if not orphan:
                result=runs.run([sys.executable,'-c',"import subprocess,sys; p=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); print(p.pid)"],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
                orphan.append(int(result.stdout))
            return d.run(args,check=check)
        try:
            self.assertTrue(cleanup(run,['docker'],owned)['passed'])
            os.kill(orphan[0],0)
            after=runs.finish()
            self.assertTrue(after['processesStopped'])
            self.assertTrue(after['ownedProcessGroupIds'])
            self.assertEqual(before['ownedProcessGroupIds'], [])
            with self.assertRaises(ProcessLookupError):os.kill(orphan[0],0)
        finally:runs.finish()

    def test_cleanup_phase_timeout_is_failure_and_finally_reaped(self):
        runs=ChildRuns();runs.finish()
        d=Docker();owned=capture(d.run,['docker'],NAME,ID)
        def run(args,check=True):
            return runs.run([sys.executable,'-c','import signal,time; signal.signal(signal.SIGTERM,signal.SIG_IGN);time.sleep(60)'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=.2)
        result=cleanup(run,['docker'],owned)
        self.assertFalse(result['passed'])
        self.assertTrue(runs.finish()['processesStopped'])
        self.assertTrue(runs.groups)
if __name__=='__main__':unittest.main()

