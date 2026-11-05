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
function page(name){if(name==="store")loadGames();document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${name}`));document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));document.querySelectorAll(".side-link").forEach(b=>b.classList.toggle("selected",b.dataset.page===name));if(name==="library")loadLibrary();if(name==="wishlist")loadWishlist().then(renderWishlistPage);if(name==="community")loadPosts();if(name==="friends")loadFriends();if(name==="developer")loadDeveloperPortal();if(typeof fv7OnPage==='function')fv7OnPage(name);scrollTo({top:0,behavior:"smooth"});}
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
async function updateUser(){if(!user){profile=null;wishlistIds.clear();libraryIds.clear();$("auth-open").classList.remove("hidden");$("user-chip").classList.add("hidden");renderGames();$("library-list").innerHTML='<div class="empty">Sign in to see your library.</div>';fv7OnUserChanged();return;}let {data}=await db.from("profiles").select("*").eq("id",user.id).maybeSingle();profile=data||{username:user.email?.split("@")[0],display_name:"Player"};$("auth-open").classList.add("hidden");$("user-chip").classList.remove("hidden");$("user-label").textContent=profile.display_name||profile.username;await Promise.all([loadLibrary(),loadWishlist()]);loadFriends();fv7OnUserChanged();if(document.getElementById("page-developer").classList.contains("active"))loadDeveloperPortal();}
async function renderWishlistPage(){if(!user){$("wishlist-list").innerHTML='<div class="empty">Sign in to see your wishlist.</div>';return;}const list=games.filter(g=>wishlistIds.has(String(g.id)));$("wishlist-list").innerHTML=list.length?list.map(card).join(''):'<div class="empty">No wishlisted games yet. Browse All Games and save one!</div>';}
async function loadLibrary(){if(!user){libraryIds.clear();$("library-list").innerHTML='<div class="empty">Sign in to see your library.</div>';return;}let {data,error}=await db.from("library").select("game_id,games(*)").eq("user_id",user.id);if(error){$("library-list").textContent=error.message;return;}let rows=data||[];libraryIds.clear();rows.forEach(x=>libraryIds.add(String(x.game_id)));let list=rows.map(x=>x.games).filter(g=>g&&g.source_submission_id);$("library-list").innerHTML=list.length?list.map(card).join(""):'<div class="empty">Your library is waiting for its first game. Add a free game from the Store!</div>';renderGames();}
async function loadWishlist(){if(!user){wishlistIds.clear();renderGames();return;}let {data,error}=await db.from("wishlist").select("game_id").eq("user_id",user.id);if(error){toast("Couldn't load wishlist: "+error.message);return;}wishlistIds.clear();(data||[]).forEach(x=>wishlistIds.add(String(x.game_id)));renderGames();}
async function loadPosts(){return fv7LoadPosts();}
async function loadFriends(){return fv7LoadFriends();}

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
 fv7ReviewPanel(String(gameId));
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
  if(fvOpenGameId===gameId)fv7LoadGameReviews(gameId);
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
async function init(){if(!db){$("setup").classList.remove("hidden");$("status").textContent="Not connected";games=[];renderGames();$("posts").innerHTML='<div class="empty">Connect Supabase to activate the community feed.</div>';return;}let {error}=await db.from("games").select("id").limit(1);$("status").textContent=error?"Database issue":"Connected";await loadGames();const deepId=new URLSearchParams(location.search).get('game');if(deepId)fvOpenGame(deepId,{fromUrl:true});
 // Auth state updates are deferred to avoid calling Supabase APIs synchronously from its callback.
 db.auth.onAuthStateChange((event,s)=>{setTimeout(async()=>{if(event==='PASSWORD_RECOVERY'){fv8RecoveryMode=true;fv8ShowRecoveryModal();return;}if(fv8RecoveryMode&&s?.user){fv8ShowRecoveryModal();return;}if(!fv8RecoveryMode)await fv8CheckSession(s?.user||null);},0);});
 let {data}=await db.auth.getSession();if(fv8RecoveryMode && data.session?.user)fv8ShowRecoveryModal();else await fv8CheckSession(data.session?.user||null);loadPosts();}
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
 if(e.target.closest('#notifications-button')){if(needLogin())page('notifications');return;}
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
$("auth-form").addEventListener("submit",async e=>{e.preventDefault();if(!db){toast("Add Supabase settings to app.js first.");return;}let email=$("email").value.trim(),password=$("password").value,msg=$("auth-message");msg.textContent="Please wait…";let result;if(authMode==="signup"){let username=$("username").value.trim().toLowerCase(),display_name=$("display").value.trim()||username;if(!/^[a-z0-9_]{3,24}$/.test(username)){msg.textContent="Username: 3–24 letters, numbers or underscores.";return;}result=await db.auth.signUp({email,password,options:{data:{username,display_name}}});}else result=await db.auth.signInWithPassword({email,password});if(result.error){msg.textContent=result.error.message;return;}if(authMode==="signup"&&!result.data.session){msg.textContent="Account created! Check your email to confirm, then sign in.";return;}$("auth-form").reset();await fv8CheckSession(result.data?.user||null);closeAuth();if(fv8MfaPending)toast('Enter your authenticator code to finish signing in.');else toast("Welcome to FluxVerse!");});
$('search').addEventListener('input',e=>{fxHomeSelected=false;fxBrowseMode='all';activeGenre='All';renderGenres();renderAll(e.target.value);if(!$('page-store').classList.contains('active'))page('store');});
$('fv-sort').addEventListener('change',()=>renderGames());
$("search").addEventListener("keydown",e=>{if(e.key==='Enter'){e.preventDefault();page('store');$('all-games').scrollIntoView({behavior:'smooth'});}});
$("post-form").addEventListener("submit",async e=>{e.preventDefault();await fv7CreatePost();});
$("friend-form").addEventListener("submit",async e=>{e.preventDefault();await fv7SearchPlayers();});

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

/* ---- FluxVerse v7 Social, Profiles & Community Suite ----
   Additive to Store v6. Supabase SQL migration 01_SOCIAL_UPGRADE.sql required. */
const fv7AvatarIcons=['🎮','🚀','⚡','🌌','👾','🐉','🏆','🛡️'];
const fv7AccentColors=['#00c9ff','#98ff00','#ffe700','#ff9d00','#ff579d','#b699ff'];
let fv7Avatar='🎮',fv7Accent='#00c9ff',fv7OpenChat=null,fv7ChatName='',fv7ReportContext=null,fv7OpenPublicUser=null;
let fv7FriendsSnapshot={relationships:[],blocked:[]},fv7CommentsOpen=new Set(),fv7BusyCalls=new Set(),fv7ActiveReviewGame=null;
const fv7Date=(v)=>{try{return new Date(v).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});}catch{return 'Recently';}};
const fv7Color=v=>fv7AccentColors.includes(v)?v:fv7AccentColors[0];
const fv7Icon=v=>fv7AvatarIcons.includes(v)?v:fv7AvatarIcons[0];
const fv7Uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));
const fv7SafeId=v=>String(v||'').slice(0,100);
function fv7HtmlPerson(p){return `<span class="fv7-avatar" aria-hidden="true" style="border-color:${fv7Color(p?.accent_color)}">${fv7Icon(p?.avatar_icon)}</span>`;}
function fv7Text(v){return esc(v??'');}
async function fv7Rpc(name,args={}){
 if(!db)throw Error('Supabase is not connected.');
 const {data,error}=await db.rpc(name,args);
 if(error)throw Error(error.message||'Could not finish this action.');
 return data;
}
function fv7Problem(e){toast(e?.message||String(e)||'Something went wrong.');}
async function fv7Guard(key,fn){if(fv7BusyCalls.has(key))return;fv7BusyCalls.add(key);try{await fn();}catch(err){fv7Problem(err);}finally{fv7BusyCalls.delete(key);}}
function fv7Require(){return needLogin();}
function fv7OnPage(name){
 if(name==='profile')fv7ShowProfileSettings();
 if(name==='notifications')fv7LoadNotifications();
 if(name==='help')fv7LoadFeedback();
}
function fv7OnUserChanged(){
 const label=$('fv7-profile-title');if(label)label.textContent=profile?.display_name||profile?.username||'Your profile';
 const chip=$('fv7-profile-avatar');if(chip){chip.textContent=fv7Icon(profile?.avatar_icon);chip.style.borderColor=fv7Color(profile?.accent_color);}
 if($('user-chip')&&!$('user-chip').classList.contains('hidden'))$('user-chip').querySelector('.fx-avatar').textContent=fv7Icon(profile?.avatar_icon);
 fv7UpdateUnread();
 if($('page-profile')?.classList.contains('active'))fv7ShowProfileSettings();
 if($('page-notifications')?.classList.contains('active'))fv7LoadNotifications();
 if(!user){fv7OpenChat=null;fv7FriendsSnapshot={relationships:[],blocked:[]};if($('page-friends')?.classList.contains('active'))fv7LoadFriends();}
}
function fv7ShowProfileSettings(){
 $('fv7-profile-guest').classList.toggle('hidden',Boolean(user));
 $('fv7-profile-member').classList.toggle('hidden',!user);
 if(!user)return;
 fv7Avatar=fv7Icon(profile?.avatar_icon);fv7Accent=fv7Color(profile?.accent_color);
 $('fv7-username').value=profile?.username||'';
 $('fv7-display').value=profile?.display_name||profile?.username||'';
 $('fv7-bio').value=profile?.bio||'';
 $('fv7-public').checked=profile?.is_public!==false;
 $('fv7-notify').checked=profile?.notification_opt_in!==false;
 $('fv7-profile-title').textContent=profile?.display_name||profile?.username||'Player';
 $('fv7-profile-handle').textContent='@'+(profile?.username||'player');
 $('fv7-profile-bio-preview').textContent=profile?.bio||'Tell other players a little about yourself.';
 $('fv7-profile-avatar').textContent=fv7Avatar;$('fv7-profile-avatar').style.borderColor=fv7Accent;
 fv7PaintAvatarChoices();
}
function fv7PaintAvatarChoices(){
 $('fv7-avatar-options').innerHTML=fv7AvatarIcons.map(x=>`<button type="button" aria-pressed="${String(x===fv7Avatar)}" data-fv7-avatar="${x}" title="${x} avatar">${x}</button>`).join('');
 $('fv7-color-options').innerHTML=fv7AccentColors.map(x=>`<button type="button" aria-pressed="${String(x===fv7Accent)}" data-fv7-accent="${x}" style="background:${x}" title="Accent ${x}"></button>`).join('');
 $('fv7-profile-avatar').textContent=fv7Avatar;$('fv7-profile-avatar').style.borderColor=fv7Accent;
}
async function fv7PublicProfile(id){
 if(!fv7Uuid(id)){toast('Profile unavailable.');return;}
 fv7OpenPublicUser=id;const modal=$('fv7-public-modal');modal.classList.remove('hidden');
 $('fv7-public-content').innerHTML='<p>Loading player profile…</p>';
 modal.querySelector('.fv7-modal-content').focus();
 try{
  const p=await fv7Rpc('fv_public_player',{p_user:id});if(fv7OpenPublicUser!==id)return;
  if(!p){$('fv7-public-content').innerHTML='<h2>Profile unavailable</h2><p>This profile may be private or blocked.</p>';return;}
  const mine=user?.id===id;
  const relationship=fv7FriendsSnapshot.relationships.find(r=>String(r.user_id)===id);
  const actions=mine?`<button type="button" class="primary" data-page="profile" data-fv7-close-public>Open account settings</button>`:
   (user?`${relationship?(relationship.status==='accepted'?`<button type="button" class="outline" data-fv7-chat="${esc(id)}">Message</button>`:`<span class="muted">Friend request ${relationship.incoming?'received':'sent'}</span>`):`<button type="button" class="primary" data-fv7-friend="request" data-target="${esc(id)}">Send friend request</button>`}
   <button type="button" class="outline" data-fv7-friend="block" data-target="${esc(id)}">Block player</button><button type="button" class="outline" data-fv7-report="profile" data-target="${esc(id)}">Report profile</button>`:'<button class="primary" type="button" id="fv7-public-signin">Sign in to connect</button>');
  $('fv7-public-content').innerHTML=`<div class="fv7-profile-public"><div class="fv7-public-identity">${fv7HtmlPerson({...p,avatar_icon:p.avatar_icon})}<div><span class="fv7-stage-tag">FLUXVERSE PLAYER</span><h2 id="fv7-public-title">${esc(p.display_name||p.username||'Player')}</h2><p>@${esc(p.username||'player')}</p></div></div><p>${p.private?'This player has a private profile.':esc(p.bio||'This player has not added a bio yet.')}</p><div class="fv7-actions">${actions}</div></div>`;
 }catch(err){$('fv7-public-content').innerHTML=`<h2>Can't load profile</h2><p>${esc(err.message)}</p>`;}
}
function fv7ClosePublic(){fv7OpenPublicUser=null;$('fv7-public-modal').classList.add('hidden');}
function fv7CloseReport(){fv7ReportContext=null;$('fv7-report-modal').classList.add('hidden');$('fv7-report-reason').value='';}
function fv7OpenReport(kind,target){if(!fv7Require())return;fv7ReportContext={kind,target};$('fv7-report-modal').classList.remove('hidden');$('fv7-report-reason').focus();}
async function fv7SearchPlayers(){
 if(!fv7Require())return;
 const q=$('friend-name').value.trim().replace(/^@/,'').toLowerCase();
 if(!/^[a-z0-9_]{2,24}$/.test(q)){$('friend-results').innerHTML='<div class="empty">Enter at least 2 username characters (letters, numbers, underscore).</div>';return;}
 $('friend-results').innerHTML='<div class="empty">Searching…</div>';
 try{
  const matches=await fv7Rpc('fv_search_players',{p_prefix:q});
  $('friend-results').innerHTML=(matches||[]).length?(matches||[]).map(p=>fv7PersonRow(p,'search')).join(''):'<div class="empty">No public players found with that username prefix.</div>';
 }catch(err){$('friend-results').innerHTML='<div class="empty">'+esc(err.message)+'</div>';}
}
function fv7PersonRow(p,kind='friend'){
 const id=String(p.user_id||'');if(!fv7Uuid(id))return '';
 const buttons=kind==='search'?`<button type="button" class="fv7-good" data-fv7-friend="request" data-target="${esc(id)}">Add friend</button>`:
 kind==='incoming'?`<button type="button" class="fv7-good" data-fv7-friend="accept" data-target="${esc(id)}">Accept</button><button type="button" data-fv7-friend="decline" data-target="${esc(id)}">Decline</button>`:
 kind==='outgoing'?`<button type="button" data-fv7-friend="cancel" data-target="${esc(id)}">Cancel</button>`:
 kind==='blocked'?`<button type="button" data-fv7-friend="unblock" data-target="${esc(id)}">Unblock</button>`:
 `<button type="button" class="fv7-good" data-fv7-chat="${esc(id)}">Message</button><button type="button" data-fv7-friend="remove" data-target="${esc(id)}">Remove</button><button type="button" class="fv7-danger" data-fv7-friend="block" data-target="${esc(id)}">Block</button>`;
 return `<div class="fv7-person">${fv7HtmlPerson(p)}<div class="fv7-person-info"><button class="fv7-username" type="button" data-fv7-user="${esc(id)}">${esc(p.display_name||p.username||'Player')}</button><small>@${esc(p.username||'player')}</small></div><div class="fv7-person-actions">${buttons}</div></div>`;
}
async function fv7LoadFriends(){
 if(!user){$('requests').innerHTML='<div class="empty">Sign in to manage your friends.</div>';$('friend-list').innerHTML='<div class="empty">Sign in to see your friends.</div>';$('fv7-blocked-list').innerHTML='<div class="empty">Sign in to manage blocked players.</div>';return;}
 $('requests').innerHTML='<div class="empty">Loading friend requests…</div>';
 $('friend-list').innerHTML='<div class="empty">Loading friends…</div>';
 try{
  const result=await fv7Rpc('fv_social_friends');fv7FriendsSnapshot={relationships:result?.relationships||[],blocked:result?.blocked||[]};
  const incoming=fv7FriendsSnapshot.relationships.filter(r=>r.status==='pending'&&r.incoming),outgoing=fv7FriendsSnapshot.relationships.filter(r=>r.status==='pending'&&!r.incoming),accepted=fv7FriendsSnapshot.relationships.filter(r=>r.status==='accepted');
  $('requests').innerHTML=(incoming.length+outgoing.length)?`<h4>Incoming (${incoming.length})</h4>${incoming.map(p=>fv7PersonRow(p,'incoming')).join('')||'<p class="muted">No incoming requests.</p>'}<h4>Sent (${outgoing.length})</h4>${outgoing.map(p=>fv7PersonRow(p,'outgoing')).join('')||'<p class="muted">No sent requests.</p>'}`:'<div class="empty">No pending friend requests.</div>';
  $('friend-list').innerHTML=accepted.length?accepted.map(p=>fv7PersonRow(p,'friend')).join(''):'<div class="empty">No friends yet. Search for players above to send a request.</div>';
  $('fv7-blocked-list').innerHTML=fv7FriendsSnapshot.blocked.length?fv7FriendsSnapshot.blocked.map(p=>fv7PersonRow(p,'blocked')).join(''):'<div class="empty">You have not blocked any players.</div>';
  if(fv7OpenChat&&!accepted.some(r=>r.user_id===fv7OpenChat)){fv7OpenChat=null;$('fv7-chat-history').innerHTML='<div class="empty">Choose a friend to chat.</div>';$('fv7-chat-input').disabled=true;$('fv7-chat-send').disabled=true;}
 }catch(err){$('requests').innerHTML=`<div class="empty">${esc(err.message)}. Run the v7 SQL migration if you haven't yet.</div>`;$('friend-list').innerHTML='<div class="empty">Friend list unavailable.</div>';}
}
async function fv7FriendAction(action,target){
 if(!fv7Require()||!fv7Uuid(target))return;
 if(['remove','block'].includes(action)&&!confirm(action==='block'?'Block this player? This also removes your friendship.':'Remove this player from your friends?'))return;
 await fv7Guard('friend-'+target,async()=>{
  const result=await fv7Rpc('fv_friend_action',{p_target:target,p_action:action});toast(result||'Friend list updated.');
  await fv7LoadFriends();fv7UpdateUnread();
  if(fv7OpenPublicUser===target)fv7PublicProfile(target);
 });
}
async function fv7OpenConversation(id){
 if(!fv7Require()||!fv7Uuid(id))return;
 const member=fv7FriendsSnapshot.relationships.find(r=>r.user_id===id&&r.status==='accepted');
 if(!member){toast('Private messages are for accepted friends only.');return;}
 fv7OpenChat=id;fv7ChatName=member.display_name||member.username||'Friend';
 $('fv7-chat-title').textContent=fv7ChatName;$('fv7-chat-input').disabled=false;$('fv7-chat-send').disabled=false;
 fv7ClosePublic();page('friends');await fv7LoadConversation();
}
async function fv7LoadConversation({quiet=false}={}){
 if(!user||!fv7OpenChat)return;
 try{
  const id=fv7OpenChat,data=await fv7Rpc('fv_social_message_history',{p_target:id});
  if(id!==fv7OpenChat)return;
  const history=(data||[]).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const box=$('fv7-chat-history');const atBottom=box.scrollTop+box.clientHeight>=box.scrollHeight-55;
  const markup=history.length?history.map(x=>`<div class="fv7-bubble ${x.mine?'mine':''}"><p>${esc(x.body)}</p><small>${fv7Date(x.created_at)} ${x.mine?'· You':''}</small></div><div class="fv7-chat-message-actions"><button type="button" class="fv7-mini" data-fv7-report="message" data-target="${esc(x.id)}">Report</button></div>`).join(''):'<div class="empty">No messages yet. Say hello!</div>';
  if(box.innerHTML!==markup){box.innerHTML=markup;if(atBottom||!quiet)box.scrollTop=box.scrollHeight;}
  fv7UpdateUnread();
 }catch(err){if(!quiet)$('fv7-chat-history').textContent=err.message;}
}
async function fv7SendMessage(){
 if(!fv7Require()||!fv7OpenChat)return;
 const body=$('fv7-chat-input').value.trim();if(!body)return;
 await fv7Guard('message-send',async()=>{await fv7Rpc('fv_social_send_message',{p_target:fv7OpenChat,p_body:body});$('fv7-chat-input').value='';await fv7LoadConversation();});
}
async function fv7LoadPosts(){
 if(!db){$('posts').innerHTML='<div class="empty">Connect Supabase to enable Community.</div>';return;}
 $('posts').innerHTML='<div class="empty">Loading community posts…</div>';
 try{
  const posts=await fv7Rpc('fv_social_feed');
  const list=Array.isArray(posts)?posts:[];
  $('posts').innerHTML=list.length?list.map(fv7PostCard).join(''):'<div class="empty">No community posts yet. Start the conversation!</div>';
  // Preserve open reply threads if the feed is refreshed.
  for(const id of [...fv7CommentsOpen])if($('fv7-comments-'+id))fv7LoadComments(id);
  if(user){try{const {data}=await db.rpc('is_fluxverse_admin');isFluxAdmin=data===true;$('fv7-admin-reports').classList.toggle('hidden',!isFluxAdmin);if(isFluxAdmin)fv7LoadReports();}catch{}}
  else $('fv7-admin-reports').classList.add('hidden');
 }catch(err){$('posts').innerHTML=`<div class="empty">${esc(err.message)}. Run the v7 social migration in Supabase first.</div>`;}
}
function fv7PostCard(p){
 const id=fv7SafeId(p.id);const mine=user?.id===p.user_id;
 const author={avatar_icon:p.avatar_icon,accent_color:p.accent_color};
 return `<article class="fv7-post" data-fv7-post-id="${esc(id)}"><div class="fv7-user-line">${fv7HtmlPerson(author)}<div><button class="fv7-user-name" type="button" data-fv7-user="${esc(p.user_id)}">${esc(p.display_name||p.username||'Player')}</button><div class="fv7-user-meta"><span>@${esc(p.username||'player')}</span><span>•</span><time>${fv7Date(p.created_at)}</time></div></div></div><div class="fv7-post-content">${esc(p.content)}</div><div class="fv7-actions"><button type="button" data-fv7-like="${esc(id)}" aria-pressed="${Boolean(p.liked)}">${p.liked?'♥':'♡'} Like (${Number(p.likes)||0})</button><button type="button" data-fv7-comments="${esc(id)}">▤ Comments (${Number(p.comments)||0})</button><button type="button" data-fv7-bookmark="${esc(id)}" aria-pressed="${Boolean(p.saved)}">${p.saved?'★ Saved':'☆ Save'}</button>${mine?`<button type="button" data-fv7-delete-post="${esc(id)}">Delete</button>`:''}<button type="button" data-fv7-report="post" data-target="${esc(id)}">Report</button></div><div class="fv7-comment-area ${fv7CommentsOpen.has(id)?'':'hidden'}" id="fv7-comments-${esc(id)}"><div class="fv7-comment-list">Loading comments…</div><form class="fv7-comment-form" data-post-id="${esc(id)}"><textarea required maxlength="1000" rows="2" placeholder="Write a respectful reply…" aria-label="Write a comment"></textarea><button type="submit" class="primary">Reply</button></form></div></article>`;
}
async function fv7CreatePost(){
 if(!fv7Require())return;const body=$('post-text').value.trim();if(!body)return;
 await fv7Guard('create-post',async()=>{await fv7Rpc('fv_social_create_post',{p_body:body});$('post-text').value='';toast('Your post was published.');await fv7LoadPosts();});
}
async function fv7TogglePost(postId,kind){if(!fv7Require())return;await fv7Guard('post-'+postId+'-'+kind,async()=>{await fv7Rpc('fv_social_toggle_post',{p_post_id:postId,p_kind:kind});await fv7LoadPosts();});}
async function fv7LoadComments(postId){
 const box=$('fv7-comments-'+postId);if(!box)return;
 const list=box.querySelector('.fv7-comment-list');if(!list)return;
 try{
  const comments=await fv7Rpc('fv_social_comments',{p_post_id:postId});
  list.innerHTML=(comments||[]).length?(comments||[]).map(c=>`<div class="fv7-comment">${fv7HtmlPerson(c)}<div class="fv7-comment-body"><button type="button" class="fv7-user-name" data-fv7-user="${esc(c.user_id)}">${esc(c.display_name||c.username||'Player')}</button><small> · ${fv7Date(c.created_at)}</small><p>${esc(c.body)}</p><div class="fv7-actions">${(user?.id===c.user_id||isFluxAdmin)?`<button type="button" data-fv7-delete-comment="${esc(c.id)}">Delete</button>`:''}<button type="button" data-fv7-report="comment" data-target="${esc(c.id)}">Report</button></div></div></div>`).join(''):'<p class="muted">No comments yet. Be the first!</p>';
 }catch(err){list.textContent=err.message;}
}
async function fv7AddComment(form){
 if(!fv7Require())return;
 const id=form.dataset.postId,area=form.querySelector('textarea'),body=area.value.trim();if(!body)return;
 await fv7Guard('comment-'+id,async()=>{await fv7Rpc('fv_social_add_comment',{p_post_id:id,p_body:body});area.value='';fv7CommentsOpen.add(id);await fv7LoadPosts();toast('Reply posted.');});
}
async function fv7UpdateUnread(){
 if(!user){$('fv7-notification-count').classList.add('hidden');return;}
 try{const count=Number(await fv7Rpc('fv_social_notification_count'))||0;
 $('fv7-notification-count').textContent=count>99?'99+':String(count);
 $('fv7-notification-count').classList.toggle('hidden',count<=0);
 }catch{$('fv7-notification-count').classList.add('hidden');}
}
async function fv7LoadNotifications(){
 if(!user){$('fv7-notifications-list').innerHTML='<div class="empty">Sign in to view your notifications.</div>';return;}
 $('fv7-notifications-list').innerHTML='<div class="empty">Loading notifications…</div>';
 try{
  const data=await fv7Rpc('fv_social_notifications_list');
  $('fv7-notifications-list').innerHTML=(data||[]).length?(data||[]).map(n=>`<div class="fv7-notice ${n.read?'':'unread'}"><span class="fv7-avatar" aria-hidden="true">${({friend_request:'👋',friend_accepted:'🎉',comment:'💬',like:'♥',message:'✉️'})[n.kind]||'✦'}</span><div class="fv7-notice-copy"><b>${esc(n.title)}</b><small>${esc(n.actor_name||'FluxVerse')} · ${fv7Date(n.created_at)}</small>${n.message?`<small>${esc(n.message)}</small>`:''}</div><div class="fv7-person-actions">${n.actor_id&&fv7Uuid(n.actor_id)?`<button type="button" data-fv7-user="${esc(n.actor_id)}">View</button>`:''}${!n.read?`<button type="button" data-fv7-mark="${esc(n.id)}">Mark read</button>`:''}</div></div>`).join(''):'<div class="empty">No notifications yet. New activity will appear here.</div>';
  fv7UpdateUnread();
 }catch(err){$('fv7-notifications-list').innerHTML='<div class="empty">'+esc(err.message)+'</div>';}
}
function fv7ReviewPanel(gameId){
 if(!fv7Uuid(gameId))return;
 fv7ActiveReviewGame=gameId;
 const root=$('fv-game-detail-content');if(!root)return;
 root.querySelector('#fv7-game-reviews')?.remove();
 const section=document.createElement('section');section.className='fv7-review-panel';section.id='fv7-game-reviews';section.innerHTML='<h3>Player reviews</h3><p class="muted">Loading verified player reviews…</p>';
 root.appendChild(section);fv7LoadGameReviews(gameId);
}
async function fv7LoadGameReviews(gameId){
 const box=$('fv7-game-reviews');if(!box||fv7ActiveReviewGame!==gameId)return;
 try{
  const data=await fv7Rpc('fv_social_game_reviews',{p_game_id:gameId});
  if(fv7ActiveReviewGame!==gameId||!$('fv7-game-reviews'))return;
  const owned=user&&libraryIds.has(gameId);const current=(data?.reviews||[]).find(r=>r.own);
  const summary=`<div class="fv7-row"><h3>Player reviews</h3><strong>${Number(data?.count)||0} review${Number(data?.count)===1?'':'s'} · ${Number(data?.average||0).toFixed(1)} / 5</strong></div>`;
  const form=owned?`<form id="fv7-review-form" class="fv7-review-form"><label>Rate this game <select id="fv7-review-rating"><option value="5">★★★★★ · Excellent</option><option value="4">★★★★ · Great</option><option value="3">★★★ · Good</option><option value="2">★★ · Fair</option><option value="1">★ · Poor</option></select></label><textarea id="fv7-review-body" rows="3" maxlength="1500" placeholder="What did you think of this game?"></textarea><div><button class="primary" type="submit">${current?'Update review':'Publish review'}</button> ${current?'<button type="button" class="fv7-mini" id="fv7-remove-review">Remove my review</button>':''}</div></form>`:'<p class="muted">Claim this free game in your Library to leave a review. Paid purchases are not enabled.</p>';
  const list=(data?.reviews||[]).length?(data.reviews||[]).map(r=>`<article class="fv7-review-entry"><div><b>${esc(r.display_name||r.username||'Player')}</b> · ${'★'.repeat(Math.max(0,Math.min(5,Number(r.rating)||0)))} <small>${fv7Date(r.updated_at)}</small></div><p>${esc(r.body||'')}</p><button type="button" class="fv7-mini" data-fv7-report="review" data-target="${esc(gameId+':'+r.author_id)}">Report</button></article>`).join(''):'<p class="muted">No reviews yet. Be the first after you play.</p>';
  box.innerHTML=summary+form+list;
  if(current&&$('fv7-review-rating')){$('fv7-review-rating').value=String(current.rating);$('fv7-review-body').value=current.body||'';}
 }catch(err){box.innerHTML='<h3>Player reviews</h3><p class="muted">'+esc(err.message)+' (If this is a new install, run v7 SQL.)</p>';}
}
async function fv7SaveReview(){
 if(!fv7Require()||!fv7ActiveReviewGame)return;
 const gameId=fv7ActiveReviewGame,rating=Number($('fv7-review-rating').value),body=$('fv7-review-body').value.trim();
 await fv7Guard('review-'+gameId,async()=>{await fv7Rpc('fv_social_submit_review',{p_game_id:gameId,p_rating:rating,p_body:body});toast('Review saved!');await fv7LoadGameReviews(gameId);});
}
async function fv7LoadReports(){
 if(!user||!isFluxAdmin)return;
 try{
  const rows=await fv7Rpc('fv_social_admin_reports');
  $('fv7-reports-list').innerHTML=(rows||[]).length?(rows||[]).map(r=>`<div class="fv7-report-card"><b>${esc(r.target_kind)} · ${esc(r.status)}</b><p>${esc(r.reason)}</p><small>Target: ${esc(r.target_id)} · ${fv7Date(r.created_at)}</small><div class="fv7-actions"><button data-fv7-review-report="reviewed" data-target="${esc(r.id)}" type="button">Mark reviewed</button><button data-fv7-review-report="dismissed" data-target="${esc(r.id)}" type="button">Dismiss</button></div></div>`).join(''):'<p class="muted">No submitted reports.</p>';
 }catch(err){$('fv7-reports-list').textContent=err.message;}
}

