import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas=document.querySelector('#universe');
const nameCard=document.querySelector('#name-card');
const personName=document.querySelector('#person-name');
const personAge=document.querySelector('#person-age');
const personPlace=document.querySelector('#person-place');
const personDate=document.querySelector('#person-date');
const personImage=document.querySelector('#person-image');
const photoField=document.querySelector('#photo-field');
const photoNodes=new Map();
const IMAGE_BASE='https://raw.githubusercontent.com/ana-pic/JavidNaman/main/yademan-images-webp95/';
const IMAGE_MANIFEST='./data/image_manifest.min.json';
const DEFAULT_PERSON_IMAGE='./assets/yademan-mark.svg';
let personImages=new Map(), recordNameCounts=new Map();
let photoRefreshAt=0, hovered=-1, selectedMarker=null;
const searchLayer=document.querySelector('#search-layer');
const searchInput=document.querySelector('#search');
const results=document.querySelector('#results');
const entryZoom=14-.75*(14-4.35);
let records=[], points, pointGeometry, rotationX=(Math.random()-.5)*.9, rotationY=Math.random()*Math.PI*2, targetX=rotationX, targetY=rotationY, targetZoom=entryZoom;
let entryZoomActive=false,entryZoomStartedAt=0,entryZoomFrom=entryZoom;
let dragging=false,moved=false,lastX=0,lastY=0,pointerDownAt=0,selected=-1,searchOpen=false;
let photoFocusTimer=null,photoFocusActive=false,centerPhotoIndex=-1;
const pointers=new Map();let pinchDistance=0;
const zoomLabel=document.querySelector('#zoom-value');
function setZoom(value){entryZoomActive=false;targetZoom=Math.max(4.35,Math.min(14,value));if(zoomLabel)zoomLabel.textContent=Math.round((14-targetZoom)/(14-4.35)*100)+'%'}
function currentZoom(){return entryZoomActive?camera.position.z:targetZoom}
function startEntryZoom(){if(entryZoomActive||camera.position.z<=4.35)return;entryZoomFrom=camera.position.z;entryZoomStartedAt=performance.now();entryZoomActive=true}
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x03050b);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);
camera.position.set(0,0,targetZoom);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
const root=new THREE.Group();scene.add(root);
// Preserve the existing randomized globe pose; only the Iran overlay is aligned at entry.
root.rotation.set(rotationX,rotationY,0);

const ambient=new THREE.PointLight(0x7896c8,13,24);ambient.position.set(-4,3,6);scene.add(ambient);
const goldLight=new THREE.PointLight(0xd4b476,8,18);goldLight.position.set(4,-2,4);scene.add(goldLight);
const shell=new THREE.Mesh(new THREE.SphereGeometry(2.35,72,72),new THREE.MeshPhysicalMaterial({color:0x0a1425,metalness:.28,roughness:.82,transparent:true,opacity:.16,side:THREE.BackSide}));
root.add(shell);
const halo=new THREE.Mesh(new THREE.SphereGeometry(2.43,64,64),new THREE.MeshBasicMaterial({color:0x6686b7,transparent:true,opacity:.035,side:THREE.BackSide}));
root.add(halo);

