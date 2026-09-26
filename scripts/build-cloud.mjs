import {build} from 'esbuild';
await build({entryPoints:['app/cloud-source.js'],outfile:'app/cloud.js',bundle:true,format:'esm',platform:'browser',minify:true,external:['./cloud-config.js'],legalComments:'linked'});
console.log('Cloud SDK bundled locally');