async function fv7LoadFeedback(){
 if(!user){$('fv7-admin-feedback').classList.add('hidden');return;}
 try{
  const {data,error}=await db.rpc('is_fluxverse_admin');
  if(error||data!==true){$('fv7-admin-feedback').classList.add('hidden');return;}
  $('fv7-admin-feedback').classList.remove('hidden');
  const rows=await fv7Rpc('fv_social_admin_feedback');
  $('fv7-feedback-list').innerHTML=(rows||[]).length?(rows||[]).map(r=>`<div class="fv7-report-card"><b>${esc(r.category)} · ${esc(r.status)}</b><p>${esc(r.body)}</p><small>@${esc(r.username||'Player')} · ${fv7Date(r.created_at)}</small><div class="fv7-actions">${r.status==='open'?`<button data-fv7-feedback-reviewed="${esc(r.id)}" type="button">Mark reviewed</button>`:''}</div></div>`).join(''):'<p class="muted">No feedback submitted yet.</p>';
 }catch(err){$('fv7-feedback-list').textContent=err.message;}
}

// ---------- Independent event handlers for added v7 controls ----------
document.addEventListener('click',e=>{
 const target=e.target;
 const avatar=target.closest('[data-fv7-avatar]');if(avatar){fv7Avatar=avatar.dataset.fv7Avatar;fv7PaintAvatarChoices();return;}
 const color=target.closest('[data-fv7-accent]');if(color){fv7Accent=color.dataset.fv7Accent;fv7PaintAvatarChoices();return;}
 const userBtn=target.closest('[data-fv7-user]');if(userBtn){fv7PublicProfile(userBtn.dataset.fv7User);return;}
 const friend=target.closest('[data-fv7-friend]');if(friend){fv7FriendAction(friend.dataset.fv7Friend,friend.dataset.target);return;}
 const chat=target.closest('[data-fv7-chat]');if(chat){fv7OpenConversation(chat.dataset.fv7Chat);return;}
 const like=target.closest('[data-fv7-like]');if(like){fv7TogglePost(like.dataset.fv7Like,'like');return;}
 const save=target.closest('[data-fv7-bookmark]');if(save){fv7TogglePost(save.dataset.fv7Bookmark,'bookmark');return;}
 const comments=target.closest('[data-fv7-comments]');if(comments){const id=comments.dataset.fv7Comments;if(fv7CommentsOpen.has(id))fv7CommentsOpen.delete(id);else fv7CommentsOpen.add(id);const box=$('fv7-comments-'+id);if(box){box.classList.toggle('hidden',!fv7CommentsOpen.has(id));if(fv7CommentsOpen.has(id))fv7LoadComments(id);}return;}
 const delPost=target.closest('[data-fv7-delete-post]');if(delPost){if(confirm('Delete your post and all its replies?'))fv7Guard('delete-post',async()=>{await fv7Rpc('fv_social_delete_post',{p_post_id:delPost.dataset.fv7DeletePost});fv7CommentsOpen.delete(delPost.dataset.fv7DeletePost);toast('Post deleted.');await fv7LoadPosts();});return;}
 const delComment=target.closest('[data-fv7-delete-comment]');if(delComment){if(confirm('Delete this reply?'))fv7Guard('delete-comment',async()=>{await fv7Rpc('fv_social_delete_comment',{p_id:delComment.dataset.fv7DeleteComment});toast('Reply deleted.');await fv7LoadPosts();});return;}
 const report=target.closest('[data-fv7-report]');if(report){fv7OpenReport(report.dataset.fv7Report,report.dataset.target);return;}
 const mark=target.closest('[data-fv7-mark]');if(mark){fv7Guard('notification',async()=>{await fv7Rpc('fv_social_mark_notifications',{p_id:mark.dataset.fv7Mark});await fv7LoadNotifications();});return;}
 const reportReview=target.closest('[data-fv7-review-report]');if(reportReview){fv7Guard('report-moderation',async()=>{await fv7Rpc('fv_social_admin_review_report',{p_id:reportReview.dataset.target,p_status:reportReview.dataset.fv7ReviewReport});await fv7LoadReports();toast('Report updated.');});return;}
 if(target.closest('[data-fv7-close-public]')){fv7ClosePublic();return;}
 if(target.closest('[data-fv7-close-report]')){fv7CloseReport();return;}
 if(target.closest('#fv7-public-signin')||target.closest('#fv7-profile-login')){fv7ClosePublic();openAuth('login');return;}
 if(target.closest('#fv7-refresh-friends')){fv7LoadFriends();return;}
 if(target.closest('#fv7-feed-refresh')){fv7LoadPosts();return;}
 if(target.closest('#fv7-refresh-reports')){fv7LoadReports();return;}
 if(target.closest('#fv7-refresh-feedback')){fv7LoadFeedback();return;}
 const reviewed=target.closest('[data-fv7-feedback-reviewed]');if(reviewed){fv7Guard('feedback-review',async()=>{await fv7Rpc('fv_social_admin_mark_feedback',{p_id:reviewed.dataset.fv7FeedbackReviewed});await fv7LoadFeedback();toast('Feedback marked reviewed.');});return;}
 if(target.closest('#fv7-notifications-read')){fv7Guard('notifications-all',async()=>{await fv7Rpc('fv_social_mark_notifications',{});await fv7LoadNotifications();toast('Notifications marked as read.');});return;}
 if(target.closest('#fv7-share-profile')){const url=new URL(location.href);url.searchParams.delete('game');url.searchParams.set('player',user?.id||'');navigator.clipboard?.writeText(url.href).then(()=>toast('Profile link copied!')).catch(()=>fvShowInfo('Profile link',url.href));return;}
 if(target.closest('#fv7-send-reset')){if(!user?.email){toast('Please sign in to use password reset.');return;}fv7Guard('reset-password',async()=>{const {error}=await db.auth.resetPasswordForEmail(user.email,{redirectTo:location.origin+location.pathname+'?fv_reset=1'});if(error)throw error;toast('Password reset email requested. Check your inbox.');});return;}
 if(target.closest('#fv7-remove-review')){if(fv7ActiveReviewGame&&confirm('Remove your review?'))fv7Guard('remove-review',async()=>{await fv7Rpc('fv_social_remove_review',{p_game_id:fv7ActiveReviewGame});toast('Review removed.');await fv7LoadGameReviews(fv7ActiveReviewGame);});return;}
});
document.addEventListener('submit',e=>{
 const form=e.target;
 if(form.matches('.fv7-comment-form')){e.preventDefault();fv7AddComment(form);return;}
 if(form.id==='fv7-chat-form'){e.preventDefault();fv7SendMessage();return;}
 if(form.id==='fv7-profile-form'){
  e.preventDefault();if(!fv7Require())return;
  fv7Guard('profile-save',async()=>{
   $('fv7-profile-status').textContent='Saving…';
   await fv7Rpc('fv_save_player_profile',{
     p_username:$('fv7-username').value.trim().toLowerCase(),p_display_name:$('fv7-display').value.trim(),p_bio:$('fv7-bio').value.trim(),p_avatar_icon:fv7Avatar,p_accent_color:fv7Accent,p_is_public:$('fv7-public').checked,p_notify:$('fv7-notify').checked
   });
   const {data,error}=await db.from('profiles').select('*').eq('id',user.id).maybeSingle();if(error)throw error;
   profile=data;$('user-label').textContent=profile.display_name||profile.username;fv7ShowProfileSettings();$('fv7-profile-status').textContent='Profile saved successfully.';toast('Profile updated!');
  });return;
 }
 if(form.id==='fv7-password-form'){
  e.preventDefault();if(!fv7Require())return;const password=$('fv7-new-password').value;
  if(password.length<8){toast('Use a password with at least 8 characters.');return;}
  fv7Guard('password',async()=>{const {error}=await db.auth.updateUser({password});if(error)throw error;$('fv7-new-password').value='';toast('Password updated.');});return;
 }
 if(form.id==='fv7-feedback-form'){
  e.preventDefault();if(!fv7Require())return;
  const category=$('fv7-feedback-kind').value,body=$('fv7-feedback-body').value.trim();
  fv7Guard('feedback',async()=>{await fv7Rpc('fv_social_submit_feedback',{p_category:category,p_body:body});$('fv7-feedback-form').reset();toast('Feedback submitted for review.');});return;
 }
 if(form.id==='fv7-report-form'){
  e.preventDefault();if(!fv7ReportContext)return;
  const ctx=fv7ReportContext,reason=$('fv7-report-reason').value.trim();
  fv7Guard('report',async()=>{await fv7Rpc('fv_social_report',{p_kind:ctx.kind,p_target:ctx.target,p_reason:reason});fv7CloseReport();toast('Report submitted to moderators.');});return;
 }
 if(form.id==='fv7-review-form'){e.preventDefault();fv7SaveReview();}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(!$('fv7-report-modal').classList.contains('hidden'))fv7CloseReport();
  if(!$('fv7-public-modal').classList.contains('hidden'))fv7ClosePublic();
 }
});
// Refresh account notifications and a selected private conversation when the tab is visible.
setInterval(()=>{if(document.hidden||!user)return;fv7UpdateUnread();if($('page-friends').classList.contains('active')&&fv7OpenChat)fv7LoadConversation({quiet:true});},25000);
// Public player deep links are safe: only the user id travels in the URL, no email or token.
if(new URLSearchParams(location.search).has('player')){
 const id=new URLSearchParams(location.search).get('player');
 if(fv7Uuid(id))setTimeout(()=>fv7PublicProfile(id),250);
}


