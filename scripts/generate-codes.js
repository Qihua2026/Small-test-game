import { resolve } from 'node:path';
import { ActivationStore } from '../server/activation-store.js';

const count = Number.parseInt(process.argv[2] || '10', 10);
const batchId = process.argv[3] || `batch-${new Date().toISOString().slice(0, 10)}`;
const filePath = resolve(process.env.ACTIVATION_DATA_FILE || '.data/activation-codes.json');
const secret = process.env.ACTIVATION_SECRET || 'local-code-generation-secret';
const store = new ActivationStore(filePath, { secret });
const codes = await store.generate(count, { batchId });

console.log(`Generated ${codes.length} activation codes for ${batchId}:`);
console.log(codes.join('\n'));
console.log('\nSave this output securely. Plain codes cannot be recovered from the data file.');