/* Iran's georeferenced national outline, projected onto the existing globe without changing its layout. */
const iranCoordinates=[[53.921598,37.198918],[54.800304,37.392421],[55.511578,37.964117],[56.180375,37.935127],[56.619366,38.121394],[57.330434,38.029229],[58.436154,37.522309],[59.234762,37.412988],[60.377638,36.527383],[61.123071,36.491597],[61.210817,35.650072],[60.803193,34.404102],[60.52843,33.676446],[60.9637,33.528832],[60.536078,32.981269],[60.863655,32.18292],[60.941945,31.548075],[61.699314,31.379506],[61.781222,30.73585],[60.874248,29.829239],[61.369309,29.303276],[61.771868,28.699334],[62.72783,28.259645],[62.755426,27.378923],[63.233898,27.217047],[63.316632,26.756532],[61.874187,26.239975],[61.497363,25.078237],[59.616134,25.380157],[58.525761,25.609962],[57.397251,25.739902],[56.970766,26.966106],[56.492139,27.143305],[55.72371,26.964633],[54.71509,26.480658],[53.493097,26.812369],[52.483598,27.580849],[51.520763,27.86569],[50.852948,28.814521],[50.115009,30.147773],[49.57685,29.985715],[48.941333,30.31709],[48.567971,29.926778],[48.014568,30.452457],[48.004698,30.985137],[47.685286,30.984853],[47.849204,31.709176],[47.334661,32.469155],[46.109362,33.017287],[45.416691,33.967798],[45.64846,34.748138],[46.151788,35.093259],[46.07634,35.677383],[45.420618,35.977546],[44.77267,37.17045],[44.225756,37.971584],[44.421403,38.281281],[44.109225,39.428136],[44.79399,39.713003],[44.952688,39.335765],[45.457722,38.874139],[46.143623,38.741201],[46.50572,38.770605],[47.685079,39.508364],[48.060095,39.582235],[48.355529,39.288765],[48.010744,38.794015],[48.634375,38.270378],[48.883249,38.320245],[49.199612,37.582874],[50.147771,37.374567],[50.842354,36.872814],[52.264025,36.700422],[53.82579,36.965031],[53.921598,37.198918]];
function buildIranHighlight(){
 const surfaceRadius=2.382;
 const overlay=new THREE.Group();
 const toSphere=([longitude,latitude],radius=surfaceRadius)=>{
  const lon=THREE.MathUtils.degToRad(longitude),lat=THREE.MathUtils.degToRad(latitude),c=Math.cos(lat);
  return new THREE.Vector3(radius*c*Math.sin(lon),radius*Math.sin(lat),radius*c*Math.cos(lon));
 };
 const contour=iranCoordinates.slice(0,-1).map(([lon,lat])=>new THREE.Vector2(lon,lat));
 const vertices=contour.map((_,i)=>toSphere(iranCoordinates[i],surfaceRadius));
 const fillGeometry=new THREE.BufferGeometry();
 fillGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(v=>[v.x,v.y,v.z]),3));
 fillGeometry.setIndex(THREE.ShapeUtils.triangulateShape(contour,[]).flat());
 fillGeometry.computeVertexNormals();
 const fill=new THREE.Mesh(fillGeometry,new THREE.MeshBasicMaterial({color:0xd5ad68,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));
 overlay.add(fill);
 const borderPoints=iranCoordinates.map(point=>toSphere(point,surfaceRadius+.018));
 const borderGeometry=new THREE.BufferGeometry().setFromPoints(borderPoints);
 const softBorder=new THREE.LineLoop(borderGeometry,new THREE.LineBasicMaterial({color:0xb58b4e,transparent:true,opacity:.48,depthWrite:false}));
 const brightBorder=new THREE.LineLoop(borderGeometry,new THREE.LineBasicMaterial({color:0xffdf9a,transparent:true,opacity:.96,depthWrite:false}));
 overlay.add(softBorder,brightBorder);
 const iranCenter=toSphere([53,32],1).normalize();
 const faceIran=new THREE.Quaternion().setFromUnitVectors(iranCenter,new THREE.Vector3(0,0,1));
 overlay.quaternion.copy(root.quaternion).invert().multiply(faceIran);
 root.add(overlay);
}
buildIranHighlight();


function makeStars(){
 const n=2400, a=new Float32Array(n*3), c=new Float32Array(n*3);
 for(let i=0;i<n;i++){const r=10+Math.random()*28,t=Math.random()*Math.PI*2,u=Math.acos(2*Math.random()-1);a[i*3]=r*Math.sin(u)*Math.cos(t);a[i*3+1]=r*Math.cos(u);a[i*3+2]=r*Math.sin(u)*Math.sin(t);const k=.35+Math.random()*.65;c[i*3]=.48*k;c[i*3+1]=.58*k;c[i*3+2]=.82*k}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
 const m=new THREE.PointsMaterial({size:.026,vertexColors:true,transparent:true,opacity:.75,sizeAttenuation:true,depthWrite:false});
 const p=new THREE.Points(g,m);scene.add(p);return p;
}
const stars=makeStars();

