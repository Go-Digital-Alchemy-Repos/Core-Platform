#!/usr/bin/env python3
"""Exercise the compiled maintenance server against an owned empty local PostgreSQL fixture."""
import hashlib, json, os, pathlib, re, secrets, signal, socket, subprocess, tempfile, time, urllib.request, urllib.error, uuid
root=pathlib.Path(__file__).resolve().parent.parent
name='core-recovery-'+uuid.uuid4().hex[:12]
password=secrets.token_hex(20)
process=None
created=False
report={}
def run(args, **kwargs):
    return subprocess.run(args,check=True,text=True,capture_output=True,timeout=60,**kwargs)
def require(value, message):
    if not value: raise RuntimeError(message)
def request(port,path,method='GET'):
    try:
        with urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}'+path,method=method),timeout=3) as response:
            return response.status,response.read().decode()
    except urllib.error.HTTPError as error: return error.code,error.read().decode()
def interrupted(number, _frame):
    raise RuntimeError(f"Recovery verification interrupted by signal {number}")
signal.signal(signal.SIGTERM, interrupted)
signal.signal(signal.SIGINT, interrupted)
try:
    configuration=(root/'railway.toml').read_text()
    require(re.search(r'^drainingSeconds\s*=\s*45\s*$',configuration,re.M), 'Railway drainingSeconds must be numeric 45')
    configured_paths=re.findall(r'^healthcheckPath\s*=\s*"([^"]+)"\s*$',configuration,re.M)
    require(len(configured_paths)==1,'Exactly one configured healthcheck required')
    readiness_path=configured_paths[0]
    require(readiness_path=='/ready','Recovery deployment must use its own readiness endpoint')
    context=os.environ.get('DOCKER_CONTEXT')
    endpoint=(os.environ.get('DOCKER_HOST') if not context else None) or run(['docker','context','inspect',*([context] if context else []),'--format','{{.Endpoints.docker.Host}}']).stdout.strip()
    require(endpoint.startswith('unix://'),'Local Docker required')
    created=True
    run(['docker','run','-d','--name',name,'-p','127.0.0.1::5432','-e','POSTGRES_PASSWORD='+password,'postgres:16-alpine'])
    database_port=run(['docker','port',name,'5432']).stdout.strip().rsplit(':',1)[1]
    deadline=time.monotonic()+30
    while subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True).returncode:
        require(time.monotonic()<deadline,'Database startup timeout');time.sleep(.2)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    env={key:os.environ[key] for key in ['PATH','HOME','TMPDIR'] if key in os.environ}
    env.update(NODE_ENV='production',PORT=str(port),DATABASE_URL=f'postgresql://postgres:{password}@127.0.0.1:{database_port}/postgres?sslmode=disable',SESSION_SECRET='synthetic-recovery-session',CLIENT_STACK_ID='synthetic-recovery',UPLOAD_MUTATIONS_FROZEN='true')
    artifact=root/'dist/rollback-maintenance.cjs'
    report['artifact_sha256']=hashlib.sha256(artifact.read_bytes()).hexdigest()
    with tempfile.TemporaryFile() as logs:
        process=subprocess.Popen(['node',str(artifact)],cwd=root,env=env,stdout=logs,stderr=logs)
        deadline=time.monotonic()+30
        while True:
            require(process.poll() is None,'Recovery server exited before readiness')
            try:
                code,body=request(port,readiness_path)
                if code==200: break
            except (OSError,urllib.error.URLError): pass
            require(time.monotonic()<deadline,'Recovery readiness timeout');time.sleep(.2)
        require('rollback-maintenance' in body,'Missing explicit recovery mode')
        for method,path in [('POST','/api/stripe/webhook'),('POST','/api/contact'),('GET','/api/admin/settings'),('DELETE','/r2/cms/test.webp')]:
            require(request(port,path,method)[0]==503,'Business admission was not blocked')
        count=run(['docker','exec',name,'psql','-U','postgres','-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"]).stdout.strip()
        require(count=='0','Recovery entrypoint created application tables')
        process.send_signal(signal.SIGTERM);require(process.wait(timeout=10)==0,'Recovery server did not drain cleanly')
        report.update(status='passed',configured_healthcheck_path=readiness_path,read_only_database_readiness=True,business_requests_rejected=True,no_bootstrap_tables=True,shutdown_exit=0)
except Exception as error:
    report.update(status='failed',error=str(error).replace(password,'[redacted]'))
finally:
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    if process and process.poll() is None:
        try:
            process.kill();process.wait(timeout=5)
        except Exception:
            report.update(status="failed",process_cleanup_failed=True)
    if created:
        try:
            result=subprocess.run(['docker','rm','-f','-v',name],capture_output=True,timeout=30)
            report['fixture_removed']=result.returncode==0
        except Exception:
            report['fixture_removed']=False
        if not report['fixture_removed']: report['status']='failed'
    print(json.dumps(report,indent=2))
raise SystemExit(0 if report.get('status')=='passed' else 1)
