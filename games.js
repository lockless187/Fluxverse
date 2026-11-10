'use strict';
const COMMUNITY='cryptic-verse-community-worlds-v2';
const $=id=>document.getElementById(id);
function season(){const d=new Date(),m=d.getMonth()+1;return m===12&&[24,25].includes(d.getDate())?'christmas':m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';}
document.documentElement.dataset.season=season();
function getWorlds(){try{const data=JSON.parse(localStorage.getItem(COMMUNITY)||'[]');return Array.isArray(data)?data.filter(w=>w&&typeof w.name==='string'&&typeof w.id==='string'&&Array.isArray(w.blocks)):[];}catch{return [];}}
function render(){const host=$('games');host.replaceChildren();const filter=$('search-world').value.trim().toLowerCase();const list=getWorlds().filter(w=>w.name.toLowerCase().includes(filter));$('empty').hidden=list.length>0;
for(const w of list){const card=document.createElement('article');card.className='world';const cover=document.createElement('div');cover.className='cover';const symbol=document.createElement('span');symbol.textContent='▣';const badge=document.createElement('b');badge.textContent='3D WORLD · LOCAL PREVIEW';cover.append(symbol,badge);
const body=document.createElement('div');body.className='body';const title=document.createElement('h3');title.textContent=w.name;const description=document.createElement('p');description.textContent=`${w.blocks.length} blocks · Created ${new Date(w.createdAt||Date.now()).toLocaleDateString()}`;
const buttons=document.createElement('div');buttons.className='buttons';const play=document.createElement('a');play.href='play.html?id='+encodeURIComponent(w.id);play.textContent='▶ Play World';const edit=document.createElement('button');edit.textContent='✎ Edit in Studio';edit.onclick=()=>{localStorage.setItem('cryptic-verse-creator-draft-v1',JSON.stringify({schema:1,name:w.name,blocks:w.blocks,goal:w.goal}));location.href='creator.html';};
const remove=document.createElement('button');remove.textContent='Delete';remove.onclick=()=>{if(!confirm(`Delete local world “${w.name}”?`))return;localStorage.setItem(COMMUNITY,JSON.stringify(getWorlds().filter(x=>x.id!==w.id)));render();};buttons.append(play,edit,remove);body.append(title,description,buttons);card.append(cover,body);host.append(card);}}
$('search-world').addEventListener('input',render);render();