// ---------- FluxVerse v8: Account recovery + authenticator-app MFA ----------
// The Supabase publishable key is the ONLY key in this browser application.
// Recovery requests do not return account emails or confirm whether usernames exist.
let fv8RecoveryMode=new URLSearchParams(location.search).get('fv_reset')==='1';
let fv8MfaPending=null;
let fv8MfaFactorId=null;
let fv8MfaEnrolling=null;
let fv8AuthEpoch=0;
let fv8Checking=false;

function fv8AuthPane(which='login'){
 const sign=which==='login';
 $('auth-form').classList.toggle('hidden',!sign);
 $('fv8-auth-tabs').classList.toggle('hidden',!sign);
 $('fv8-auth-links').classList.toggle('hidden',!sign || authMode==='signup');
 $('fv8-forgot-password-form').classList.toggle('hidden',which!=='password');
 $('fv8-forgot-email-form').classList.toggle('hidden',which!=='email');
 $('fv81-track-form').classList.toggle('hidden',which!=='track');
 if(which==='password')$('fv8-reset-email').value=$('email').value||'';
 if(which!=='login')$('modal').classList.remove('hidden');
}
const fv8OriginalMode=setMode;
setMode=function(mode){fv8OriginalMode(mode);fv8AuthPane('login');};
function fv8ShowRecoveryModal(){
 closeAuth();$('fv8-mfa-modal').classList.add('hidden');
 $('fv8-reset-modal').classList.remove('hidden');
 $('fv8-new-password-status').textContent='';
 $('fv8-new-password').focus();
}
function fv8ShowMfaPrompt(){
 $('fv8-mfa-modal').classList.remove('hidden');
 $('fv8-mfa-signin-status').textContent='';
 $('fv8-mfa-signin-code').value='';
 closeAuth();
 $('fv8-mfa-signin-code').focus();
}
function fv8HideMfaPrompt(){$('fv8-mfa-modal').classList.add('hidden');}
async function fv8CheckSession(authUser){
 if(!db || fv8RecoveryMode)return;
 const epoch=++fv8AuthEpoch;
 if(!authUser){
  fv8MfaPending=null;fv8MfaFactorId=null;fv8HideMfaPrompt();
  user=null;await updateUser();return;
 }
 const {data,error}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 if(epoch!==fv8AuthEpoch)return;
 if(error){
  fv8MfaPending=authUser;user=null;await updateUser();fv8ShowMfaPrompt();
  $('fv8-mfa-signin-status').textContent='Could not check account security: '+error.message;
  return;
 }
 if(data?.currentLevel==='aal1' && data?.nextLevel==='aal2'){
  fv8MfaPending=authUser;user=null;
  await updateUser();
  const result=await db.auth.mfa.listFactors();
  if(epoch!==fv8AuthEpoch)return;
  if(result.error){fv8MfaFactorId=null;}else{
   const factors=[...(result.data?.totp||[]),...(result.data?.all||[])];
   fv8MfaFactorId=factors.find(f=>f.factor_type==='totp' && f.status==='verified')?.id||null;
  }
  fv8ShowMfaPrompt();
  if(!fv8MfaFactorId)$('fv8-mfa-signin-status').textContent='Unable to load your authenticator. Sign out and contact support if this continues.';
  return;
 }
 fv8MfaPending=null;fv8MfaFactorId=null;fv8HideMfaPrompt();
 user=authUser;
 await updateUser();
 if($('page-profile')?.classList.contains('active'))fv8RefreshMfaStatus();
 if($('page-help')?.classList.contains('active'))fv8LoadRecoveryRequests();
}
async function fv8RefreshMfaStatus(){
 if(!db || !user)return;
 const {data,error}=await db.auth.mfa.listFactors();
 if(error){$('fv8-mfa-status').textContent='Could not load security settings: '+error.message;return;}
 const factors=[...(data?.totp||[]),...(data?.all||[])];
 const verified=factors.find(f=>f.factor_type==='totp'&&f.status==='verified');
 $('fv8-mfa-status').textContent=verified?'Enabled — authenticator app is linked.':'Off — enable it to protect your account.';
 $('fv8-mfa-enroll-button').classList.toggle('hidden',!!verified);
 $('fv8-mfa-disable-button').classList.toggle('hidden',!verified);
 $('fv8-mfa-disable-button').dataset.factorId=verified?.id||'';
}
async function fv8BeginEnroll(){
 if(!user)return toast('Please sign in first.');
 if(fv8MfaEnrolling)return;
 const btn=$('fv8-mfa-enroll-button');btn.disabled=true;
 try{
  const {data,error}=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'FluxVerse authenticator'});
  if(error)throw error;
  fv8MfaEnrolling=data;
  const qr=String(data?.totp?.qr_code||'');
  // Supabase returns a local data URL; do not send authentication secrets to an external QR provider.
  $('fv8-mfa-qr').src=qr.startsWith('data:image/svg+xml;')?qr:qr.startsWith('data:image/png;')?qr:'';
  $('fv8-mfa-qr').classList.toggle('hidden',!$('fv8-mfa-qr').src);
  $('fv8-mfa-secret').textContent=String(data?.totp?.secret||'');
  $('fv8-mfa-enroll-panel').classList.remove('hidden');
  $('fv8-mfa-status').textContent='Setup started. Verify your first code to finish.';
 }catch(err){$('fv8-mfa-status').textContent='Could not start setup: '+err.message;}
 finally{btn.disabled=false;}
}
async function fv8FinishEnroll(code){
 if(!fv8MfaEnrolling)throw new Error('Start setup first.');
 const {error}=await db.auth.mfa.challengeAndVerify({factorId:fv8MfaEnrolling.id,code});
 if(error)throw error;
 fv8MfaEnrolling=null;
 $('fv8-mfa-enroll-panel').classList.add('hidden');
 $('fv8-mfa-enroll-form').reset();
 $('fv8-mfa-secret').textContent='';$('fv8-mfa-qr').removeAttribute('src');
 await fv8RefreshMfaStatus();toast('Two-step verification is enabled!');
}
async function fv8CancelEnroll(){
 if(fv8MfaEnrolling){
  const pending=fv8MfaEnrolling;fv8MfaEnrolling=null;
  try{await db.auth.mfa.unenroll({factorId:pending.id});}catch(e){/* unverified factor may expire */}
 }
 $('fv8-mfa-enroll-panel').classList.add('hidden');
 $('fv8-mfa-secret').textContent='';$('fv8-mfa-qr').removeAttribute('src');
 await fv8RefreshMfaStatus();
}
async function fv8LoadRecoveryRequests(){
 if(!db || !user)return;
 const section=$('fv8-admin-recovery');
 const {data:admin,error:adminError}=await db.rpc('is_fluxverse_admin');
 if(adminError || admin!==true){section.classList.add('hidden');return;}
 section.classList.remove('hidden');
 const {data,error}=await db.rpc('fv81_admin_cases');
 if(error){$('fv8-recovery-list').textContent='Recovery inbox unavailable: '+error.message;return;}
 const rows=Array.isArray(data)?data:[];
 $('fv8-recovery-list').innerHTML=rows.length?rows.map(r=>{
  const history=(r.messages||[]).map(m=>`<p class="fv81-msg ${m.author==='staff'?'staff':''}"><b>${m.author==='staff'?'FluxVerse support':'Requester'}:</b> ${esc(m.body)}</p>`).join('');
  const states=['open','reviewed','waiting_for_player','resolved','declined'];
  const opts=states.map(st=>`<option value="${st}" ${r.status===st?'selected':''}>${st.replaceAll('_',' ')}</option>`).join('');
  return `<article class="fv81-case fv7-report-card"><b>@${esc(r.username)} · ${esc(r.status)}</b>
   <p class="fv81-contact">Provided contact address: ${esc(r.contact_email)}</p><p>${esc(r.details||'No details provided')}</p>
   <p class="fv81-proof ${r.verified?'verified':''}">${r.verified?'✓ Previously saved ownership proof verified':'Ownership not verified'}</p>
   <small>${esc(r.created_at)} · ${r.has_tracking?'Private conversation enabled':'Older request — no tracking code (contact manually)'}</small>
   <div class="fv81-history">${history||'<p class="muted">No messages yet.</p>'}</div>
   <form class="fv81-admin-form" data-fv81-case-id="${esc(r.id)}">${r.has_tracking?'<label>Message to requester<textarea name="reply" rows="2" maxlength="1500" placeholder="Never include login emails, reset links, passwords, or private data"></textarea></label>':'<p class="fv81-legacy">This older request has no tracking code, so in-site replies are unavailable. Contact the requester through an independently verified channel.</p>'}<label>Case status<select name="status">${opts}</select></label><button class="outline" type="submit">Save status${r.has_tracking?' / reply':''}</button><small>${r.has_tracking?'Requester can read messages with their tracking code.':'Status changes are internal only for this older request.'}</small></form></article>`;
 }).join(''):'<p class="muted">No recovery requests yet.</p>';
}

