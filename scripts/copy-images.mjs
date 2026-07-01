import { cp, mkdir } from 'node:fs/promises';
await mkdir('public/images', { recursive: true });
await cp('images', 'public/images', { recursive: true });
console.log('copied images -> public/images');
