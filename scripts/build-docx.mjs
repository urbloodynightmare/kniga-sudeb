import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['app/docx-import-source.js'],outfile:'app/docx-import.js',bundle:true,format:'esm',platform:'browser',minify:true,external:['./merchant-import.js*'],legalComments:'linked'});
await fs.copyFile('node_modules/fflate/LICENSE','app/docx-import.LICENSE.txt');
console.log('Word importer bundled locally');
