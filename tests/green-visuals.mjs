import assert from 'node:assert/strict';
import {createVisuals} from '../core/visuals.mjs';
const calls=[],blend=[],mobile={mobile:true};
const gl={ARRAY_BUFFER:1,DYNAMIC_DRAW:2,BLEND:3,enable:value=>blend.push(value),disable(){},uniform1f(){},bindBuffer(){},bufferData(){}};
const ground=(x,z)=>x*.01+z*.005;
const visuals=createVisuals({gl,uniform:{opacity:0},draw:buffer=>calls.push(buffer),buffer:mesh=>({grid:true,count:mesh.length/6}),mobile:()=>mobile,
    ground,surface:()=> 'green',greenBounds:{minX:0,maxX:12,minZ:0,maxZ:12}});
const frame={pin:{x:8,z:7},ball:{x:3,z:4,y:ground(3,4),mode:'rest'},gridTick:20};
visuals.drawFrame(frame);
assert.equal(calls[0].grid,true);assert.ok(calls[0].count>0);assert.equal(blend.length,0,'Putting uses grid and small moving dashes, not flyover arrows');
calls.length=0;
visuals.drawFrame({...frame,readOpacity:1});
assert.ok(calls.every(call=>!call.grid),'Flyover uses chevrons without putting grid');assert.equal(blend.length,1);
calls.length=0;
visuals.drawFrame({...frame,gridTick:21});
assert.equal(calls[0].grid,true,'Return from flyover restores the putting grid');assert.equal(blend.length,1);
console.log('Shared green graphics passed: putting grid/dashes, flyover-only chevrons and grid restored after flyover.');
