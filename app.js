// FluxVerse Supabase settings: use Project URL + Publishable key only.
// NEVER put a service_role key, secret key, or database password in browser code.
const SUPABASE_URL = "https://btifqqcrifafhnnccqmq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_R5hNzUkxIjmAxRb1lYwFww_1vBVRHOo";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && SUPABASE_PUBLISHABLE_KEY.length > 20 && !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const $ = id => document.getElementById(id);
let user = null, profile = null, authMode = "login", games = [], activeGenre = "All", developerApplication = null, isFluxAdmin = false;
const wishlistIds = new Set();
const libraryIds = new Set();
const palettes = ["linear-gradient(135deg,#573b8c,#171329)","linear-gradient(135deg,#963e70,#24142f)","linear-gradient(135deg,#9a633d,#271a2b)","linear-gradient(135deg,#366c88,#171b35)","linear-gradient(135deg,#4e559d,#17152e)","linear-gradient(135deg,#6d438f,#21152e)"];
const genreIcons = {Action:"⚔",Adventure:"◉",RPG:"♜",Simulation:"⬡",Strategy:"♟",Sports:"⚽",Racing:"▧",Puzzle:"✣",Indie:"★",Shooter:"◎",Platformer:"▣",Family:"♧",Survival:"♨",Horror:"☠",MMO:"◉",Fighting:"✊",Casual:"☻",Sandbox:"⬢",Multiplayer:"♟",Early:"◷"};
const storeGenres = ["Action","Adventure","RPG","Simulation","Strategy","Sports","Racing","Puzzle","Indie","Shooter","Platformer","Family","Survival","Horror","MMO","Fighting","Casual","Sandbox","Multiplayer","Early Access","Free to Play"];
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),3000);}
function initials(s="P"){return s.trim().charAt(0).toUpperCase()||"P";}
function money(n){return Number(n)===0?"Free":`$${(Number(n)/100).toFixed(2)}`;}
function needLogin(){if(!user){openAuth("login");toast("Sign in to use this feature.");return false;}return true;}
function openAuth(mode){setMode(mode);$("modal").classList.remove("hidden");}
function closeAuth(){$("modal").classList.add("hidden");}
function setMode(mode){authMode=mode;document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("chosen",b.dataset.mode===mode));$("signup-fields").classList.toggle("hidden",mode!=="signup");$("auth-submit").textContent=mode==="login"?"Sign in ↗":"Create account ↗";$("auth-message").textContent="";}
function page(name){if(name==="store")loadGames();document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${name}`));document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));document.querySelectorAll(".side-link").forEach(b=>b.classList.toggle("selected",b.dataset.page===name));if(name==="library")loadLibrary();if(name==="wishlist")loadWishlist().then(renderWishlistPage);if(name==="community")loadPosts();if(name==="friends")loadFriends();if(name==="developer")loadDeveloperPortal();scrollTo({top:0,behavior:"smooth"});}
function coverFor(g){const raw=g.image_url||g.cover_url||g.thumbnail_url||g.banner_url||"";return /^https?:\/\//i.test(String(raw))?String(raw):"";}
function card(g){
 const name=String(g.title||'Untitled Game');
 const i=[...name].reduce((a,c)=>a+c.charCodeAt(0),0)%palettes.length;
 const sig=name.split(/\s+/).map(w=>w[0]).join('').slice(0,2);
 const id=String(g.id),free=Number(g.price_cents)===0;
 const owned=libraryIds.has(id),wished=wishlistIds.has(id),image=coverFor(g);
 const action=free?(owned?'In Library':'Add Free Game'):(wished?'♥ Saved':'♡ Wishlist');
 const primary=free?(owned?`<button class="small" type="button" data-download="${esc(id)}">↓ Download</button>`:`<button class="small" type="button" data-game="${esc(id)}" data-action="add">${action}</button>`):`<button class="small" type="button" data-game="${esc(id)}" data-action="wish">${action}</button>`;
 return `<article class="game fv-game-tile" data-card-id="${esc(id)}"><button type="button" class="cover fv-open-cover ${image?'has-image':''}" data-view-game="${esc(id)}" aria-label="View ${esc(name)} details" style="--cover:${palettes[i]}">${image?`<img src="${esc(image)}" alt="${esc(name)} cover" loading="lazy">`:`<b>${esc(sig)}</b>`}<span class="tag">${esc(g.genre||'Game')}</span></button><div class="game-info"><div class="meta"><span>${esc(g.genre||'Uncategorized')}</span><span>FLUXVERSE</span></div><button type="button" class="fv-game-title" data-view-game="${esc(id)}">${esc(name)}</button><p>${esc(g.description||'Discover your next adventure.')}</p><div class="game-bottom"><span class="price">${money(g.price_cents)}</span>${primary}</div><button type="button" class="fv-view-link" data-view-game="${esc(id)}">View game details →</button></div></article>`;
}
// Only administrator-approved Developer Portal releases are published in the public Store.
// The original seeded test games remain in Supabase but are hidden here (no data deletion).
let fxExpandedGenres=false;
let fxBrowseMode='all';
let fxHomeSelected=true;
function renderGenres(){
 const actual=[...new Set(games.map(g=>(g.genre||'').trim()).filter(Boolean))];
 const preferred=['Action','Adventure','RPG','Simulation','Strategy','Horror','Survival','Racing','Sports','Indie'];
 const genres=[...preferred,...storeGenres.filter(x=>!preferred.includes(x)),...actual.filter(x=>!storeGenres.some(y=>y.toLowerCase()===x.toLowerCase()))];
 $('genres').innerHTML=genres.map((genre,i)=>{
  const active=activeGenre.toLowerCase()===genre.toLowerCase();
  return `<button class="genre-chip ${active?'active':''} ${i>=10?'fx-extra-genre':''}" data-genre="${esc(genre)}" type="button">${esc(genre)}</button>`;
 }).join('');
 $('genres').classList.toggle('fx-show-all',fxExpandedGenres);
 $('more-genres').textContent=fxExpandedGenres?'Show Less':'View All';
}
function renderGames(){renderGenres();renderAll($('search').value);}
function fxStoreNavigate(target){
 if(!$('page-store').classList.contains('active'))page('store');
 if(target==='home'){
  fxHomeSelected=true;activeGenre='All';fxBrowseMode='all';$('search').value='';if($('fv-sort'))$('fv-sort').value='new';renderGames();
  window.scrollTo({top:0,behavior:'smooth'});return;
 }
 if(['all','free','new','deals','weekends'].includes(target)){
  fxHomeSelected=false;activeGenre='All';fxBrowseMode=target;
  if(target==='free')activeGenre='Free to Play';
  $('search').value='';
  renderGames();
  $('all-games').scrollIntoView({behavior:'smooth',block:'start'});
 }
}
function fvSetGenre(genre){
 fxHomeSelected=false;activeGenre=genre;fxBrowseMode='all';
 if(!$('page-store').classList.contains('active'))page('store');
 renderGames();$('all-games').scrollIntoView({behavior:'smooth',block:'start'});
}
function fvGetFilteredGames(term=''){
 const q=String(term||'').trim().toLowerCase();
 let list=games.filter(g=>{
  const matchesText=`${g.title||''} ${g.genre||''} ${g.description||''}`.toLowerCase().includes(q);
  const matchesGenre=activeGenre==='All'||(activeGenre==='Free to Play'?Number(g.price_cents)===0:(g.genre||'Uncategorized').toLowerCase()===activeGenre.toLowerCase());
  return matchesText&&matchesGenre;
 });
 if(fxBrowseMode==='free')list=list.filter(g=>Number(g.price_cents)===0);
 if(fxBrowseMode==='new'){const cutoff=Date.now()-90*24*60*60*1000;list=list.filter(g=>g.created_at&&new Date(g.created_at).getTime()>=cutoff);}
 // Real sales and timed free-weekend access require additional admin-managed schedules.
 if(fxBrowseMode==='deals'||fxBrowseMode==='weekends')list=[];
 const sort=$('fv-sort')?.value||'new';
 if(sort==='title')list.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));
 else if(sort==='price-low')list.sort((a,b)=>Number(a.price_cents||0)-Number(b.price_cents||0)||String(a.title||'').localeCompare(String(b.title||'')));
 else if(sort==='price-high')list.sort((a,b)=>Number(b.price_cents||0)-Number(a.price_cents||0)||String(a.title||'').localeCompare(String(b.title||'')));
 else list.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)||String(a.title||'').localeCompare(String(b.title||'')));
 return list;
}
function renderAll(term=''){
 const q=String(term||'').trim(),list=fvGetFilteredGames(q);
 const heading={all:'Games on FluxVerse',free:'Free to Play',new:'New Releases',deals:'Deals',weekends:'Free Weekends'}[fxBrowseMode]||'Games on FluxVerse';
 $('fx-games-heading').textContent=heading;
 $('fx-filter-description').textContent=q?`Results for “${q}”`:(activeGenre!=='All'&&fxBrowseMode==='all'?`${activeGenre} games`:'Browse real, approved releases.');
 $('game-count').textContent=`${list.length} ${list.length===1?'game':'games'}`;
 $('games').innerHTML=list.map(card).join('');
 $('fv-clear-search')?.classList.toggle('hidden',!q);
 const noPublished=games.length===0;
 $('fx-empty-state').classList.toggle('hidden',list.length>0);
 $('fx-live-list').classList.toggle('hidden',noPublished);
 $('fx-empty-state').classList.toggle('fx-empty-filtered',!noPublished && list.length===0);
 const msg=$('fx-empty-message');
 if(fxBrowseMode==='deals')msg.textContent='No deals are active right now. Discounts will be listed here when sale management is enabled.';
 else if(fxBrowseMode==='weekends')msg.textContent='There are no active free-weekend events. Timed game access is not enabled yet.';
 else if(q)msg.textContent=`No published games match “${q}”. Try a different search.`;
 else if(fxBrowseMode==='new')msg.textContent='No games have been published in the last 90 days. Check back when new releases arrive.';
 else if(activeGenre!=='All')msg.textContent=`There are no published ${activeGenre} games yet.`;
 else msg.textContent='Games will appear here automatically after they’re submitted and approved for FluxVerse.';
 if(!noPublished && !list.length){
  // Show the existing no-results status below the real catalog toolbar.
  $('fx-empty-state').classList.remove('hidden');
 }
 document.querySelectorAll('[data-store-nav]').forEach(el=>{
  if(el.classList.contains('fx-side-link')){
   const current=fxBrowseMode==='all'?'all':fxBrowseMode;
   el.classList.toggle('selected',(el.dataset.storeNav==='home'&&fxHomeSelected)||(el.dataset.storeNav===current&&!fxHomeSelected));
  }
 });
}
let fvCatalogBusy=false;
async function loadGames(){
 if(!db){games=[];renderGames();return;}
 if(fvCatalogBusy)return;
 fvCatalogBusy=true;
 try{
  // The optional public RPC returns approved games only. Fall back to v5's
  // existing published-listings behavior until STORE_ENHANCEMENTS.sql is run.
  let rows=null;
  const viaRpc=await db.rpc('fv_public_store_games');
  if(!viaRpc.error)rows=viaRpc.data;
  else {
   const fallback=await db.from('games').select('*').order('created_at',{ascending:false}).limit(1000);
   if(fallback.error)throw fallback.error;
   rows=(fallback.data||[]).filter(g=>g.source_submission_id!=null&&String(g.source_submission_id).trim()!=='');
  }
  games=(rows||[]).filter(g=>g&&g.id!=null);
  renderGames();
  if($('page-wishlist').classList.contains('active'))renderWishlistPage();
 }catch(error){toast('Game catalog unavailable: '+(error?.message||'Please try again.'));}
 finally{fvCatalogBusy=false;}
}
async function updateUser(){if(!user){profile=null;wishlistIds.clear();libraryIds.clear();$("auth-open").classList.remove("hidden");$("user-chip").classList.add("hidden");renderGames();$("library-list").innerHTML='<div class="empty">Sign in to see your library.</div>';return;}let {data}=await db.from("profiles").select("*").eq("id",user.id).maybeSingle();profile=data||{username:user.email?.split("@")[0],display_name:"Player"};$("auth-open").classList.add("hidden");$("user-chip").classList.remove("hidden");$("user-label").textContent=profile.display_name||profile.username;await Promise.all([loadLibrary(),loadWishlist()]);loadFriends();if(document.getElementById("page-developer").classList.contains("active"))loadDeveloperPortal();}
async function renderWishlistPage(){if(!user){$("wishlist-list").innerHTML='<div class="empty">Sign in to see your wishlist.</div>';return;}const list=games.filter(g=>wishlistIds.has(String(g.id)));$("wishlist-list").innerHTML=list.length?list.map(card).join(''):'<div class="empty">No wishlisted games yet. Browse All Games and save one!</div>';}
async function loadLibrary(){if(!user){libraryIds.clear();$("library-list").innerHTML='<div class="empty">Sign in to see your library.</div>';return;}let {data,error}=await db.from("library").select("game_id,games(*)").eq("user_id",user.id);if(error){$("library-list").textContent=error.message;return;}let rows=data||[];libraryIds.clear();rows.forEach(x=>libraryIds.add(String(x.game_id)));let list=rows.map(x=>x.games).filter(g=>g&&g.source_submission_id);$("library-list").innerHTML=list.length?list.map(card).join(""):'<div class="empty">Your library is waiting for its first game. Add a free game from the Store!</div>';renderGames();}
async function loadWishlist(){if(!user){wishlistIds.clear();renderGames();return;}let {data,error}=await db.from("wishlist").select("game_id").eq("user_id",user.id);if(error){toast("Couldn't load wishlist: "+error.message);return;}wishlistIds.clear();(data||[]).forEach(x=>wishlistIds.add(String(x.game_id)));renderGames();}
async function loadPosts(){if(!db){$("posts").innerHTML='<div class="empty">Connect Supabase to activate the community feed.</div>';return;}let {data,error}=await db.from("posts").select("id,content,created_at,profiles(username,display_name)").order("created_at",{ascending:false}).limit(50);if(error){$("posts").textContent=error.message;return;}$("posts").innerHTML=data.length?data.map(p=>`<article class="post"><b>${esc(p.profiles?.display_name||p.profiles?.username||"Player")} <small>@${esc(p.profiles?.username||"player")}</small></b><p>${esc(p.content)}</p></article>`).join(""):'<div class="empty">No posts yet. Start the conversation!</div>';}
async function loadFriends(){if(!user)return;$("requests").innerHTML='<div class="empty">Loading requests…</div>';$("friend-list").innerHTML='<div class="empty">Loading friends…</div>';let {data,error}=await db.from("friend_requests").select("id,sender_id,receiver_id,status,sender:profiles!friend_requests_sender_id_fkey(username,display_name),receiver:profiles!friend_requests_receiver_id_fkey(username,display_name)").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at",{ascending:false});if(error){$("requests").textContent=error.message;$("friend-list").textContent="Could not load friends.";return;}let pending=data.filter(x=>x.status==="pending"),accepted=data.filter(x=>x.status==="accepted");$("requests").innerHTML=pending.length?pending.map(r=>{let incoming=r.receiver_id===user.id,p=incoming?r.sender:r.receiver;return `<div class="person"><span class="avatar">${initials(p?.display_name||p?.username)}</span><div style="flex:1"><b>${esc(p?.display_name||p?.username||"Player")}</b><small>@${esc(p?.username||"player")}</small></div>${incoming?`<button class="small" data-accept="${r.id}">Accept</button>`:"Sent"}</div>`}).join(""):'<div class="empty">No pending requests.</div>';$("friend-list").innerHTML=accepted.length?accepted.map(r=>{let p=r.sender_id===user.id?r.receiver:r.sender;return `<div class="person"><span class="avatar">${initials(p?.display_name||p?.username)}</span><div><b>${esc(p?.display_name||p?.username||"Player")}</b><small>@${esc(p?.username||"player")}</small></div></div>`}).join(""):'<div class="empty">Your crew starts with a friend request.</div>';}

async function loadDeveloperPortal(){
 const logged=!!user;$('developer-login').classList.toggle('hidden',logged);$('developer-apply').classList.add('hidden');$('developer-status').classList.add('hidden');$('developer-tools').classList.add('hidden');$('admin-tools').classList.add('hidden');
 if(!logged)return;
 const appRes=await db.from('developer_applications').select('*').eq('user_id',user.id).maybeSingle();
 if(appRes.error){$('developer-status').classList.remove('hidden');$('developer-status').innerHTML='<b>Developer setup is not ready yet.</b><p class="muted">Run the FluxVerse Developer Portal SQL file in Supabase first. Details: '+esc(appRes.error.message)+'</p>';return;}
 developerApplication=appRes.data;
 const adminRes=await db.rpc('is_fluxverse_admin');isFluxAdmin=!adminRes.error&&adminRes.data===true;
 if(!developerApplication){$('developer-apply').classList.remove('hidden');}
 else if(developerApplication.status==='approved'){$('developer-tools').classList.remove('hidden');loadDeveloperSubmissions();}
 else{$('developer-status').classList.remove('hidden');$('developer-status').innerHTML=`<div class="section-title"><h2>Application ${esc(developerApplication.status)}</h2><span class="status-pill">${esc(developerApplication.status)}</span></div><p>Studio: <b>${esc(developerApplication.studio_name)}</b></p><p class="muted">${developerApplication.status==='pending'?'Your application is waiting for review. You can return here to check its status.':'Your application was not approved. You can contact FluxVerse support if you believe this was a mistake.'}</p>`;}
 if(isFluxAdmin){$('admin-tools').classList.remove('hidden');loadAdminQueue();}
}
// ---- FluxVerse Developer Suite v3 ----
const FV_MEDIA_BUCKET = 'fv-game-media';
const FV_BUILD_BUCKET = 'fv-game-builds';
const FV_IMAGE_MAX = 6 * 1024 * 1024;
const FV_ZIP_MAX = 45 * 1024 * 1024; // Supabase direct upload ceiling (conservative)
const FV_R2_MAX = 500 * 1024 * 1024;
// Optional: set this to your separate private Cloudflare R2 Worker URL after deployment.
const FV_R2_API = '';

let fvAttachSubmissionId = null;
let fvBusy = false;
let fvAssetsBySubmission = new Map();

function fvStatus(message){
 const el = $('developer-upload-status'); if(el) el.textContent = message;
}
function fvFileSize(bytes){return bytes < 1048576 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';}
function fvSafeHttpUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
function fvFileExt(file){return (file?.name?.split('.').pop() || '').toLowerCase();}
function fvCheckImage(file){
 if(!file) throw new Error('Choose a cover or screenshot image.');
 const ext = fvFileExt(file);
 if(!['jpg','jpeg','png','webp'].includes(ext)) throw new Error('Images must be JPG, PNG or WEBP.');
 if(file.size > FV_IMAGE_MAX) throw new Error('Each image must be 6 MB or smaller.');
 return {ext:ext==='jpeg'?'jpg':ext,mime:ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg'};
}
function fvCheckBuild(file){
 if(!file || fvFileExt(file)!=='zip') throw new Error('Choose a .zip game file.');
 const ceiling = FV_R2_API ? FV_R2_MAX : FV_ZIP_MAX;
 if(!file.size || file.size > ceiling) throw new Error('Game ZIPs must be between 1 byte and '+(FV_R2_API?'500':'45')+' MB with your current storage setup.');
}
function fvPublicMedia(path){return path ? db.storage.from(FV_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl : '';}
async function fvLoadAssets(rows){
 const ids=(rows||[]).map(r=>String(r.id));
 if(!ids.length) return new Map();
 const {data,error}=await db.from('fv_game_assets').select('*').in('submission_id', ids);
 if(error) throw new Error('Developer Suite SQL may be missing: '+error.message);
 return new Map((data||[]).map(a=>[a.submission_id,a]));
}
async function fvSaveAssetPatch(submissionId, fields){
 const {data:previous,error:readError} = await db.from('fv_game_assets').select('*').eq('submission_id',String(submissionId)).maybeSingle();
 if(readError) throw readError;
 const payload={...(previous||{}),...fields,submission_id:String(submissionId),owner_id:user.id,updated_at:new Date().toISOString()};
 const {error}=await db.from('fv_game_assets').upsert(payload,{onConflict:'submission_id'});
 if(error) throw error;
}
async function fvUploadImage(submissionId,file,kind){
 const info=fvCheckImage(file);
 const path=`${user.id}/${submissionId}/${kind}-${crypto.randomUUID()}.${info.ext}`;
 const {error}=await db.storage.from(FV_MEDIA_BUCKET).upload(path,file,{upsert:false,contentType:info.mime,cacheControl:'3600'});
 if(error) throw new Error(`${kind} upload failed: ${error.message}`);
 return path;
}
async function fvR2Request(path,opts={}){
 if(!FV_R2_API) throw new Error('500 MB uploads require Cloudflare R2 setup.');
 const {data:{session},error:sessionError} = await db.auth.getSession();
 if(sessionError || !session?.access_token) throw new Error('Sign in again to continue.');
 const response=await fetch(FV_R2_API.replace(/\/$/,'')+path,{
  ...opts, headers:{'Authorization':'Bearer '+session.access_token,...(opts.headers||{})}
 });
 if(!response.ok){let message='Upload service error ('+response.status+')';try{let json=await response.json();message=json.error||message;}catch{}throw new Error(message);}
 if(response.headers.get('content-type')?.includes('application/json'))return response.json();
 return response;
}
async function fvUploadR2Build(submissionId,file){
 const init=await fvR2Request('/uploads/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId,bytes:file.size,filename:file.name})});
 const partSize=init.partSize,parts=[];const chunks=Math.ceil(file.size/partSize);
 try{
  for(let i=0;i<chunks;i++){
   const start=i*partSize;
   const blob=file.slice(start,Math.min(start+partSize,file.size));
   let uploaded;
   for(let attempt=1;attempt<=3;attempt++){
    try{
     uploaded=await fvR2Request('/uploads/part?uploadId='+encodeURIComponent(init.uploadId)+'&partNumber='+(i+1),{
      method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:blob
     });break;
    }catch(err){if(attempt===3)throw err;}
   }
   parts.push(uploaded);
   fvStatus('Uploading ZIP to Cloudflare R2: '+Math.round(((i+1)/chunks)*100)+'% ('+(i+1)+'/'+chunks+' parts)');
  }
  await fvR2Request('/uploads/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:init.uploadId,parts})});
  return 'r2:'+init.key;
 }catch(err){
  try{await fvR2Request('/uploads/abort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:init.uploadId})});}catch{}
  throw err;
 }
}
async function fvR2DownloadTicket(args){
 const out=await fvR2Request('/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)});
 const link=FV_R2_API.replace(/\/$/,'')+'/files/'+encodeURIComponent(out.ticket);
 // Open URL directly to stream a large ZIP; do NOT buffer 500 MB in the browser's JS heap.
 const a=document.createElement('a');a.href=link;a.target='_self';a.rel='noopener noreferrer';
 document.body.appendChild(a);a.click();a.remove();
}
async function fvUploadBuild(submissionId,file){
 fvCheckBuild(file);
 if(FV_R2_API) return fvUploadR2Build(submissionId,file);
 const path=`${user.id}/${submissionId}/build-${crypto.randomUUID()}.zip`;
 const {error}=await db.storage.from(FV_BUILD_BUCKET).upload(path,file,{upsert:false,contentType:'application/zip'});
 if(error) throw new Error('ZIP upload failed: '+error.message);
 return path;
}
async function fvAttachFiles(submissionId,{cover=null,build=null,shots=[]}={}){
 let position=0;
 const count=Number(!!cover)+Number(!!build)+shots.length;
 if(cover){fvStatus(`Uploading cover (${++position}/${count})…`);const path=await fvUploadImage(submissionId,cover,'cover');await fvSaveAssetPatch(submissionId,{cover_path:path});}
 if(build){fvStatus(`Uploading ZIP (${++position}/${count}, ${fvFileSize(build.size)})…`);const path=await fvUploadBuild(submissionId,build);await fvSaveAssetPatch(submissionId,{build_path:path,build_filename:build.name.slice(0,160),build_bytes:build.size});}
 if(shots.length){
   const {data}=await db.from('fv_game_assets').select('screenshot_paths').eq('submission_id',String(submissionId)).maybeSingle();
   let paths=Array.isArray(data?.screenshot_paths)?[...data.screenshot_paths]:[];
   for(const file of shots){fvStatus(`Uploading screenshot (${++position}/${count})…`);paths.push(await fvUploadImage(submissionId,file,'shot'));}
   await fvSaveAssetPatch(submissionId,{screenshot_paths:paths.slice(-3)});
 }
}
async function fvDownloadBuild(gameId){
 if(!needLogin()) return;
 try{
   toast('Generating private download link…');
   const {data:path,error}=await db.rpc('fv_request_download',{p_game_id:String(gameId)});
   if(error) throw error;
   if(path.startsWith('r2:')){await fvR2DownloadTicket({gameId:String(gameId)});toast('Private download started.');return;}
   const {data,error:signError}=await db.storage.from(FV_BUILD_BUCKET).createSignedUrl(path,120);
   if(signError) throw signError;
   const a=document.createElement('a');a.href=data.signedUrl;a.rel='noopener noreferrer';a.target='_blank';
   document.body.appendChild(a);a.click();a.remove();
   toast('Your download link is ready (valid for 2 minutes).');
 }catch(err){toast(err.message||'Download unavailable.');}
}
async function fvReviewDownload(submissionId){
 if(!isFluxAdmin)return;
 const asset=fvAssetsBySubmission.get(String(submissionId));
 if(!asset?.build_path){toast('There is no ZIP file attached.');return;}
 if(asset.build_path.startsWith('r2:')){try{await fvR2DownloadTicket({submissionId:String(submissionId)});}catch(err){toast(err.message||'Could not open review build.');}return;}
 const {data,error}=await db.storage.from(FV_BUILD_BUCKET).createSignedUrl(asset.build_path,120);
 if(error){toast(error.message);return;}
 window.open(data.signedUrl,'_blank','noopener,noreferrer');
}
async function fvLoadStats(){
 const el=$('developer-stats');if(!el)return;
 const {data,error}=await db.rpc('fv_developer_stats');
 if(error){el.innerHTML=`<div class="dev-metric"><b>—</b><span>${esc(error.message)}</span></div>`;return;}
 const entries=[['submitted','Submitted'],['pending','Pending'],['approved','Published'],['rejected','Rejected'],['claims','Free claims'],['download_link_requests','Download links']];
 el.innerHTML=entries.map(([key,title])=>`<div class="dev-metric"><b>${Number(data?.[key]||0).toLocaleString()}</b><span>${title}</span></div>`).join('');
}
async function loadDeveloperSubmissions(){
 const {data,error}=await db.from('developer_game_submissions').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error){$('developer-submissions').textContent=error.message;return;}
 const rows=data||[];
 let assets;
 try{assets=await fvLoadAssets(rows);}catch(err){$('developer-submissions').textContent=err.message;return;}
 fvAssetsBySubmission=new Map([...fvAssetsBySubmission,...assets]);
 $('developer-submissions').innerHTML=rows.length?rows.map(g=>{
  const a=assets.get(String(g.id)); const pending=g.status==='pending';
  const image=a?.cover_path?`<img class="dev-release-cover" src="${esc(fvPublicMedia(a.cover_path))}" alt="Game cover">`:'';
  const files=`${a?.cover_path?'✓ Cover':'⚠ Cover missing'} · ${a?.build_path?`✓ ZIP (${fvFileSize(a.build_bytes||0)})`:'⚠ ZIP missing'} · ${a?.screenshot_paths?.length||0} screenshot(s)`;
  return `<article class="dev-release">${image}<div class="dev-release-info"><div class="dev-release-title"><b>${esc(g.title)}</b><span class="status-pill ${g.status==='approved'?'approved':''}">${esc(g.status)}</span></div><p>${esc(g.description||'')}</p><small>${esc(g.genre||'Game')} · ${money(g.price_cents)} · v${esc(a?.release_version||'1.0.0')}</small><small>${files}</small>${g.review_notes?`<p class="dev-review-note"><b>Reviewer:</b> ${esc(g.review_notes)}</p>`:''}${pending?`<div class="admin-actions"><button class="small" data-attach="cover" data-submission="${esc(String(g.id))}">Attach cover</button><button class="small" data-attach="build" data-submission="${esc(String(g.id))}">Attach ZIP</button><button class="small" data-attach="shots" data-submission="${esc(String(g.id))}">Add screenshots</button></div>`:g.status==='approved'?'<small>✓ Published in All Games. Free editions can be claimed and downloaded.</small>':''}</div></article>`;
 }).join(''):'<p class="muted">No game submissions yet. Upload your first release above.</p>';
 fvLoadStats();
}
async function loadAdminQueue(){
 const [apps,gamesRes]=await Promise.all([
  db.from('developer_applications').select('*').eq('status','pending').order('created_at'),
  db.from('developer_game_submissions').select('*').eq('status','pending').order('created_at')
 ]);
 $('admin-applications').innerHTML=apps.error?esc(apps.error.message):(apps.data||[]).length?apps.data.map(a=>`<div class="admin-item"><b>${esc(a.studio_name)}</b><p>${esc(a.about)}<br>${esc(a.website||'No website')} · Developer ${esc(a.user_id)}</p><div class="admin-actions"><button class="small" data-admin-app="${esc(String(a.id))}" data-status="approved">Approve</button><button class="danger-button" data-admin-app="${esc(String(a.id))}" data-status="rejected">Reject</button></div></div>`).join(''):'<p class="muted">No pending developer applications.</p>';
 const rows=gamesRes.data||[];
 let assets=new Map();
 try{assets=await fvLoadAssets(rows);}catch(err){$('admin-games').textContent=err.message;return;}
 fvAssetsBySubmission=new Map([...fvAssetsBySubmission,...assets]);
 $('admin-games').innerHTML=gamesRes.error?esc(gamesRes.error.message):rows.length?rows.map(g=>{
  const a=assets.get(String(g.id)); const cover=a?.cover_path?fvPublicMedia(a.cover_path):'';
  const screenshots=(a?.screenshot_paths||[]).map(path=>`<a href="${esc(fvPublicMedia(path))}" target="_blank" rel="noopener noreferrer">Screenshot</a>`).join(' · ');
  const canApprove=!!(a?.cover_path&&a?.build_path);
  return `<article class="dev-admin-release"><div class="dev-admin-media">${cover?`<img src="${esc(cover)}" alt="Game cover">`:''}</div><div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><p class="muted">${esc(g.genre)} · ${money(g.price_cents)} · Developer ${esc(g.user_id)}<br>v${esc(a?.release_version||'?')} · OS ${esc(a?.supported_os||'Unknown')} · ${a?.build_path?`ZIP ${fvFileSize(a.build_bytes||0)}`:'No ZIP'}<br>Requirements: ${esc(a?.requirements||'Not provided')}<br>Release notes: ${esc(a?.release_notes||'Not provided')}</p>${screenshots?`<p>${screenshots}</p>`:''}${fvSafeHttpUrl(a?.trailer_url)?`<p><a href="${esc(fvSafeHttpUrl(a.trailer_url))}" target="_blank" rel="noopener noreferrer">Trailer</a></p>`:''}<div class="admin-actions">${a?.build_path?`<button class="small" data-review-download="${esc(String(g.id))}">Review ZIP ↓</button>`:''}<button class="small" data-admin-review="${esc(String(g.id))}" data-decision="approved" ${canApprove?'':'disabled title="Cover and ZIP required"'}>Approve &amp; publish</button><button class="danger-button" data-admin-review="${esc(String(g.id))}" data-decision="rejected">Reject</button></div>${!canApprove?'<small class="muted">Waiting for developer to finish uploads.</small>':''}</div></article>`;
 }).join(''):'<p class="muted">No pending game submissions.</p>';
}


// --------- Store v6: real, approved game browsing ---------
let fvOpenGameId=null,fvGalleryIndex=0,fvGalleryImages=[],fvDetailMetadata=null,fvFocusReturn=null;
function fvShowInfo(title,message){
 $('fv-info-title').textContent=title;
 $('fv-info-message').textContent=message;
 $('fv-info-modal').classList.remove('hidden');
 $('fv-info-modal').querySelector('.fv-info-dialog').focus();
}
function fvCloseInfo(){$('fv-info-modal').classList.add('hidden');}
function fvPriceState(g){
 const id=String(g.id),free=Number(g.price_cents)===0;
 if(free){
  if(libraryIds.has(id))return `<button type="button" id="fv-game-download" class="fv-dialog-button">↓ Download game</button><span class="fv-action-note">You own this free game</span>`;
  return `<button type="button" id="fv-game-claim" class="fv-dialog-button">Add free game to Library</button>`;
 }
 return `<button type="button" id="fv-game-wish" class="fv-dialog-button">${wishlistIds.has(id)?'♥ Remove from Wishlist':'♡ Add to Wishlist'}</button><button type="button" id="fv-game-checkout" class="fv-dialog-secondary">Purchases coming later</button>`;
}
function fvGalleryHtml(){
 if(!fvGalleryImages.length)return '';
 return `<div class="fv-detail-gallery"><div class="fv-gallery-stage" id="fv-gallery-stage"></div>${fvGalleryImages.length>1?`<div class="fv-gallery-thumbs">${fvGalleryImages.map((url,i)=>`<button type="button" class="fv-gallery-thumb ${i===fvGalleryIndex?'active':''}" data-gallery-index="${i}" aria-label="View screenshot ${i+1}"><img src="${esc(url)}" alt="Screenshot thumbnail ${i+1}" loading="lazy"></button>`).join('')}</div>`:''}</div>`;
}
function fvRefreshGallery(){
 const stage=$('fv-gallery-stage');if(!stage||!fvGalleryImages.length)return;
 const url=fvGalleryImages[fvGalleryIndex]||fvGalleryImages[0];
 stage.innerHTML=`<img src="${esc(url)}" alt="Screenshot ${fvGalleryIndex+1} of ${fvGalleryImages.length}" loading="lazy">`;
 document.querySelectorAll('.fv-gallery-thumb').forEach((b,i)=>b.classList.toggle('active',i===fvGalleryIndex));
}
async function fvFetchPublicMetadata(gameId){
 if(!db)return null;
 try{
  const {data,error}=await db.rpc('fv_public_game_details',{p_game_id:String(gameId)});
  if(error)return null;
  return data&&typeof data==='object'?data:null;
 }catch{return null;}
}
function fvSafePublicShot(path){
 if(typeof path!=='string'||path.length>300)return '';
 if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/(cover|shot)-[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(path))return '';
 return fvPublicMedia(path);
}
function fvUpdateGameActions(){
 const g=games.find(x=>String(x.id)===fvOpenGameId);
 const section=$('fv-detail-actions');
 if(g&&section)section.innerHTML=fvPriceState(g);
}
async function fvOpenGame(gameId,{fromUrl=false}={}){
 const g=games.find(x=>String(x.id)===String(gameId));
 if(!g){fvShowInfo('Game not available','This game has not been published on FluxVerse or is no longer available.');return;}
 fvFocusReturn=document.activeElement;
 fvOpenGameId=String(g.id);fvGalleryIndex=0;fvDetailMetadata=null;
 const img=coverFor(g),free=Number(g.price_cents)===0;
 $('fv-game-detail-content').innerHTML=`<div class="fv-detail-header">${img?`<div class="fv-detail-cover"><img src="${esc(img)}" alt="${esc(g.title)} cover"></div>`:'<div class="fv-detail-cover fv-detail-placeholder">✦</div>'}<div class="fv-detail-overview"><span class="fv-detail-eyebrow">PUBLISHED ON FLUXVERSE</span><h2 id="fv-detail-title">${esc(g.title)}</h2><div class="fv-detail-badges"><span>${esc(g.genre||'Game')}</span><span>${free?'Free to Play':'Paid listing'}</span></div><div class="fv-detail-price">${money(g.price_cents)}${!free?'<small>Checkout not enabled</small>':''}</div><div class="fv-detail-actions" id="fv-detail-actions">${fvPriceState(g)}</div><button type="button" class="fv-share" id="fv-copy-link">↗ Copy game link</button></div></div><div class="fv-detail-columns"><section><h3>About this game</h3><p id="fv-detail-description">${esc(g.description||'No description added yet.')}</p><div id="fv-gallery-wrapper"></div></section><section class="fv-specs"><h3>Game information</h3><p><b>Genre</b> ${esc(g.genre||'Game')}</p><p><b>Availability</b> ${free?'Free for registered players':'Listing only — purchases disabled'}</p><div id="fv-more-metadata"><p><b>Release information</b> Loading…</p></div></section></div>`;
 $('fv-game-modal').classList.remove('hidden');
 $('fv-game-modal').querySelector('.fv-game-dialog').focus();
 document.body.classList.add('fv-modal-open');
 if(!fromUrl&&(location.protocol==='https:'||location.protocol==='http:')){const u=new URL(window.location.href);u.searchParams.set('game',String(gameId));history.pushState({fvGame:String(gameId)},'',u.pathname+u.search+u.hash);}
 const info=await fvFetchPublicMetadata(gameId);
 if(fvOpenGameId!==String(gameId))return;
 fvDetailMetadata=info;
 const more=$('fv-more-metadata');if(!more)return;
 if(info){
  const shots=Array.isArray(info.screenshot_paths)?info.screenshot_paths.map(fvSafePublicShot).filter(Boolean):[];
  fvGalleryImages=shots.slice(0,5);
  const safeTrailer=fvSafeHttpUrl(info.trailer_url||'');
  const url=safeTrailer&&safeTrailer.startsWith('https:')?safeTrailer:'';
  more.innerHTML=`<p><b>Studio</b> ${esc(info.studio_name||'Independent developer')}</p><p><b>Version</b> ${esc(info.release_version||'1.0.0')}</p><p><b>Supported OS</b> ${esc(info.supported_os||'Windows')}</p>${info.requirements?`<h3>System requirements</h3><p class="fv-long-text">${esc(info.requirements)}</p>`:''}${info.release_notes?`<h3>Release notes</h3><p class="fv-long-text">${esc(info.release_notes)}</p>`:''}${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="fv-external-link">Watch the developer trailer ↗</a>`:''}`;
  if(fvGalleryImages.length){$('fv-gallery-wrapper').innerHTML='<h3>Screenshots</h3>'+fvGalleryHtml();fvRefreshGallery();}
 }else more.innerHTML='<p>Additional release information will appear when the game publisher provides it.</p>';
}
function fvCloseGame({fromUrl=false}={}){
 $('fv-game-modal').classList.add('hidden');
 document.body.classList.remove('fv-modal-open');
 fvOpenGameId=null;fvGalleryImages=[];
 if(!fromUrl&&(location.protocol==='https:'||location.protocol==='http:')){const u=new URL(window.location.href);if(u.searchParams.has('game')){u.searchParams.delete('game');history.replaceState({},'',u.pathname+u.search+u.hash);}}
 if(fvFocusReturn?.isConnected)fvFocusReturn.focus();
}
async function fvShareCurrentGame(){
 if(!fvOpenGameId)return;
 const u=new URL(window.location.href);u.searchParams.set('game',fvOpenGameId);
 try{await navigator.clipboard.writeText(u.href);toast('Game link copied!');}
 catch{fvShowInfo('Share game link',u.href);}
}
async function fvPerformGameAction(id,action){
 if(!needLogin())return;
 const game=games.find(x=>String(x.id)===String(id));
 if(!game){toast('This game is not available.');return;}
 const gameId=String(id);
 if(action==='add'){
  if(Number(game.price_cents)!==0){fvShowInfo('Purchases not ready','Only free games can be added to your library right now.');return;}
  if(libraryIds.has(gameId)){toast('Already in your Library.');return;}
  const {error}=await db.rpc('fv_claim_free_game',{p_game_id:gameId});
  if(error){toast(error.message);return;}
  libraryIds.add(gameId);toast('Free game added to Library!');
  await loadLibrary();
 }else if(action==='wish'){
  if(wishlistIds.has(gameId)){
   const {error}=await db.from('wishlist').delete().eq('user_id',user.id).eq('game_id',gameId);
   if(error){toast(error.message);return;}
   wishlistIds.delete(gameId);toast('Removed from Wishlist.');
  }else{
   const {error}=await db.from('wishlist').upsert({user_id:user.id,game_id:gameId});
   if(error){toast(error.message);return;}
   wishlistIds.add(gameId);toast('Added to Wishlist!');
  }
  if($('page-wishlist').classList.contains('active'))renderWishlistPage();
 }
 renderGames();fvUpdateGameActions();
}
async function init(){if(!db){$("setup").classList.remove("hidden");$("status").textContent="Not connected";games=[];renderGames();$("posts").innerHTML='<div class="empty">Connect Supabase to activate the community feed.</div>';return;}let {error}=await db.from("games").select("id").limit(1);$("status").textContent=error?"Database issue":"Connected";await loadGames();const deepId=new URLSearchParams(location.search).get('game');if(deepId)fvOpenGame(deepId,{fromUrl:true});let {data}=await db.auth.getSession();user=data.session?.user||null;await updateUser();loadPosts();db.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;setTimeout(updateUser,0);});}
document.addEventListener("click",async e=>{
 if(e.target.closest('[data-close-game]')){fvCloseGame();return;}
 if(e.target.closest('[data-close-info]')){fvCloseInfo();return;}
 const view=e.target.closest('[data-view-game]');
 if(view){await fvOpenGame(view.dataset.viewGame);return;}
 const gallery=e.target.closest('[data-gallery-index]');
 if(gallery){fvGalleryIndex=Number(gallery.dataset.galleryIndex);fvRefreshGallery();return;}
 if(e.target.closest('#fv-copy-link')){fvShareCurrentGame();return;}
 if(e.target.closest('#fv-reset-filters')){fxHomeSelected=false;activeGenre='All';fxBrowseMode='all';$('search').value='';$('fv-sort').value='new';renderGames();return;}
 if(e.target.closest('#fv-clear-search')){$('search').value='';renderGames();$('search').focus();return;}
 if(e.target.closest('#fv-game-claim')){const g=games.find(x=>String(x.id)===fvOpenGameId);if(g)await fvPerformGameAction(String(g.id),'add');return;}
 if(e.target.closest('#fv-game-wish')){if(fvOpenGameId)await fvPerformGameAction(fvOpenGameId,'wish');return;}
 if(e.target.closest('#fv-game-download')){if(fvOpenGameId)await fvDownloadBuild(fvOpenGameId);return;}
 if(e.target.closest('#fv-game-checkout')){fvShowInfo('Purchases aren’t active yet','Paid game checkout is not available on FluxVerse yet. Save this game to your Wishlist; no payment has been taken.');return;}

 const storeNav=e.target.closest('[data-store-nav]');if(storeNav){fxStoreNavigate(storeNav.dataset.storeNav);document.getElementById('discover-menu')?.classList.add('hidden');return;}
 if(e.target.closest('#watch-trailer')){fvShowInfo('Game trailers','Trailers will become available here when approved developers add them to their game pages. Explore the catalog to see available releases.');return;}
 if(e.target.closest('#discover-toggle')){const menu=$('discover-menu');menu.classList.toggle('hidden');$('discover-toggle').setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));return;}
 if(e.target.closest('#notifications-button')){page('friends');toast('Friend requests are in your Friends tab.');return;}
 if(e.target.closest('#more-genres')){fxExpandedGenres=!fxExpandedGenres;renderGenres();return;}
 if(e.target.closest('#genre-toggle')){const genres=$('genres'),opening=genres.classList.contains('collapsed');genres.classList.toggle('collapsed',!opening);$('genre-toggle').setAttribute('aria-expanded',String(opening));return;}
 const genrePick=e.target.closest('[data-genre]');if(genrePick){fvSetGenre(genrePick.dataset.genre);return;}

 const download=e.target.closest('[data-download]');
 if(download){await fvDownloadBuild(download.dataset.download);return;}
 const reviewDownload=e.target.closest('[data-review-download]');
 if(reviewDownload){await fvReviewDownload(reviewDownload.dataset.reviewDownload);return;}
 const attach=e.target.closest('[data-attach]');
 if(attach){if(!needLogin())return;fvAttachSubmissionId=attach.dataset.submission;
    const input=$('attach-'+attach.dataset.attach);if(input){input.value='';input.click();}return;}
 const review=e.target.closest('[data-admin-review]');
 if(review){
  if(!isFluxAdmin){toast('Admin only.');return;}
  const id=review.dataset.adminReview;const decision=review.dataset.decision;
  if(decision==='approved'&&!confirm('Have you inspected the images, game ownership and ZIP contents? Approval will publish this listing.'))return;
  let note=decision==='rejected'?prompt('Reason for rejection (shown to developer):','Please provide a safe, complete build and accurate game details.'):prompt('Optional approval note:','');
  if(note===null)return;
  review.disabled=true;
  const {error}=await db.rpc('fv_review_submission',{p_submission_id:String(id),p_decision:decision,p_notes:note||''});
  review.disabled=false;
  if(error){toast(error.message);return;}
  toast(decision==='approved'?'Game approved and published!':'Submission rejected with feedback.');
  await loadAdminQueue();await loadGames();return;
 }