// Existing v7 navigation remains untouched; only refresh these security controls when relevant.
const fv8OriginalPage=page;
page=function(name){fv8OriginalPage(name);if(name==='profile')fv8RefreshMfaStatus();if(name==='help')fv8LoadRecoveryRequests();};

document.addEventListener('click',async e=>{
 if(e.target.closest('#fv8-forgot-password')){fv8AuthPane('password');return;}
 if(e.target.closest('#fv8-forgot-email')){fv8AuthPane('email');return;}
 if(e.target.closest('[data-fv8-back-login]')){fv8AuthPane('login');return;}
 if(e.target.closest('#fv8-mfa-enroll-button')){await fv8BeginEnroll();return;}
 if(e.target.closest('#fv8-mfa-cancel-enroll')){await fv8CancelEnroll();return;}
 if(e.target.closest('#fv8-mfa-disable-button')){
  const id=$('fv8-mfa-disable-button').dataset.factorId;
  if(!id || !confirm('Disable two-step verification for your FluxVerse account? This reduces account security.'))return;
  $('fv8-mfa-disable-button').disabled=true;
  try{const {error}=await db.auth.mfa.unenroll({factorId:id});if(error)throw error;await fv8RefreshMfaStatus();toast('Two-step verification disabled.');}
  catch(err){$('fv8-mfa-status').textContent='Could not disable: '+err.message;}
  finally{$('fv8-mfa-disable-button').disabled=false;}
  return;
 }
 if(e.target.closest('#fv8-mfa-signout')){
  await db.auth.signOut();fv8HideMfaPrompt();fv8MfaPending=null;fv8MfaFactorId=null;
  toast('Signed out.');return;
 }
 if(e.target.closest('#fv8-recovery-refresh')){fv8LoadRecoveryRequests();return;}
 const mark=e.target.closest('[data-fv8-recovery-review]');
 if(mark){const {error}=await db.rpc('fv8_admin_review_recovery',{p_id:mark.dataset.fv8RecoveryReview});if(error)toast(error.message);else{toast('Request marked reviewed.');fv8LoadRecoveryRequests();}return;}
});