function spherePositions(count,radius){
 const arr=new Float32Array(count*3), golden=Math.PI*(3-Math.sqrt(5));
 for(let i=0;i<count;i++){const y=1-(i/(Math.max(1,count-1)))*2;const rr=Math.sqrt(1-y*y);const theta=golden*i;arr[3*i]=Math.cos(theta)*rr*radius;arr[3*i+1]=y*radius;arr[3*i+2]=Math.sin(theta)*rr*radius}
 return arr;
}
function buildPeople(){
 if(!records.length)return;
 if(points){root.remove(points);pointGeometry.dispose()}
 const pos=spherePositions(records.length,2.365);
 const colors=new Float32Array(records.length*3);
 for(let i=0;i<records.length;i++){const v=.72+Math.random()*.28;colors[i*3]=.86*v;colors[i*3+1]=.68*v;colors[i*3+2]=.39*v}
 pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.BufferAttribute(pos,3));pointGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const mat=new THREE.ShaderMaterial({
 uniforms:{uPixelRatio:{value:Math.min(devicePixelRatio,2)},uSize:{value:25},uTime:{value:0}},
 vertexShader:`attribute vec3 color; varying vec3 vColor; uniform float uPixelRatio; uniform float uSize; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=uSize*uPixelRatio/max(1.0,-mv.z);}`,
 fragmentShader:`varying vec3 vColor; void main(){vec2 p=gl_PointCoord-0.5;float d=length(p);float core=1.0-smoothstep(0.05,0.22,d);float aura=1.0-smoothstep(0.12,0.5,d);float alpha=max(core,aura*0.36);if(alpha<0.015)discard;gl_FragColor=vec4(vColor*(1.0+aura*0.8),alpha);}`,
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
});
 points=new THREE.Points(pointGeometry,mat);points.userData.basePositions=pos;root.add(points);
 selectedMarker=new THREE.Group();
 const markerCore=new THREE.Mesh(new THREE.SphereGeometry(.065,20,20),new THREE.MeshBasicMaterial({color:0xffe6a6,transparent:true,opacity:.95}));
 const markerRing=new THREE.Mesh(new THREE.TorusGeometry(.13,.012,8,48),new THREE.MeshBasicMaterial({color:0xffc86e,transparent:true,opacity:.95}));
 markerRing.rotation.x=Math.PI/2;selectedMarker.add(markerCore,markerRing);
 const markerAura=new THREE.Mesh(new THREE.SphereGeometry(.2,20,20),new THREE.MeshBasicMaterial({color:0xffb94f,transparent:true,opacity:.13,side:THREE.BackSide}));
 selectedMarker.add(markerAura);selectedMarker.visible=false;root.add(selectedMarker);
 const glow=new THREE.Points(pointGeometry,new THREE.PointsMaterial({size:innerWidth<700?.11:.085,color:0xb18b50,transparent:true,opacity:.12,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending}));
 glow.name='glow';root.add(glow);
}
function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(quoted){
   if(char==='"'&&text[i+1]==='"'){field+='"';i++}
   else if(char==='"')quoted=false;
   else field+=char;
  }else if(char==='"'&&field==='')quoted=true;
  else if(char===','){row.push(field);field=''}
  else if(char==='\n'){row.push(field);rows.push(row);row=[];field=''}
  else if(char!=='\r')field+=char;
 }
 if(field!==''||row.length){row.push(field);rows.push(row)}
 if(!rows.length)return [];
 const headers=rows.shift().map(value=>value.replace(/^\uFEFF/,'').trim());
 return rows.filter(values=>values.some(value=>value.trim()!=='')).map(values=>
  Object.fromEntries(headers.map((header,index)=>[header,values[index]??'']))
 );
}
function validArchivePath(path){
 if(typeof path!=='string'||!path.trim())return false;
 const value=path.trim();
 return value.startsWith('images/')&&!value.includes('\\')&&
  !value.split('/').some(part=>!part||part==='.'||part==='..')&&
  /^[A-Za-z0-9._/-]+$/.test(value);
}
function archiveImageUrl(path){
 const webpPath=/\.webp$/i.test(path)?path:path.replace(/\.(?:jpe?g|png|gif|bmp|tiff?)$/i,'')+'.webp';
 return IMAGE_BASE+webpPath.split('/').map(part=>encodeURIComponent(part)).join('/');
}
function getPersonImage(person){
 const name=normalizeName(person.full_name||person.name||'');
 const matches=personImages.get(name)||[];
 // Repeated names in either source are resolved only by the original source URL.
 const uniqueRecord=recordNameCounts.get(name)===1;
 const match=matches.length===1&&uniqueRecord?matches[0]:matches.find(item=>item.sourceUrl&&item.sourceUrl===person.image);
 if(!match)return person.image||'';
 if(validArchivePath(match.path))return archiveImageUrl(match.path);
 return match.sourceUrl||person.image||'';
}
async function loadImageManifest(){
 try{
  const response=await fetch(IMAGE_MANIFEST,{mode:'same-origin',credentials:'same-origin'});
  if(!response.ok)throw new Error('image manifest '+response.status);
  const rows=await response.json();
  const next=new Map();
  for(const row of rows){
   const name=normalizeName(row.n||'');
   const path=(row.p||'').trim();
   const sourceUrl=(row.u||'').trim();
   if(!name||(!validArchivePath(path)&&!sourceUrl.startsWith('https://')&&!sourceUrl.startsWith('http://')))continue;
   const matches=next.get(name)||[];
   matches.push({path,sourceUrl});
   next.set(name,matches);
  }
  personImages=next;
  console.info('Yademan image archive loaded',personImages.size,'unique names');
  if(selected>=0&&nameCard.classList.contains('visible'))renderName(selected);
 }catch(error){
  personImages=new Map();
  console.error('Yademan image manifest could not be loaded; default portraits will be used',error);
 }
}
async function loadRecords(){
 const manifestTask=loadImageManifest();
 try{
  const response=await fetch('./data/javidnams_data.json');
  if(!response.ok)throw Error('records '+response.status);
  const source=await response.json();
  records=source.map((person,index)=>({...person,full_name:person.name||'نام ثبت نشده',row:index+1}));
  recordNameCounts=new Map();
  for(const person of records){
   const name=normalizeName(person.full_name);
   recordNameCounts.set(name,(recordNameCounts.get(name)||0)+1);
  }
  buildPeople();
  manifestTask.catch(error=>console.error('Yademan image manifest failed',error));
 }catch(e){console.error('Yademan records could not be loaded',e)}
 finally{document.querySelector('#load-state')?.classList.add('is-hidden');requestAnimationFrame(()=>startEntryZoom())}
}
loadRecords();

