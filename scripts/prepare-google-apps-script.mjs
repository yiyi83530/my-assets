import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const source = path.join(projectRoot, 'docs', 'google-apps-script.gs');
const publicDir = path.join(projectRoot, 'public');
const destination = path.join(publicDir, 'google-apps-script.gs');

await mkdir(publicDir, { recursive: true });
await copyFile(source, destination);

console.log('Prepared public/google-apps-script.gs from docs/google-apps-script.gs');
