import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const MAX_BLOCKS = 500;
const STORAGE = 'cryptic-verse-creator-draft-v1';
const COMMUNITY = 'cryptic-verse-community-worlds-v2';
const MATERIALS = {
  Grass:0x6cae73, Stone:0x9999a7, Wood:0x9c6848,
  Brick:0xb75e57, Gold:0xeac16e, Ice:0x8bd5ec,
  Lava:0xd6623c, Neon:0xb66cff
};
const validMats = new Set(Object.keys(MATERIALS));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x343047);
scene.fog = new THREE.Fog(0x343047,35,95);
const camera = new THREE.PerspectiveCamera(60,1,.1,130);
camera.position.set(13,15,17);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('three-root').appendChild(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0,1.5,0); orbit.enableDamping=true; orbit.maxPolarAngle=Math.PI*.48;
orbit.minDistance=3;orbit.maxDistance=57;
scene.add(new THREE.HemisphereLight(0xe8ecff,0x443847,2.1));
const sun=new THREE.DirectionalLight(0xffead3,2.4);
sun.position.set(13,23,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;scene.add(sun);
const base = new THREE.Mesh(new THREE.BoxGeometry(50,.5,50),new THREE.MeshStandardMaterial({color:0x485b4a,roughness:1}));
base.position.y=-.26; base.receiveShadow=true;scene.add(base);
const grid=new THREE.GridHelper(50,50,0x9c9f97,0x66736c);grid.position.y=.015;scene.add(grid);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const geometry=new THREE.BoxGeometry(1,1,1);
const blockGroup=new THREE.Group();scene.add(blockGroup);
const faceMat=name=>new THREE.MeshStandardMaterial({color:MATERIALS[name],roughness:name==='Ice'?.22:.78,metalness:name==='Gold'?.65:0,emissive:name==='Neon'?0x37164b:0x000000});
const mats=Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,faceMat(k)]));
const preview=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xfbc8a2,transparent:true,opacity:.37,depthWrite:false}));preview.visible=false;scene.add(preview);
const selectBox=new THREE.BoxHelper(new THREE.Mesh(geometry),0xffde93);selectBox.visible=false;scene.add(selectBox);
const flag=new THREE.Group();
const pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,2,8),new THREE.MeshStandardMaterial({color:0xf1dcc6,metalness:.35}));pole.position.y=1;flag.add(pole);
const banner=new THREE.Mesh(new THREE.ConeGeometry(.55,.95,3),new THREE.MeshStandardMaterial({color:0xffaa75,emissive:0x884016,emissiveIntensity:.7}));banner.position.set(.38,1.75,0);banner.rotation.z=-Math.PI/2;flag.add(banner);
const beacon=new THREE.PointLight(0xffad6c,1.6,5);beacon.position.y=1.8;flag.add(beacon);scene.add(flag);
const player=new THREE.Group();
const torso=new THREE.Mesh(new THREE.BoxGeometry(.55,.8,.35),new THREE.MeshStandardMaterial({color:0xf5a083}));torso.position.y=1.15;player.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.28,14,12),new THREE.MeshStandardMaterial({color:0xf9d5be}));head.position.y=1.83;player.add(head);
const legs=new THREE.Mesh(new THREE.BoxGeometry(.48,.7,.34),new THREE.MeshStandardMaterial({color:0x494662}));legs.position.y=.36;player.add(legs);player.visible=false;scene.add(player);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
let blocks=[], history=[], tool='place', material='Grass', selected=null, hovered=null;
let goal={x:5,y:0,z:0}, playing=false, jumped=false, yVelocity=0, win=false;
let worldName='My First World', lastSaved='', pointerDown=null;
const keys=new Set();
const showToast=msg=>{const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2800);};
function season(){const d=new Date(),m=d.getMonth()+1,n=d.getDate();return m===12&&(n===24||n===25)?'christmas':m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';}
document.documentElement.dataset.season=season();
const posKey=(x,y,z)=>`${x},${y},${z}`;
const byPos=(x,y,z)=>blocks.find(b=>b.x===x&&b.y===y&&b.z===z);
const clampInt=(x,min,max)=>Math.max(min,Math.min(max,Math.round(x)));
const normalizeBlock=b=>({x:clampInt(Number(b.x),-24,24),y:clampInt(Number(b.y),0,29),z:clampInt(Number(b.z),-24,24),material:validMats.has(b.material)?b.material:'Grass',rotation:Math.round(Number(b.rotation)||0)%4});
function draw(){
  blockGroup.clear();
  for(const b of blocks){const mesh=new THREE.Mesh(geometry,mats[b.material]);mesh.position.set(b.x,b.y+.5,b.z);mesh.rotation.y=b.rotation*Math.PI/2;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.block=b;blockGroup.add(mesh);}
  flag.position.set(goal.x,goal.y,goal.z);flag.visible=true;
  if(selected && !blocks.includes(selected)) selected=null;
  selectBox.visible=!!selected;
  if(selected){selectBox.position.set(selected.x,selected.y+.5,selected.z);selectBox.rotation.set(0,0,0);selectBox.scale.set(1,1,1);selectBox.updateMatrixWorld();}
  $('object-count').textContent=`${blocks.length} / ${MAX_BLOCKS} blocks`;
  renderExplorer();
  $('selection-info').textContent=selected?`Selected: ${selected.material} at (${selected.x}, ${selected.y}, ${selected.z})`:`${blocks.length} blocks in your world`;
}
function snapshot(){history.push(JSON.stringify({blocks,goal}));if(history.length>60)history.shift();}
function dirty(){lastSaved='';$('save-status').textContent='Unsaved changes';draw();}
function addBlock(b){if(blocks.length>=MAX_BLOCKS)return showToast('500-block limit reached');if(byPos(b.x,b.y,b.z))return; snapshot();blocks.push({...b,rotation:0});dirty();}
function removeBlock(b){if(!b)return;snapshot();blocks=blocks.filter(v=>v!==b);selected=null;dirty();}
function orbitCamera(){camera.position.set(13,15,17);orbit.target.set(0,1.5,0);orbit.update();}
function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width*2-1;pointer.y=-(event.clientY-rect.top)/rect.height*2+1;ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects([...blockGroup.children,ground],false);if(!hits.length)return null;const h=hits[0];if(h.object===ground)return {block:null,position:{x:clampInt(Math.floor(h.point.x+.5),-24,24),y:0,z:clampInt(Math.floor(h.point.z+.5),-24,24)}};const b=h.object.userData.block;const normal=h.face.normal.clone().transformDirection(h.object.matrixWorld);return {block:b,position:{x:b.x+Math.round(normal.x),y:b.y+Math.round(normal.y),z:b.z+Math.round(normal.z)}};}
function usePick(event,erase=false){if(playing)return;const hit=pick(event);if(!hit)return;if(erase||tool==='erase'){removeBlock(hit.block);return;}if(tool==='select'){selected=hit.block;draw();return;}const p=hit.position;if(!p||Math.abs(p.x)>24||Math.abs(p.z)>24||p.y<0||p.y>29)return;if(tool==='goal'){snapshot();goal={x:p.x,y:p.y,z:p.z};dirty();showToast('Finish flag moved');return;}addBlock({...p,material});}
function renderMaterials(){const list=$('material-list');list.replaceChildren();for(const [name,color] of Object.entries(MATERIALS)){const b=document.createElement('button');b.type='button';b.className='material'+(material===name?' active':'');const dot=document.createElement('span');dot.className='swatch';dot.style.background='#'+color.toString(16).padStart(6,'0');const label=document.createElement('span');label.textContent=name;b.append(dot,label);b.onclick=()=>{material=name;renderMaterials();};list.append(b);}}
function setTool(next){tool=next;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===next));preview.visible=false;}
function save(){try{const data={schema:1,name:worldName,blocks,goal,updatedAt:new Date().toISOString()};localStorage.setItem(STORAGE,JSON.stringify(data));lastSaved=data.updatedAt;$('save-status').textContent='Draft saved';showToast('Draft saved in this browser');}catch{showToast('Storage unavailable. Use Export World.');}}
function validateWorld(data){if(!data||data.schema!==1||typeof data.name!=='string'||!Array.isArray(data.blocks)||data.blocks.length>MAX_BLOCKS||!data.goal)throw Error('Not a supported Cryptic Verse world file.');const clean=data.blocks.map(normalizeBlock),unique=new Set(clean.map(b=>posKey(b.x,b.y,b.z)));if(unique.size!==clean.length)throw Error('World has overlapping blocks.');return {name:data.name.slice(0,60),blocks:clean,goal:{x:clampInt(Number(data.goal.x),-24,24),y:clampInt(Number(data.goal.y),0,29),z:clampInt(Number(data.goal.z),-24,24)}};}
function loadWorld(data){const valid=validateWorld(data);blocks=valid.blocks;goal=valid.goal;worldName=valid.name;$('world-name').value=worldName;$('stage-title').textContent=worldName;history=[];selected=null;dirty();orbitCamera();}
function exportWorld(){const file={schema:1,name:worldName,blocks,goal,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=(worldName.replace(/[^a-z0-9_-]+/gi,'-').slice(0,45)||'world')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
function reset(){if(!confirm('Clear the current world? Export a backup first if you want to keep it.'))return;snapshot();blocks=[];selected=null;goal={x:5,y:0,z:0};dirty();}
function updateSelected(delta){if(!selected)return showToast('Select a block first');const y=selected.y+delta;if(y<0||y>29||byPos(selected.x,y,selected.z))return showToast('Cannot move block there');snapshot();selected.y=y;dirty();}
function startPlay(){if(playing)return;playing=true;win=false;keys.clear();player.position.set(0,byPos(0,0,0)?1:0,0);yVelocity=0;player.visible=true;orbit.enabled=false;$('play').hidden=true;$('stop').hidden=false;$('play-help').hidden=false;$('win-toast').hidden=true;$('hint').hidden=true;preview.visible=false;selectBox.visible=false;camera.position.set(0,5.5,9);camera.lookAt(0,1,0);showToast('Play testing — WASD to move, Space to jump');}
function stopPlay(){playing=false;keys.clear();player.visible=false;orbit.enabled=true;$('play').hidden=false;$('stop').hidden=true;$('play-help').hidden=true;$('win-toast').hidden=true;$('hint').hidden=false;orbitCamera();draw();}
function playFrame(dt){
  const speed=5.5, x=(keys.has('d')?1:0)-(keys.has('a')?1:0),z=(keys.has('s')?1:0)-(keys.has('w')?1:0),norm=Math.hypot(x,z)||1;
  let nx=player.position.x+x/norm*speed*dt,nz=player.position.z+z/norm*speed*dt;
  nx=THREE.MathUtils.clamp(nx,-24,24);nz=THREE.MathUtils.clamp(nz,-24,24);
  // Side collisions: don't walk through blocks at torso height.
  const blocked=blocks.some(b=>Math.abs(nx-b.x)<.75&&Math.abs(nz-b.z)<.75&&player.position.y<b.y+1&&player.position.y+1.6>b.y);
  if(!blocked){player.position.x=nx;player.position.z=nz;}
  const support=blocks.filter(b=>Math.abs(player.position.x-b.x)<.7&&Math.abs(player.position.z-b.z)<.7&&player.position.y>=b.y+.88&&player.position.y<=b.y+1.5).reduce((v,b)=>Math.max(v,b.y+1),0);
  if(keys.has(' ')&&!jumped&&player.position.y<=support+.08){yVelocity=8;jumped=true;}
  yVelocity-=18*dt;player.position.y+=yVelocity*dt;
  if(player.position.y<=support){player.position.y=support;yVelocity=0;jumped=false;}
  if(x||z)player.rotation.y=Math.atan2(x,-z);
  camera.position.lerp(new THREE.Vector3(player.position.x,player.position.y+5,player.position.z+8),Math.min(1,dt*7));camera.lookAt(player.position.x,player.position.y+1,player.position.z);
  if(!win&&Math.hypot(player.position.x-goal.x,player.position.z-goal.z)<1.1&&Math.abs(player.position.y-goal.y)<2){win=true;$('win-toast').hidden=false;showToast('Level completed!');}
}
// UI wiring
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('world-name').oninput=e=>{worldName=e.target.value.slice(0,60);$('stage-title').textContent=worldName||'Untitled World';$('save-status').textContent='Unsaved changes';};
$('save').onclick=save;$('export').onclick=exportWorld;$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>300000)throw Error('World file is too large.');loadWorld(JSON.parse(await file.text()));showToast('World imported');}catch(err){showToast('Import failed: '+err.message);}e.target.value='';};
$('undo').onclick=()=>{if(!history.length)return showToast('Nothing to undo');const prior=JSON.parse(history.pop());blocks=prior.blocks;goal=prior.goal;selected=null;dirty();};
$('reset').onclick=reset;$('rotate').onclick=()=>{if(!selected)return showToast('Select a block first');snapshot();selected.rotation=(selected.rotation+1)%4;dirty();};$('delete').onclick=()=>removeBlock(selected);
$('move-up').onclick=()=>updateSelected(1);$('move-down').onclick=()=>updateSelected(-1);
$('camera-reset').onclick=orbitCamera;$('play').onclick=startPlay;$('stop').onclick=stopPlay;
renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY,button:e.button};});
renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown||playing)return;const moved=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);if(moved<6)usePick(e,e.button===2);pointerDown=null;});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointermove',e=>{if(playing||tool!=='place'||e.buttons){preview.visible=false;return;}const h=pick(e),p=h?.position;preview.visible=!!p&&p.y>=0&&p.y<=29&&Math.abs(p.x)<=24&&Math.abs(p.z)<=24&&!byPos(p.x,p.y,p.z);if(preview.visible)preview.position.set(p.x,p.y+.5,p.z);});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&playing){stopPlay();return;}if(!playing||e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();if(['w','a','s','d',' '].includes(k)){keys.add(k);e.preventDefault();}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const resize=()=>{const el=$('three-root'),w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
new ResizeObserver(resize).observe($('three-root'));resize();
renderMaterials();
try{const draft=localStorage.getItem(STORAGE);if(draft){loadWorld(JSON.parse(draft));$('save-status').textContent='Draft loaded';}else{blocks=[{x:0,y:0,z:0,material:'Grass',rotation:0},{x:2,y:0,z:0,material:'Stone',rotation:0},{x:4,y:0,z:0,material:'Gold',rotation:0}];draw();}}catch{draw();showToast('Could not read saved draft');}
let then=performance.now();function loop(now){const dt=Math.min((now-then)/1000,.05);then=now;if(playing)playFrame(dt);else orbit.update();renderer.render(scene,camera);requestAnimationFrame(loop);}requestAnimationFrame(loop);