const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.075;
const pointer=new THREE.Vector2();
function pick(x,y){
 if(!points)return -1;
 pointer.set((x/innerWidth)*2-1,-(y/innerHeight)*2+1);
 raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObject(points,false);
 return hits.length?hits[0].index:-1;
}
function renderName(index){
 if(index<0||index>=records.length)return;
 const person=records[index];selected=index;
 if(selectedMarker&&points){selectedMarker.position.fromArray(points.geometry.attributes.position.array,index*3);selectedMarker.visible=true}
 personName.textContent=person.full_name;personAge.textContent=person.age||'سن ثبت نشده';personPlace.textContent=person.place||'محل ثبت نشده';personDate.textContent=person.date||'';personDate.hidden=!person.date;personImage.loading='eager';personImage.fetchPriority='high';loadPhotoWithoutFlash(personImage,nameCard,getPersonImage(person),person.full_name);nameCard.classList.add('visible');
}
function showName(index,fromPhoto=false){
 if(index<0||index>=records.length)return;
 if(photoFocusTimer!==null){clearTimeout(photoFocusTimer);photoFocusTimer=null}
 photoFocusActive=false;centerPhotoIndex=-1;nameCard.classList.remove('is-center-following');
 renderName(index);
 if(fromPhoto)photoFocusTimer=setTimeout(()=>{photoFocusTimer=null;photoFocusActive=true;centerPhotoIndex=-1;nameCard.classList.add('is-center-following')},5000);
}
function hideName(){if(photoFocusTimer!==null){clearTimeout(photoFocusTimer);photoFocusTimer=null}photoFocusActive=false;centerPhotoIndex=-1;nameCard.classList.remove('is-center-following');nameCard.classList.remove('visible');selected=-1;if(selectedMarker)selectedMarker.visible=false;}
const world=document.querySelector('#world');
world.addEventListener('pointerdown',e=>{if(searchOpen)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,onPhoto:!!e.target.closest?.('.photo-node')});world.setPointerCapture(e.pointerId);if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);dragging=false;moved=true;return}dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;pointerDownAt=performance.now();world.style.cursor='grabbing'});
world.addEventListener('pointermove',e=>{if(!dragging&&pointers.size===0&&camera.position.z<7.2){const h=pick(e.clientX,e.clientY);if(h!==hovered){hovered=h;if(h>=0&&selected<0){selectedMarker.position.fromArray(points.geometry.attributes.position.array,h*3);selectedMarker.visible=true}else if(selected<0&&selectedMarker)selectedMarker.visible=false}}if(pointers.has(e.pointerId)){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)setZoom(currentZoom()+(pinchDistance-d)*.018);pinchDistance=d;return}}if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;targetY+=dx*.005;targetX+=dy*.004;targetX=Math.max(-1.25,Math.min(1.25,targetX));lastX=e.clientX;lastY=e.clientY});
function release(e){const pointerInfo=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(pointers.size<2)pinchDistance=0;if(!dragging)return;dragging=false;world.style.cursor='grab';if(!moved&&performance.now()-pointerDownAt<450&&!pointerInfo?.onPhoto){const i=pick(e.clientX,e.clientY);if(i>=0)showName(i);else hideName()}}
world.addEventListener('pointerup',release);world.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);dragging=false;pinchDistance=0;world.style.cursor='grab'});
world.addEventListener('wheel',e=>{if(e.target.closest?.('#search-layer'))return;e.preventDefault();setZoom(currentZoom()+e.deltaY*.006);},{passive:false});
document.querySelector('#zoom-in').addEventListener('click',()=>setZoom(currentZoom()-.8));
document.querySelector('#zoom-out').addEventListener('click',()=>setZoom(currentZoom()+.8));
document.querySelector('#zoom-reset').addEventListener('click',()=>setZoom(14-.75*(14-4.35)));