if(e.target.closest("#genre-toggle")||e.target.closest("#more-genres")){const box=$("genres"),toggle=$("genre-toggle");const opening=box.classList.contains("collapsed");box.classList.toggle("collapsed",!opening);toggle.setAttribute("aria-expanded",String(opening));$("genre-chevron").textContent=opening?"⌃":"⌄";return;}let n=e.target.closest("[data-page]");if(n){page(n.dataset.page);return;}let sc=e.target.closest("[data-scroll]");if(sc){document.getElementById(sc.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"});return;}let go=e.target.closest("[data-go]");if(go){page(go.dataset.go);return;}if(e.target.id==="auth-open"){openAuth("login");return;}if(e.target.matches("[data-close]")){closeAuth();return;}let m=e.target.closest("[data-mode]");if(m){setMode(m.dataset.mode);return;}let g=e.target.closest('[data-game]');
if(g){await fvPerformGameAction(g.dataset.game,g.dataset.action);return;}
let a=e.target.closest("[data-accept]");if(a){let {error}=await db.from("friend_requests").update({status:"accepted"}).eq("id",a.dataset.accept);toast(error?error.message:"Friend request accepted!");loadFriends();return;}let s=e.target.closest("[data-send]");if(s){let {error}=await db.from("friend_requests").insert({sender_id:user.id,receiver_id:s.dataset.send});toast(error?error.message:"Friend request sent!");loadFriends();return;}if(e.target.id==="developer-signin"){openAuth("login");return;}let aa=e.target.closest("[data-admin-app]");if(aa){let {error}=await db.from("developer_applications").update({status:aa.dataset.status,reviewed_at:new Date().toISOString()}).eq("id",aa.dataset.adminApp);toast(error?error.message:"Application "+aa.dataset.status+".");loadDeveloperPortal();return;}let ag=e.target.closest("[data-admin-game]");if(ag){let {error}=await db.from("developer_game_submissions").update({status:ag.dataset.status,reviewed_at:new Date().toISOString()}).eq("id",ag.dataset.adminGame);toast(error?error.message:"Game submission "+ag.dataset.status+".");loadAdminQueue();return;}if(e.target.id==="sign-out"){await db.auth.signOut();toast("Signed out.");}});
$("auth-form").addEventListener("submit",async e=>{e.preventDefault();if(!db){toast("Add Supabase settings to app.js first.");return;}let email=$("email").value.trim(),password=$("password").value,msg=$("auth-message");msg.textContent="Please wait…";let result;if(authMode==="signup"){let username=$("username").value.trim().toLowerCase(),display_name=$("display").value.trim()||username;if(!/^[a-z0-9_]{3,24}$/.test(username)){msg.textContent="Username: 3–24 letters, numbers or underscores.";return;}result=await db.auth.signUp({email,password,options:{data:{username,display_name}}});}else result=await db.auth.signInWithPassword({email,password});if(result.error){msg.textContent=result.error.message;return;}if(authMode==="signup"&&!result.data.session){msg.textContent="Account created! Check your email to confirm, then sign in.";return;}closeAuth();$("auth-form").reset();toast("Welcome to FluxVerse!");});
$('search').addEventListener('input',e=>{fxHomeSelected=false;fxBrowseMode='all';activeGenre='All';renderGenres();renderAll(e.target.value);if(!$('page-store').classList.contains('active'))page('store');});
$('fv-sort').addEventListener('change',()=>renderGames());
$("search").addEventListener("keydown",e=>{if(e.key==='Enter'){e.preventDefault();page('store');$('all-games').scrollIntoView({behavior:'smooth'});}});
$("post-form").addEventListener("submit",async e=>{e.preventDefault();if(!needLogin())return;let content=$("post-text").value.trim();if(!content)return;let {error}=await db.from("posts").insert({user_id:user.id,content});if(error)toast(error.message);else{$("post-text").value="";toast("Your post is live!");loadPosts();}});
$("friend-form").addEventListener("submit",async e=>{e.preventDefault();if(!needLogin())return;let name=$("friend-name").value.trim().replace(/^@/,"");let {data,error}=await db.from("profiles").select("id,username,display_name").ilike("username",name).limit(5);if(error){$("friend-results").textContent=error.message;return;}let found=(data||[]).filter(p=>p.id!==user.id);$("friend-results").innerHTML=found.length?found.map(p=>`<div class="person"><span class="avatar">${initials(p.display_name)}</span><div style="flex:1"><b>${esc(p.display_name)}</b><small>@${esc(p.username)}</small></div><button class="small" data-send="${p.id}">Add friend</button></div>`).join(""):'<div class="empty">No player found with that exact username.</div>';});

