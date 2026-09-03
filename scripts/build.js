import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

if (existsSync('dist')) rmSync('dist', { recursive: true });
mkdirSync('dist');
cpSync('index.html', 'dist/index.html');
cpSync('admin.html', 'dist/admin.html');
cpSync('src', 'dist/src', { recursive: true });
console.log('Built static site in dist/');