/* Minimal memorial audio player. Playback starts only after an explicit play-button click. */
const musicAudio=new Audio();
musicAudio.preload='auto';
musicAudio.volume=.72;
const musicPlay=document.querySelector('#music-play');
const musicPrev=document.querySelector('#music-prev');
const musicNext=document.querySelector('#music-next');
const musicProgress=document.querySelector('#music-progress');
const musicCurrent=document.querySelector('#music-current-time');
const musicDuration=document.querySelector('#music-duration');
const musicControls=document.querySelector('#music-controls');
let musicTracks=[],musicIndex=-1;
const musicDigits=value=>String(value).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
function musicClock(value){
 if(!Number.isFinite(value)||value<0)return '۰:۰۰';
 const minutes=Math.floor(value/60),seconds=Math.floor(value%60);
 return musicDigits(minutes+':'+String(seconds).padStart(2,'0'));
}
function updateMusicButtons(){
 const ready=musicTracks.length>0;
 musicPrev.disabled=!ready;musicNext.disabled=!ready;musicPlay.disabled=!ready;
 musicProgress.disabled=!ready||!Number.isFinite(musicAudio.duration);
}
function setMusicTrack(index,autoplay=false){
 if(!musicTracks.length)return;
 musicIndex=(index+musicTracks.length)%musicTracks.length;
 musicAudio.pause();
 musicAudio.src=musicTracks[musicIndex].src;
 musicAudio.load();
 musicCurrent.textContent='۰:۰۰';musicDuration.textContent='۰:۰۰';musicProgress.value='0';
 musicPlay.classList.remove('is-playing');musicPlay.setAttribute('aria-label','پخش موسیقی');
 updateMusicButtons();
 if(autoplay)playMusic();
}
async function playMusic(){
 if(musicIndex<0&&musicTracks.length)setMusicTrack(0,false);
 if(!musicAudio.src)return;
 musicAudio.volume=.72;
 try{await musicAudio.play()}
 catch(error){console.info('Browser blocked automatic audio playback until user interaction.')}
}
musicPlay.addEventListener('click',()=>{if(musicAudio.paused)playMusic();else musicAudio.pause()});
musicPrev.addEventListener('click',()=>setMusicTrack(musicIndex-1,true));
musicNext.addEventListener('click',()=>setMusicTrack(musicIndex+1,true));
musicAudio.addEventListener('play',()=>{musicPlay.classList.add('is-playing');musicPlay.setAttribute('aria-label','توقف موقت موسیقی')});
musicAudio.addEventListener('pause',()=>{musicPlay.classList.remove('is-playing');musicPlay.setAttribute('aria-label','پخش موسیقی')});
musicAudio.addEventListener('loadedmetadata',()=>{musicDuration.textContent=musicClock(musicAudio.duration);updateMusicButtons()});
musicAudio.addEventListener('timeupdate',()=>{
 musicCurrent.textContent=musicClock(musicAudio.currentTime);
 if(Number.isFinite(musicAudio.duration)&&musicAudio.duration>0)musicProgress.value=String(Math.round(musicAudio.currentTime/musicAudio.duration*1000));
});
musicAudio.addEventListener('ended',()=>setMusicTrack(musicIndex+1,true));
musicAudio.addEventListener('error',()=>{if(musicIndex>=0)console.error('Yademan music file could not be loaded')});
musicProgress.addEventListener('input',()=>{
 if(Number.isFinite(musicAudio.duration)&&musicAudio.duration>0)musicAudio.currentTime=(Number(musicProgress.value)/1000)*musicAudio.duration;
});
musicControls.addEventListener('pointerdown',e=>e.stopPropagation());
musicControls.addEventListener('click',e=>e.stopPropagation());
fetch('./assets/music/playlist.json').then(response=>{
 if(!response.ok)throw new Error('playlist unavailable');
 return response.json();
}).then(data=>{
 const entries=Array.isArray(data)?data:data.tracks;
 if(!Array.isArray(entries))throw new Error('invalid playlist');
 musicTracks=entries.filter(track=>track&&typeof track.src==='string'&&
  (track.src.startsWith('./assets/music/')||track.src.startsWith('assets/music/'))).map(track=>({src:track.src}));
 if(musicTracks.length)setMusicTrack(0,false);
 else updateMusicButtons();
}).catch(()=>updateMusicButtons());

