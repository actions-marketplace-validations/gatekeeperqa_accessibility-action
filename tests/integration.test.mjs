import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

test('published CLI adapter: PASS, WARN, FAIL, invalid config, unavailable target and fresh reports', async () => {
  const root = resolve('.test-output');
  await mkdir(root, {recursive:true});
  const workspace = await mkdtemp(join(root,'consumer-'));
  const server = createServer((req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html lang="en"><title>Fixture</title><body><main><h1>Test</h1>'+ (req.url==='/bad'?'<button></button>':'<button>Continue</button>')+'</main></body></html>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}`;
  const paths = new Set();
  try {
    for (const [name,config,expected,code] of [
      ['pass',{urls:[url]},'PASS','0'],
      ['fail',{urls:[url+'/bad']},'FAIL','1'],
      ['warn',{urls:[url+'/bad'],failOn:[],warnOn:['critical','serious','moderate','minor','unknown']},'WARN','0'],
      ['invalid',{urls:[]},'ERROR','2'],
      ['unavailable',{urls:['http://127.0.0.1:1'],timeoutMs:1000},'FAIL','1'],
      ['repeat',{urls:[url]},'PASS','0']
    ]) {
      await writeFile(join(workspace,'gatekeeperqa.json'),JSON.stringify(config));
      const output=join(workspace,name+'.out');
      const result=await new Promise(r=>{
        const child=spawn(process.execPath,[resolve('run.mjs')],{env:{...process.env,GITHUB_WORKSPACE:workspace,RUNNER_TEMP:workspace,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:join(workspace,name+'.md')},stdio:'pipe'});
        let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
        child.on('close',exit=>r({exit,log}));
      });
      assert.equal(result.exit,0,result.log);
      const values=Object.fromEntries((await readFile(output,'utf8')).trim().split('\n').map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
      assert.equal(values.status,expected,result.log);
      assert.equal(values['exit-code'],code,result.log);
      assert.ok(!paths.has(values['report-path']));paths.add(values['report-path']);
      assert.ok(values['report-path'].startsWith(workspace));
      if(expected==='ERROR') assert.match(await readFile(join(values['report-path'],'error.txt'),'utf8'),/No passing result/);
      else assert.equal(JSON.parse(await readFile(join(values['report-path'],'report.json'),'utf8')).status,expected);
    }
  } finally { await new Promise(r=>server.close(r)); }
});
