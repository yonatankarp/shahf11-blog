import { cp, mkdir, rm } from 'node:fs/promises';
await rm('public/images', { recursive: true, force: true });
await rm('public/gallery/photos', { recursive: true, force: true });
await mkdir('public/images', { recursive: true });
await cp('images', 'public/images', { recursive: true });
await mkdir('public/gallery/photos', { recursive: true });
await cp('gallery/photos', 'public/gallery/photos', { recursive: true });
console.log('copied images -> public/images');
console.log('copied gallery/photos -> public/gallery/photos');