function openSearch(){searchOpen=true;searchLayer.classList.add('open');searchLayer.setAttribute('aria-hidden','false');hideName();searchInput.focus()}
const searchToggle=document.querySelector('#search-toggle');
searchToggle?.addEventListener('pointerdown',e=>e.stopPropagation());
searchToggle?.addEventListener('click',openSearch);
function closeSearch(){searchOpen=false;searchLayer.classList.remove('open');searchLayer.setAttribute('aria-hidden','true');searchInput.value='';results.replaceChildren()}
function normalizeName(value){
 return String(value||'').toLocaleLowerCase()
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
  .replace(/[\u064B-\u065F\u0670]/g,'')
  .replace(/[\u200c\u200f\u200e]/g,' ')
  .replace(/[ـ]/g,'').replace(/\s+/g,' ').trim();
}
function latinToPersian(value){
 const source=normalizeName(value).replace(/[^a-z\\s]/g,' ').replace(/\\s+/g,' ').trim();
 if(!source)return [];
 const single={
  b:['ب'],c:['ک','س'],d:['د'],f:['ف'],g:['گ','ج'],h:['ه','ح'],j:['ج'],k:['ک'],l:['ل'],m:['م'],n:['ن'],p:['پ'],q:['ق'],r:['ر'],s:['س','ص','ث'],t:['ت','ط'],v:['و'],w:['و'],x:['کس'],y:['ی'],z:['ز','ذ','ض','ظ']
 };
 const pairs={sh:['ش'],ch:['چ'],zh:['ژ'],kh:['خ'],gh:['غ'],ph:['ف'],th:['ث','ت'],aa:['ا'],ee:['ی'],ei:['ی'],ai:['ای'],oo:['و'],ou:['و']};
 function wordOptions(word){
  let variants=[''];
  for(let i=0;i<word.length;){
   const pair=word.slice(i,i+2),char=word[i];
   let choices=pairs[pair],step=2;
   if(!choices){
    step=1;
    if(char==='a')choices=i===0?['ع','ا']:['','ا'];
    else if(char==='e'||char==='i')choices=['','ی'];
    else if(char==='o'||char==='u')choices=['','و'];
    else choices=single[char]||[char];
    if(i+1<word.length&&word[i+1]===char&&single[char]){
     choices=[...choices,...single[char].map(x=>x)];
     step=2;
    }
   }
   variants=[...new Set(variants.flatMap(prefix=>choices.map(choice=>prefix+choice)))].slice(0,160);
   i+=step;
  }
  return variants.map(normalizeName).filter(Boolean);
 }
 let phrases=[''];
 for(const word of source.split(' ')){
  const choices=wordOptions(word);
  phrases=[...new Set(phrases.flatMap(prefix=>choices.map(choice=>prefix?prefix+' '+choice:choice)))].slice(0,320);
 }
 return phrases;
}
function drawResults(q){
 results.replaceChildren();
 const raw=normalizeName(q);if(!raw)return;
 const needles=[raw];
 if(/[a-z]/i.test(raw)){
  const converted=latinToPersian(raw);
  if(converted.length)needles.push(...converted);
 }
 const found=records.filter(person=>{
  const name=normalizeName(person.full_name);
  return needles.some(needle=>needle&&name.startsWith(needle));
 }).sort((a,b)=>a.full_name.localeCompare(b.full_name,'fa'));
 for(const item of found.slice(0,60)){
  const b=document.createElement('button');b.className='result';b.type='button';b.textContent=item.full_name;
  b.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();
   const index=records.indexOf(item);
   if(index>=0&&points&&selectedMarker){showName(index);closeSearch()}
  });
  results.append(b);
 }
 if(!found.length){const empty=document.createElement('div');empty.className='search-empty';empty.textContent='نامی با این حروف پیدا نشد';results.append(empty)}
}
searchInput.addEventListener('input',()=>drawResults(searchInput.value));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSearch();hideName()}else if(e.key==='/'&&!searchOpen&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();openSearch()}});
searchLayer.addEventListener('pointerdown',e=>e.stopPropagation());

