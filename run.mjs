import { mkdtemp, readFile, appendFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Every invocation gets a fresh directory, including invalid configurations.
const output = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'gatekeeperqa-'));
const root = fileURLToPath(new URL('./', import.meta.url));
const config = resolve(process.env.GITHUB_WORKSPACE || process.cwd(), process.env.GK_CONFIG || 'gatekeeperqa.json');
let code = await new Promise(resolveCode => {
  const child = spawn(process.execPath, [join(root, 'node_modules/@gatekeeperqa/cli/dist/cli/index.js'), '--config', config, '--output', output], { stdio: 'inherit' });
  child.on('error', () => resolveCode(2));
  child.on('close', value => resolveCode(value ?? 2));
});
let status = 'ERROR';
if (code === 0 || code === 1) {
  try {
    const report = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'));
    if (!['PASS', 'WARN', 'FAIL'].includes(report.status) || (report.status === 'FAIL') !== (code === 1)) throw new Error('Invalid result');
    status = report.status;
  } catch { code = 2; }
}
if (status === 'ERROR') await writeFile(join(output, 'error.txt'), 'GatekeeperQA could not complete. Check the scan log, configuration and target availability. No passing result was issued.\n');
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `status=${status}\nexit-code=${code}\nreport-path=${output}\n`);
// Do not echo page-controlled strings into GitHub's rendered job summary.
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## GatekeeperQA: ${status}\n\nDownload the report artifact for element locations and guidance. Automated checks do not certify accessibility conformance.\n`);
// The composite action uploads evidence first, then enforces this code.
console.log(`GatekeeperQA action: ${status}`);
