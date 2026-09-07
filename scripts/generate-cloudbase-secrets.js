import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const target = '.env.cloudbase.local';
const rotate = process.argv.includes('--rotate');
if (existsSync(target) && !rotate) {
  console.log(`${target} already exists; left unchanged.`);
  process.exit(0);
}

const secret = () => randomBytes(32).toString('hex');
const content = [
  'TCB_ENV=small-test-free-d3fb6hemd80568ee',
  `ACTIVATION_SECRET=${secret()}`,
  `ADMIN_SECRET=${secret()}`,
  `RATE_LIMIT_SALT=${secret()}`,
  'ACCESS_DAYS=30',
  ''
].join('\n');

writeFileSync(target, content, { mode: 0o600, flag: rotate ? 'w' : 'wx' });
console.log(`${rotate ? 'Rotated' : 'Created'} ${target} with owner-only permissions. Secrets were not printed.`);