$("developer-application-form").addEventListener("submit",async e=>{e.preventDefault();if(!needLogin())return;let payload={user_id:user.id,studio_name:$("dev-studio").value.trim(),website:$("dev-website").value.trim()||null,about:$("dev-about").value.trim()};let {error}=await db.from("developer_applications").insert(payload);if(error){toast(error.message);return;}toast("Developer application submitted!");$("developer-application-form").reset();loadDeveloperPortal();});
$("developer-game-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!needLogin()||fvBusy)return;
 const cover=$('submission-cover').files[0],build=$('submission-build').files[0];
 const shots=[...$('submission-shots').files];
 try{
  fvCheckImage(cover);fvCheckBuild(build);
  if(shots.length>3)throw new Error('Please choose at most 3 screenshots.');
  shots.forEach(fvCheckImage);
  if(!$('submission-rights').checked)throw new Error('Confirm you have the rights to distribute the game.');
  if($('submission-trailer').value.trim()&&!fvSafeHttpUrl($('submission-trailer').value.trim()))throw new Error('Trailer URL must use https:// or http://.');
  const price=Math.round(Number($('submission-price').value)*100);
  if(!Number.isSafeInteger(price)||price<0||price>999900)throw new Error('Enter a valid price from $0 to $9,999 CAD.');
  fvBusy=true;$('developer-submit').disabled=true;
  fvStatus('Creating your pending review submission…');
  const payload={user_id:user.id,title:$('submission-title').value.trim(),genre:$('submission-genre').value.trim(),description:$('submission-description').value.trim(),price_cents:price,supports_cards:$('submission-cards').checked};
  const {data:row,error:insertError}=await db.from('developer_game_submissions').insert(payload).select('id').single();
  if(insertError)throw insertError;
  const submissionId=String(row.id);
  try{
    await fvSaveAssetPatch(submissionId,{
      release_version:$('submission-version').value.trim().slice(0,30)||'1.0.0',
      supported_os:$('submission-os').value,
      trailer_url:$('submission-trailer').value.trim()||null,
      requirements:$('submission-requirements').value.trim().slice(0,1500),
      release_notes:$('submission-notes').value.trim().slice(0,1500)
    });
    await fvAttachFiles(submissionId,{cover,build,shots});
    fvStatus('All files uploaded. Your submission is now waiting for administrator review.');
    toast('Game submission and ZIP uploaded for review!');
    $('developer-game-form').reset();$('submission-price').value='0';$('submission-version').value='1.0.0';
  }catch(uploadError){
    fvStatus('Submission created, but upload needs attention: '+uploadError.message+' Use Attach files on your pending release below.');
    toast('Submission saved; some files still need uploading.');
  }
  await loadDeveloperSubmissions();
 }catch(err){fvStatus(err.message||'Could not submit this game.');toast(err.message||'Upload failed.');}
 finally{fvBusy=false;$('developer-submit').disabled=false;}
});
for(const kind of ['cover','build','shots']){
 $('attach-'+kind).addEventListener('change',async e=>{
   if(!fvAttachSubmissionId||!user||!e.target.files?.length)return;
   const id=fvAttachSubmissionId;const files=[...e.target.files];
   try{
     if(fvBusy)return;fvBusy=true;
     if(kind==='shots'&&files.length>3)throw new Error('Choose no more than 3 screenshots.');
     if(kind==='cover')await fvAttachFiles(id,{cover:files[0]});
     if(kind==='build')await fvAttachFiles(id,{build:files[0]});
     if(kind==='shots')await fvAttachFiles(id,{shots:files});
     toast('Files attached successfully.');fvStatus('Updated attachments for pending submission.');
     await loadDeveloperSubmissions();
   }catch(err){toast(err.message||'File upload failed.');fvStatus(err.message||'Upload failed.');}
   finally{fvBusy=false;e.target.value='';}
 });
}
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(!$('fv-game-modal').classList.contains('hidden'))fvCloseGame();
  else if(!$('fv-info-modal').classList.contains('hidden'))fvCloseInfo();
  else if(!$('modal').classList.contains('hidden'))closeAuth();
  $('discover-menu')?.classList.add('hidden');
  $('discover-toggle')?.setAttribute('aria-expanded','false');
 }
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
  e.preventDefault();page('store');$('search').focus();$('search').select();
 }
});
init();

// Refresh published-game cards without requiring a full website redeploy.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('page-store').classList.contains('active'))loadGames();});
setInterval(()=>{if(!document.hidden&&$('page-store').classList.contains('active'))loadGames();},120000);

// Closing dialogs with a click outside or Escape does not change the active Store tab.
window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('game');if(id&&games.some(g=>String(g.id)===id))fvOpenGame(id,{fromUrl:true});else if(fvOpenGameId)fvCloseGame({fromUrl:true});});
