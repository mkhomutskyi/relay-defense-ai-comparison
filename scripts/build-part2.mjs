// Packaging only: keep model-authored src/public unchanged; use a relative Vite base.
import{spawnSync}from'node:child_process';import fs from'node:fs';import path from'node:path';
const root=process.cwd(),games=JSON.parse(fs.readFileSync('site/part-2/games.json','utf8'));
for(const g of games){const cwd=path.join(root,g.sourceDirectory),tsc=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{cwd,encoding:'utf8'});if(tsc.status!==0)throw Error(tsc.stdout+tsc.stderr);const vite=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--base=./','--outDir',path.join(root,'site/part-2/games',g.id)],{cwd,encoding:'utf8'});if(vite.status!==0)throw Error(vite.stdout+vite.stderr);console.log(g.id,'typecheck and relative-base bundle passed')}
