import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const allowedSecrets = new Set([
  'DATABASE_URL',
  'JWT_SIGNING_KEY',
  'DATA_ENCRYPTION_KEY_V1',
  'API_KEY_PEPPER',
  'SESSION_TOKEN_PEPPER',
  'OAUTH_TOKEN_PEPPER',
  'WEBHOOK_MASTER_KEY',
]);

for (const name of allowedSecrets) {
  const fileVariable = `${name}_FILE`;
  const file = process.env[fileVariable];
  if (!file) continue;

  const value = readFileSync(file, 'utf8').replace(/[\r\n]+$/, '');
  if (!value) throw new Error(`secret file for ${name} is empty`);
  process.env[name] = value;
  delete process.env[fileVariable];
}

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('usage: secret-env.mjs <command> [args...]');

const child = spawn(command, args, {
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