function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?52:42;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);if(points&&points.material.uniforms)points.material.uniforms.uPixelRatio.value=Math.min(devicePixelRatio,2)}
addEventListener('resize',resize);
const clock=new THREE.Clock();
function loadPhotoWithoutFlash(img,node,src,personName=''){
 const fallback=DEFAULT_PERSON_IMAGE;
 const requested=src||fallback;
 const failed=img.dataset.failedSrc===requested;
 const target=failed?fallback:requested;
 const fallbackAlt=personName?'تصویر پیش‌فرض برای '+personName:'تصویر پیش‌فرض یادمان';
 const alt=target===fallback?fallbackAlt:(personName?'تصویر '+personName:'تصویر فرد');
 if(img.dataset.loadedSrc===target){img.alt=alt;img.hidden=false;node.classList.remove('image-missing');return}
 if(img.dataset.pendingSrc===target)return;
 // Clear the previous portrait immediately so a previous person's photo never flashes.
 img.dataset.pendingSrc=target;
 img.dataset.loadedSrc='';
 img.removeAttribute('src');
 img.alt=alt;
 img.hidden=false;
 node.classList.remove('image-missing');
 img.onload=()=>{
  if(img.dataset.pendingSrc!==target)return;
  img.dataset.loadedSrc=target;
  img.dataset.pendingSrc='';
  node.classList.remove('image-missing');
 };
 img.onerror=()=>{
  if(img.dataset.pendingSrc!==target)return;
  if(target!==fallback){
   img.dataset.failedSrc=requested;
   img.dataset.pendingSrc=fallback;
   img.dataset.loadedSrc='';
   img.alt=fallbackAlt;
   img.onload=()=>{
    if(img.dataset.pendingSrc!==fallback)return;
    img.dataset.loadedSrc=fallback;
    img.dataset.pendingSrc='';
    node.classList.remove('image-missing');
   };
   img.onerror=()=>{
    if(img.dataset.pendingSrc!==fallback)return;
    img.dataset.pendingSrc='';
    img.dataset.loadedSrc='';
    node.classList.add('image-missing');
   };
   img.src=fallback;
   return;
  }
  img.dataset.pendingSrc='';
  img.dataset.loadedSrc='';
  node.classList.add('image-missing');
 };
 img.src=target;
}
function updatePhotoField(now){
 const reveal=THREE.MathUtils.smoothstep(6.9-camera.position.z,0,1);
 photoField.style.opacity=String(reveal);
 photoField.style.pointerEvents=reveal>.2?'auto':'none';
 if(reveal<.02||now-photoRefreshAt<110)return;
 photoRefreshAt=now;
 if(!points||!records.length)return;
 root.updateMatrixWorld(true);
 const candidates=[];
 const attr=pointGeometry.attributes.position;
 const v=new THREE.Vector3(),view=new THREE.Vector3(),projected=new THREE.Vector3();
 for(let i=0;i<records.length;i++){
  const person=records[i];
  v.fromBufferAttribute(attr,i).applyMatrix4(root.matrixWorld);
  view.copy(v).applyMatrix4(camera.matrixWorldInverse);
  if(view.z>-.05)continue;
  projected.copy(v).project(camera);
  const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
  if(x< -60||x>innerWidth+60||y< -60||y>innerHeight+60)continue;
  candidates.push({i,x,y,depth:view.z});
 }
 candidates.sort((a,b)=>b.depth-a.depth);
 const chosen=candidates.slice(0,56), keep=new Set(chosen.map(x=>x.i));
 const priorityIds=new Set([...chosen].sort((a,b)=>Math.hypot(a.x-innerWidth/2,a.y-innerHeight/2)-Math.hypot(b.x-innerWidth/2,b.y-innerHeight/2)).slice(0,8).map(x=>x.i));
 if(photoFocusActive&&chosen.length){
  const centerX=innerWidth/2,centerY=innerHeight/2;
  const ranked=chosen.map(item=>({...item,centerDistance:Math.hypot(item.x-centerX,item.y-centerY)})).sort((a,b)=>a.centerDistance-b.centerDistance);
  let candidate=ranked[0];
  const current=ranked.find(item=>item.i===centerPhotoIndex);
  if(current&&current.centerDistance<=candidate.centerDistance+18)candidate=current;
  const focusLimit=Math.min(140,Math.max(82,innerWidth*.24));
  if(candidate&&candidate.centerDistance<=focusLimit&&candidate.i!==centerPhotoIndex){centerPhotoIndex=candidate.i;renderName(centerPhotoIndex)}
 }
 for(const [id,node] of photoNodes){if(!keep.has(id)){node.style.visibility='hidden';node.style.opacity='0'}}
 for(const item of chosen){
  let node=photoNodes.get(item.i);
  if(!node){
   node=document.createElement('button');node.type='button';node.className='photo-node';node.setAttribute('aria-label',records[item.i].full_name);
   const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.alt='تصویر '+records[item.i].full_name;img.hidden=true;node.append(img);
   const flare=document.createElement('span');flare.className='photo-flare';node.append(flare);
   node.addEventListener('click',e=>{e.stopPropagation();showName(item.i,true)});
   photoField.append(node);photoNodes.set(item.i,node);
  }
  const scale=THREE.MathUtils.clamp(1.35-Math.abs(item.depth)/18,.78,1.15);
  const image=node.querySelector('img');
  if(priorityIds.has(item.i)){image.loading='eager';image.fetchPriority='high'}
  else{image.loading='lazy';image.fetchPriority='low'}
  loadPhotoWithoutFlash(image,node,getPersonImage(records[item.i]),records[item.i].full_name);
  node.style.visibility='visible';node.style.opacity='1';
  node.style.transform=`translate3d(${item.x}px,${item.y}px,0) translate(-50%,-50%) scale(${scale})`;
  node.classList.toggle('is-selected',item.i===selected);
 }
}
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();rotationX+=(targetX-rotationX)*.055;rotationY+=(targetY-rotationY)*.055;root.rotation.x=rotationX+Math.sin(t*.12)*.018;root.rotation.y=rotationY+t*.025;stars.rotation.y=-t*.003;stars.rotation.x=Math.sin(t*.07)*.018;if(entryZoomActive){const progress=Math.min(1,(performance.now()-entryZoomStartedAt)/2600),eased=progress*progress*(3-2*progress);camera.position.z=entryZoomFrom+(4.35-entryZoomFrom)*eased;if(progress>=1){camera.position.z=4.35;targetZoom=4.35;entryZoomActive=false}}else camera.position.z+=(targetZoom-camera.position.z)*.12;if(zoomLabel)zoomLabel.textContent=Math.round((14-camera.position.z)/(14-4.35)*100)+'%';if(points){points.material.uniforms.uTime.value=t;const glow=root.getObjectByName('glow');if(glow)glow.material.opacity=.09+Math.sin(t*1.35)*.035;if(selectedMarker&&selectedMarker.visible){const pulse=1+Math.sin(t*4.8)*.12;selectedMarker.scale.setScalar(pulse);selectedMarker.children[1].rotation.z=t*.65;selectedMarker.children[2].material.opacity=.09+Math.sin(t*4.8)*.045}}updatePhotoField(performance.now());renderer.render(scene,camera)}
animate();