document.addEventListener('submit',async e=>{
 if(e.target.id==='fv8-forgot-password-form'){
  e.preventDefault();const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;
  const msg=$('fv8-forgot-status');msg.textContent='Sending…';
  try{const {error}=await db.auth.resetPasswordForEmail($('fv8-reset-email').value.trim(),{redirectTo:location.origin+location.pathname+'?fv_reset=1'});
   if(error)throw error;
   msg.textContent='If that email belongs to an account, a password-reset link will arrive. Check spam too.';
  }catch(err){msg.textContent='Could not request reset: '+err.message;}
  finally{btn.disabled=false;}
  return;
 }
 if(e.target.id==='fv8-forgot-email-form'){
  e.preventDefault();const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;
  const msg=$('fv8-email-status');msg.textContent='Submitting…';$('fv81-issued-box').classList.add('hidden');
  try{
   const {data,error}=await db.rpc('fv81_open_ticket',{p_username:$('fv8-recovery-username').value.trim(),p_contact_email:$('fv8-recovery-contact').value.trim(),p_details:$('fv8-recovery-details').value.trim()});
   if(error)throw error;
   if(!data?.tracking_code)throw new Error('No tracking code received');
   fv81TicketCode=data.tracking_code;
   $('fv81-issued-code').value=fv81TicketCode;$('fv81-issued-box').classList.remove('hidden');
   msg.textContent='Request received. Save the tracking code below before closing this window. Your account email has not been revealed or changed.';
   $('fv8-forgot-email-form').reset();
  }catch(err){msg.textContent='Could not submit request: '+err.message;}
  finally{btn.disabled=false;}
  return;
 }
 if(e.target.id==='fv8-new-password-form'){
  e.preventDefault();const pass=$('fv8-new-password').value,confirmPass=$('fv8-confirm-password').value,msg=$('fv8-new-password-status');
  if(pass!==confirmPass){msg.textContent='The passwords do not match.';return;}
  if(pass.length<10){msg.textContent='Use at least 10 characters.';return;}
  const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;
  msg.textContent='Saving new password…';
  try{const {error}=await db.auth.updateUser({password:pass});if(error)throw error;
   msg.textContent='Password updated. Please sign in again.';
   fv8RecoveryMode=false;
   await db.auth.signOut();
   $('fv8-reset-modal').classList.add('hidden');
   $('fv8-new-password-form').reset();
   // Remove recovery URL fragments so they are not copied or reused.
   history.replaceState(null,'',location.pathname);
   openAuth('login');toast('Password reset complete. Sign in with your new password.');
  }catch(err){msg.textContent='Could not update password: '+err.message;}
  finally{btn.disabled=false;}
  return;
 }
 if(e.target.id==='fv8-mfa-signin-form'){
  e.preventDefault();const msg=$('fv8-mfa-signin-status'),code=$('fv8-mfa-signin-code').value.trim();
  if(!fv8MfaPending||!fv8MfaFactorId){msg.textContent='No verified factor is available. Sign out and contact support.';return;}
  if(!/^[0-9]{6}$/.test(code)){msg.textContent='Enter a 6-digit code.';return;}
  const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;msg.textContent='Verifying…';
  try{const {error}=await db.auth.mfa.challengeAndVerify({factorId:fv8MfaFactorId,code});if(error)throw error;
   const verifiedUser=fv8MfaPending;await fv8CheckSession(verifiedUser);
   if(!fv8MfaPending)toast('Two-step verification successful!');
  }catch(err){msg.textContent='Could not verify code: '+err.message;}
  finally{btn.disabled=false;}
  return;
 }
 if(e.target.id==='fv8-mfa-enroll-form'){
  e.preventDefault();const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;
  try{await fv8FinishEnroll($('fv8-mfa-enroll-code').value.trim());}
  catch(err){$('fv8-mfa-status').textContent='Could not enable: '+err.message;}
  finally{btn.disabled=false;}
  return;
 }
});


