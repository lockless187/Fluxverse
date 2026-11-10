import * as THREE from 'three';
const $=id=>document.getElementById(id), COMMUNITY='cryptic-verse-community-worlds-v2';
function fail(message){$('message').hidden=false;$('message').textContent=message;}
let list=[];try{const x=JSON.parse(localStorage.getItem(COMMUNITY)||'[]');if(Array.isArray(x))list=x;}catch{}
const id=new URLSearchParams(location.search).get('id');const world=list.find(w=>w&&w.id===id);
if(!world||!Array.isArray(world.blocks)||world.blocks.length>500||!world.goal){fail('World not found in this browser. Return to Community Games.');}
else{
 $('world-name').textContent=String(world.name).slice(0,60);
 const colors={Grass:0x6cae73,Stone:0x9999a7,Wood:0x9c6848,Brick:0xb75e57,Gold:0xeac16e,Ice:0x8bd5ec,Lava:0xd6623c,Neon:0xb66cff};
 const blocks=world.blocks.filter(b=>b&&Object.hasOwn(colors,b.material)&&Number.isInteger(b.x)&&Number.isInteger(b.y)&&Number.isInteger(b.z)&&Math.abs(b.x)<=24&&Math.abs(b.z)<=24&&b.y>=0&&b.y<=29);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x37364b);scene.fog=new THREE.Fog(0x37364b,35,90);
 const camera=new THREE.PerspectiveCamera(65,1,.1,100);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;$('canvas').append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xf7e8db,0x463945,2.3));const sun=new THREE.DirectionalLight(0xfff0d9,2.1);sun.position.set(14,22,9);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.BoxGeometry(50,.5,50),new THREE.MeshStandardMaterial({color:0x526250,roughness:1}));ground.position.y=-.26;scene.add(ground);
 const geo=new THREE.BoxGeometry(1,1,1);for(const b of blocks){const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:colors[b.material],roughness:.7}));mesh.position.set(b.x,b.y+.5,b.z);mesh.rotation.y=((b.rotation||0)%4)*Math.PI/2;scene.add(mesh);}
 const goal=world.goal;const marker=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.1,8),new THREE.MeshStandardMaterial({color:0xffe6bb}));pole.position.y=1.05;marker.add(pole);const banner=new THREE.Mesh(new THREE.ConeGeometry(.58,1,3),new THREE.MeshStandardMaterial({color:0xffa04e,emissive:0x663010}));banner.rotation.z=-Math.PI/2;banner.position.set(.4,1.8,0);marker.add(banner);marker.position.set(goal.x,goal.y,goal.z);scene.add(marker);
 const avatar=new THREE.Group();const torso=new THREE.Mesh(new THREE.BoxGeometry(.55,.8,.35),new THREE.MeshStandardMaterial({color:0xf3a386}));torso.position.y=1.14;avatar.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.28,14,12),new THREE.MeshStandardMaterial({color:0xf6d4c3}));head.position.y=1.83;avatar.add(head);const legs=new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.33),new THREE.MeshStandardMaterial({color:0x464362}));legs.position.y=.36;avatar.add(legs);scene.add(avatar);
 const keys=new Set();let vel=0,jumping=false,finished=false;const pressed=e=>{if(['w','a','s','d',' '].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());e.preventDefault();}};addEventListener('keydown',pressed);addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 const resize=()=>{const box=$('canvas');const w=box.clientWidth,h=box.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('canvas'));resize();
 let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!finished){const x=(keys.has('d')?1:0)-(keys.has('a')?1:0),z=(keys.has('s')?1:0)-(keys.has('w')?1:0),norm=Math.hypot(x,z)||1;const nx=THREE.MathUtils.clamp(avatar.position.x+x/norm*5.5*dt,-24,24),nz=THREE.MathUtils.clamp(avatar.position.z+z/norm*5.5*dt,-24,24);
 const collides=blocks.some(b=>Math.abs(nx-b.x)<.75&&Math.abs(nz-b.z)<.75&&avatar.position.y<b.y+1&&avatar.position.y+1.6>b.y);if(!collides){avatar.position.x=nx;avatar.position.z=nz;}
 const support=blocks.filter(b=>Math.abs(avatar.position.x-b.x)<.7&&Math.abs(avatar.position.z-b.z)<.7&&avatar.position.y>=b.y+.88&&avatar.position.y<=b.y+1.5).reduce((v,b)=>Math.max(v,b.y+1),0);
 if(keys.has(' ')&&!jumping&&avatar.position.y<=support+.08){vel=8;jumping=true;}vel-=18*dt;avatar.position.y+=vel*dt;if(avatar.position.y<=support){avatar.position.y=support;vel=0;jumping=false;}
 if(x||z)avatar.rotation.y=Math.atan2(x,-z);if(Math.hypot(avatar.position.x-goal.x,avatar.position.z-goal.z)<1.1&&Math.abs(avatar.position.y-goal.y)<2){finished=true;fail('🏁 World completed! Great job — return to Community Games to play another.');}}
 camera.position.lerp(new THREE.Vector3(avatar.position.x,avatar.position.y+5,avatar.position.z+8),Math.min(1,dt*7));camera.lookAt(avatar.position.x,avatar.position.y+1,avatar.position.z);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