// Creator Studio v2 — Explorer, Properties, starter templates and local-only community catalog.
function renderExplorer(){
 const host=$('explorer'); if(!host)return;
 host.replaceChildren();
 const folder=document.createElement('button'); folder.type='button';folder.textContent='▾ Workspace  ·  '+blocks.length+' Parts';folder.disabled=true;host.append(folder);
 const goalButton=document.createElement('button');goalButton.type='button';goalButton.textContent='  ⚑ Goal (Finish Flag)';goalButton.onclick=()=>{selected=null;draw();showToast('Choose Goal tool to move finish flag');};host.append(goalButton);
 blocks.forEach((b,i)=>{const el=document.createElement('button');el.type='button';el.textContent='    ▣ '+b.material+' Part '+(i+1);el.classList.toggle('active',selected===b);el.onclick=()=>{setTool('select');selected=b;draw();};host.append(el);});
 const disabled=!selected;
 for(const key of ['x','y','z']){$('prop-'+key).disabled=disabled;$('prop-'+key).value=disabled?'':selected[key];}
 $('prop-name').value=disabled?'None':selected.material+' Part';
 $('prop-mat').disabled=disabled;$('prop-apply').disabled=disabled;
 if(!disabled)$('prop-mat').value=selected.material;
}
const propMat=$('prop-mat');
for(const mat of Object.keys(MATERIALS)){const option=document.createElement('option');option.value=mat;option.textContent=mat;propMat.add(option);}
$('prop-apply').onclick=()=>{
 if(!selected)return;const next={};for(const key of ['x','y','z']){const raw=$('prop-'+key).value;if(!/^[-]?\d+$/.test(raw))return showToast('Coordinates must be whole numbers');next[key]=Number(raw);}
 if(Math.abs(next.x)>24||Math.abs(next.z)>24||next.y<0||next.y>29)return showToast('Position is outside the build area');
 if(blocks.some(b=>b!==selected&&b.x===next.x&&b.y===next.y&&b.z===next.z))return showToast('A block already exists there');
 snapshot();Object.assign(selected,next,{material:propMat.value});dirty();
};
$('template-blank').onclick=reset;
$('template-obby').onclick=()=>{
 if(!confirm('Replace this world with a starter obstacle course? Export your current world if needed.'))return;
 snapshot();blocks=[];
 for(let i=0;i<13;i++){blocks.push({x:i*2-12,y:Math.floor(i/4),z:(i%3)-1,material:i%4===0?'Gold':i%2?'Stone':'Grass',rotation:0});}
 goal={x:12,y:3,z:-1};worldName='My First Obby';$('world-name').value=worldName;$('stage-title').textContent=worldName;selected=null;dirty();orbitCamera();showToast('Parkour starter created');
};
$('publish-local').onclick=()=>{
 try{
 const stored=JSON.parse(localStorage.getItem(COMMUNITY)||'[]');if(!Array.isArray(stored))throw Error('Invalid library');
 const clean=validateWorld({schema:1,name:worldName||'Untitled World',blocks,goal});
 const id=globalThis.crypto?.randomUUID?.()||('world-'+Date.now());
 stored.unshift({id,schema:1,name:clean.name,blocks:clean.blocks,goal:clean.goal,createdAt:new Date().toISOString()});
 localStorage.setItem(COMMUNITY,JSON.stringify(stored.slice(0,30)));
 showToast('Added to My Community Games on this browser!');
 }catch(e){showToast('Could not save game: '+e.message);}
};
renderExplorer();