// ---------- FluxVerse v8.1: private support tickets + pre-enrolled backup proof ----------
let fv81TicketCode='';
async function fv81LoadTicket(){
 const code=$('fv81-track-code').value.trim();
 if(!code){$('fv81-track-status').textContent='Enter your tracking code.';return;}
 $('fv81-track-status').textContent='Checking request…';
 $('fv81-ticket-result').classList.add('hidden');
 const {data,error}=await db.rpc('fv81_ticket_details',{p_tracking_code:code});
 if(error){$('fv81-track-status').textContent=error.message;return;}
 fv81TicketCode=code;
 $('fv81-track-status').textContent='Request loaded.';
 $('fv81-ticket-summary').innerHTML=`<p><b>Status:</b> ${esc((data?.status||'open').replaceAll('_',' '))}</p><p><b>Ownership proof:</b> ${data?.verified?'Verified using a previously saved FluxVerse recovery proof code':'Not verified'}</p>`;
 $('fv81-ticket-messages').innerHTML=(data?.messages||[]).length?(data.messages||[]).map(m=>`<p class="fv81-msg ${m.author==='staff'?'staff':''}"><b>${m.author==='staff'?'FluxVerse support':'You'}:</b> ${esc(m.body)}</p>`).join(''):'<p class="muted">No replies yet. Check again later using the same code.</p>';
 const closed=['resolved','declined'].includes(data?.status);
 $('fv81-ticket-send').disabled=closed;
 $('fv81-verify-proof').disabled=!!data?.verified || closed;
 $('fv81-ticket-result').classList.remove('hidden');
}
async function fv81BackupStatus(){
 if(!user)return;
 const {data,error}=await db.rpc('fv81_backup_code_exists');
 $('fv81-backup-status').textContent=error?'Code status unavailable: '+error.message:data?'Recovery proof code is on file. Keep your offline copy safe.':'No recovery proof code saved yet.';
}
const fv81PreviousPage=page;
page=function(name){fv81PreviousPage(name);if(name==='profile')fv81BackupStatus();};
document.addEventListener('click',async e=>{
 if(e.target.closest('#fv81-to-track')||e.target.closest('#fv81-open-issued')){
  fv8AuthPane('track');$('fv81-track-code').value=fv81TicketCode||'';
  if(e.target.closest('#fv81-open-issued'))fv81LoadTicket();return;
 }
 if(e.target.closest('#fv81-copy-issued')){
  try{await navigator.clipboard.writeText($('fv81-issued-code').value);toast('Tracking code copied.');}catch{toast('Select and copy the code manually.');}return;
 }
 if(e.target.closest('#fv81-copy-backup')){
  try{await navigator.clipboard.writeText($('fv81-backup-value').textContent);toast('Proof code copied. Store it offline.');}catch{toast('Select and copy the code manually.');}return;
 }
 if(e.target.closest('#fv81-generate-backup')){
  if(!user)return toast('Sign in first.');
  if(!confirm('Generate a new recovery proof code? Any previous code will stop working. Store the new code offline.'))return;
  const btn=$('fv81-generate-backup');btn.disabled=true;
  try{
   const {data,error}=await db.rpc('fv81_generate_backup_code');if(error)throw error;
   $('fv81-backup-value').textContent=String(data||'');$('fv81-backup-result').classList.remove('hidden');
   $('fv81-backup-status').textContent='New code generated. Save it securely now; it cannot be retrieved later.';
  }catch(err){$('fv81-backup-status').textContent='Could not generate: '+err.message;}
  finally{btn.disabled=false;}
  return;
 }
 if(e.target.closest('#fv81-ticket-send')){
  const msg=$('fv81-ticket-message').value.trim();if(!msg)return;
  const btn=$('fv81-ticket-send');btn.disabled=true;
  const {error}=await db.rpc('fv81_ticket_reply',{p_tracking_code:fv81TicketCode,p_message:msg});
  if(error){$('fv81-track-status').textContent=error.message;btn.disabled=false;return;}
  $('fv81-ticket-message').value='';await fv81LoadTicket();return;
 }
 if(e.target.closest('#fv81-verify-proof')){
  const proof=$('fv81-proof-code').value.trim();if(!proof)return;
  const btn=$('fv81-verify-proof');btn.disabled=true;
  const {data,error}=await db.rpc('fv81_verify_backup_code',{p_tracking_code:fv81TicketCode,p_backup_code:proof});
  $('fv81-proof-code').value='';
  $('fv81-proof-status').textContent=error?error.message:data?'Ownership proof verified. FluxVerse staff must still process recovery securely.':'Verification failed or the code has expired. Do not share the code with anyone.';
  if(data)await fv81LoadTicket();else btn.disabled=false;
 }
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='fv81-track-form'){
  e.preventDefault();await fv81LoadTicket();return;
 }
 if(e.target.classList.contains('fv81-admin-form')){
  e.preventDefault();const form=e.target;
  const btn=form.querySelector('button[type="submit"]');btn.disabled=true;
  try{
   const {error}=await db.rpc('fv81_admin_reply',{p_request_id:form.dataset.fv81CaseId,p_message:form.elements.reply?.value.trim()||'',p_status:form.elements.status.value});
   if(error)throw error;
   toast('Support case saved.');await fv8LoadRecoveryRequests();
  }catch(err){toast('Could not update case: '+err.message);}
  finally{btn.disabled=false;}
 }
});
