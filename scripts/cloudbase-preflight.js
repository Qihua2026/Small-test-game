import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'cloudbaserc.json', 'dist/index.html', 'dist/admin.html',
  'cloudbase/functions/activation-api/index.js', 'cloudbase/functions/activation-api/package.json',
  'cloudbase/functions/activation-api/package-lock.json', 'cloudbase/functions/activation-api/scf_bootstrap'
];
const missing = requiredFiles.filter(file => !existsSync(file));
const config = JSON.parse(readFileSync('cloudbaserc.json', 'utf8'));
const errors = [];
if (missing.length) errors.push(`Missing files: ${missing.join(', ')}`);
const activationFunction = config.functions?.find(item => item.name === 'activation-api');
if (!config.functionRoot || !activationFunction) errors.push('cloudbaserc.json does not define activation-api');
if (activationFunction && activationFunction.type !== 'HTTP') errors.push('activation-api must be an HTTP function');
if (config.envId === 'REPLACE_WITH_CLOUDBASE_ENV_ID' && !process.env.TCB_ENV_ID) errors.push('Set TCB_ENV_ID or replace envId before deployment');

if (errors.length) {
  console.error(`CloudBase preflight failed:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else console.log('CloudBase preflight passed.');
