(()=>{'use strict';
const root=document.getElementById('city-device');if(!root||root.dataset.ready)return;root.dataset.ready='1';
const $=id=>document.getElementById(id),cnv=$('city-canvas'),g=cnv.getContext('2d'),W=480,H=300;
const isEn=()=>window.BoringI18n?.getLanguage()==='en',tr=(a,b)=>isEn()?b:a;
const offsets=[[0,-1],[1,0],[0,1],[-1,0]],rev=d=>(d+2)%4;
let level=1,cleared=0,steps=0,size=4,cells=[],powered=new Set(),targets=[],levelWin=false,renderRequested=false,seed=0,epoch=0,frame=0,last=0;
const low=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
try{cleared=Number(localStorage.getItem('boringlab.city.cleared.v1'))||0;level=cleared+1}catch{}
function rng(n){return Math.floor(rand()*n)}
function gen(){
 epoch++;levelWin=false;steps=0;size=level<4?4:level<9?5:6;
 seed=(level*2971215073+Math.floor(Math.random()*100000))>>>0;
 const n=size*size;cells=Array.from({length:n},(_,i)=>({i,base:[],rotation:0,source:false,target:false}));
 const source=n-size;cells[source].source=true;
 const visit=new Set([source]),frontier=[];
 function addFrontier(i){const row=Math.floor(i/size),col=i%size;
   offsets.forEach(([dx,dy],dir)=>{const rr=row+dy,cc=col+dx;if(rr>=0&&cc>=0&&rr<size&&cc<size&&!visit.has(rr*size+cc))frontier.push({from:i,to:rr*size+cc,dir})})
 }
 addFrontier(source);
 while(frontier.length){const j=rng(frontier.length),edge=frontier.splice(j,1)[0];
  if(visit.has(edge.to))continue;
  cells[edge.from].base.push(edge.dir);cells[edge.to].base.push(rev(edge.dir));visit.add(edge.to);addFrontier(edge.to);
 }
 // Leaf nodes and far-apart branch nodes are fixed districts, with a valid solution at every level.
 const count=level<4?4:level<9?5:6;
 function dist(a,b){return Math.abs(Math.floor(a/size)-Math.floor(b/size))+Math.abs(a%size-b%size)}
 let candidates=cells.filter(x=>!x.source);
 targets=[];
 while(targets.length<count&&candidates.length){let index=0,score=-1;
  candidates.forEach((node,i)=>{const isLeaf=node.base.length===1;
   const separation=targets.length?Math.min(...targets.map(t=>dist(t,node.i))):dist(source,node.i);
   const value=separation*2.8+dist(source,node.i)*.65+(isLeaf?3:0)+rand()*.3;
   if(value>score){score=value;index=i}
  });
  targets.push(candidates.splice(index,1)[0].i);
 }
 targets.forEach(i=>cells[i].target=true);
 cells.forEach(cell=>{if(!cell.source&&!cell.target)cell.rotation=1+rng(3)});
 for(let i=0;i<20;i++){solve();if(targets.some(i=>!powered.has(i)))break;cells.filter(c=>!c.source&&!c.target).forEach(c=>c.rotation=rng(4))}
 solve();paintBoard();show();
 $('city-overlay').hidden=true;message(tr('从左下角的发电站开始，给城区接通电力。','Connect the power plant to every district.'));
}
function connections(cell){return cell.base.map(d=>(d+cell.rotation)%4)}
function solve(){
 const queue=[size*(size-1)];powered=new Set(queue);
 for(let p=0;p<queue.length;p++){
  const i=queue[p],row=Math.floor(i/size),col=i%size;
  for(const d of connections(cells[i])){
   const xx=col+offsets[d][0],yy=row+offsets[d][1];if(xx<0||yy<0||xx>=size||yy>=size)continue;
   const j=yy*size+xx;if(!powered.has(j)&&connections(cells[j]).includes(rev(d))){powered.add(j);queue.push(j)}
  }
 }
}
function label(cell){return cell.source?tr('电站','POWER'):cell.target?tr('城区','DISTRICT'):''}
function svg(cell){
 const on=powered.has(cell.i),p=connections(cell),base=on?'#d4b879':'#718e9c',outer=on?'#917646':'#203745';
 let lines='';const edge=[[50,5],[95,50],[50,95],[5,50]];
 for(const d of p){lines+=`<path d="M50 50L${edge[d][0]} ${edge[d][1]}" stroke="${outer}" stroke-width="22" stroke-linecap="round"/><path d="M50 50L${edge[d][0]} ${edge[d][1]}" stroke="${base}" stroke-width="14" stroke-linecap="round"/><path d="M50 50L${edge[d][0]} ${edge[d][1]}" stroke="${on?'#fff4b5':'#e4f0e1'}" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`}
 return `<svg viewBox="0 0 100 100" aria-hidden="true">${lines}<circle cx="50" cy="50" r="17" fill="${on?'#ecd28e':'#72909b'}" stroke="${on?'#fff3c5':'#c8d7d4'}" stroke-width="3"/><circle cx="50" cy="50" r="8" fill="${on?'#9e7b49':'#2b4350'}"/></svg>`
}
function paintBoard(){const board=$('city-board');board.style.setProperty('--n',size);board.replaceChildren();
 cells.forEach(cell=>{const b=document.createElement('button');b.className='city-tile'+(powered.has(cell.i)?' powered':'')+(cell.source||cell.target?' fixed':'');b.innerHTML=svg(cell);
  if(cell.source||cell.target){const s=document.createElement('span');s.className='tile-label';s.textContent=label(cell);b.appendChild(s)}
  b.setAttribute('aria-label',tr('旋转电路','Rotate circuit')+' '+(cell.i+1));b.disabled=cell.source||cell.target||levelWin;
  b.addEventListener('click',()=>rotate(cell.i));board.appendChild(b);
 });}
function message(text){$('city-message').textContent=text}
function show(){const lit=targets.filter(x=>powered.has(x)).length;
 $('city-level').textContent=String(level).padStart(2,'0');$('city-score').textContent=lit+'/'+targets.length;$('city-cleared').textContent=cleared;
 $('city-label').textContent=lit===targets.length?tr('城市全面恢复供电','Full power restored'):lit?tr('电网恢复中 · ','Restoring districts · ')+lit+'/'+targets.length:tr('全城停电 · 等待恢复','City blackout · No power');
 drawCity();
 if(lit===targets.length&&!levelWin){
  levelWin=true;cleared=Math.max(cleared,level);
  try{localStorage.setItem('boringlab.city.cleared.v1',String(cleared))}catch{}
  $('city-cleared').textContent=cleared;paintBoard();
  $('city-win-title').textContent=tr('整座城市，醒了！','The City Is Awake!');
  $('city-win-level').textContent='#'+String(level).padStart(2,'0');
  $('city-win-desc').textContent=tr('所有城区重新亮灯。你旋转了 '+steps+' 次管线。下一座城市的线路会更加复杂。','Every district is lit. You rotated '+steps+' pipes. The next city has a harder grid.');
  const current=epoch;setTimeout(()=>{if(epoch===current&&levelWin)$('city-overlay').hidden=false},900);
 }
}
function rotate(i){if(levelWin||cells[i].source||cells[i].target)return;cells[i].rotation=(cells[i].rotation+1)%4;steps++;
 const old=targets.filter(x=>powered.has(x)).length;solve();paintBoard();show();
 const count=targets.filter(x=>powered.has(x)).length;
 message(count>old?tr('电流接通！又一片城区亮起。','Power connected! Another district lights up.'):count<old?tr('电路断开了，再调整管线方向。','A connection broke. Rotate the pipes again.'):tr('管线已旋转，寻找通往城区的正确线路。','Pipe rotated. Find a path to the next district.'));
}
function hint(){if(levelWin)return;
 // Always identify a boundary tile from the current powered network. This is a useful nontrivial hint.
 let chosen=-1;const pool=cells.filter(c=>!c.source&&!c.target&&c.rotation!==0);
 for(const c of pool){if(powered.has(c.i)||c.base.some(d=>{
  const row=Math.floor(c.i/size),col=c.i%size,r=row+offsets[d][1],cc=col+offsets[d][0];return r>=0&&r<size&&cc>=0&&cc<size&&powered.has(r*size+cc)
 })){chosen=c.i;break}}
 if(chosen<0)chosen=pool[0]?.i??-1;
 if(chosen<0){message(tr('线路方向已经正确。','All pipes are aligned.'));return}
 const c=cells[chosen];c.rotation=(c.rotation+3)%4; // a turn counter-clockwise toward the generated solution
 steps++;solve();paintBoard();show();const el=$('city-board').children[chosen];el?.classList.add('hinted');
 message(tr('已调整一块管线，请沿着亮起的线路继续。','Aligned one pipe. Follow the glowing connection.'));
}
function next(){level++;gen()}
function rounded(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h)}
function poly(points,col){g.fillStyle=col;g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill()}
function glow(x,y,r,col){let grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,col);grad.addColorStop(1,'#0000');g.fillStyle=grad;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
function tower(x,y,w,h,depth,on,id){
 poly([[x,y-h],[x+w,y-h],[x+w,y],[x,y]],on?'#35596c':'#1e3548');poly([[x+w,y-h],[x+w+depth,y-h-depth*.4],[x+w+depth,y-depth*.4],[x+w,y]],on?'#2a4455':'#162b3a');
 poly([[x,y-h],[x+depth,y-h-depth*.4],[x+w+depth,y-h-depth*.4],[x+w,y-h]],on?'#5a7783':'#2e4253');
 for(let row=0;row<Math.floor((h-13)/13);row++)for(let col=0;col<Math.floor((w-13)/11);col++){
  const wx=x+8+col*11,wy=y-h+10+row*13,lit=on&&(row*17+col*7+id*11)%9!==0;
  rounded(wx,wy,4.5,6,lit?'#f2d898':'#0d2331');if(lit)rounded(wx,wy,4.5,1.4,'#fff5cf98');
 }
 if(on)glow(x+w/2,y-h/2,Math.max(30,w),'#ffe1a016');
}
function drawCity(){
 const s=g.createLinearGradient(0,0,0,H);s.addColorStop(0,'#0d223e');s.addColorStop(.65,'#23394f');s.addColorStop(1,'#0a1b2d');g.fillStyle=s;g.fillRect(0,0,W,H);
 for(let i=0;i<37;i++){g.fillStyle=i%3?'#ffffff48':'#ffffff8c';rounded((i*137)%W,(i*59)%139,1.1,1.1,'#ddeafa66')}
 glow(382,42,55,'#e6eff518');g.fillStyle='#ced9da';g.beginPath();g.arc(379,43,15,0,7);g.fill();g.fillStyle='#12263b';g.beginPath();g.arc(384,38,15,0,7);g.fill();
 for(let i=0;i<27;i++)rounded(i*19,208-(i*43%66),18,80,'#1b3044');
 poly([[0,220],[480,211],[480,300],[0,300]],'#152d41');
 for(let i=0;i<9;i++){g.strokeStyle='#7191a53a';g.lineWidth=1;g.beginPath();g.moveTo(i*70,214);g.lineTo(i*70-63,300);g.stroke()}
 for(let i=0;i<5;i++){g.beginPath();g.moveTo(0,215+i*i*6);g.lineTo(480,215+i*i*6);g.stroke()}
 const hits=targets.map(i=>powered.has(i));
 const buildings=[[18,242,58,98,12,0],[84,245,28,65,8,0],[113,245,66,155,14,1],[188,243,45,124,11,1],[234,249,36,199,12,2],[275,246,29,106,9,2],[312,241,63,145,12,3],[387,241,54,110,10,4],[442,242,29,84,8,5]];
 buildings.forEach((b,i)=>{let on=hits[b[5]%hits.length]||false;tower(...b.slice(0,5),on,i)});
 if(hits.some(Boolean))for(let i=0;i<11;i++){if(!hits[i%hits.length])continue;rounded((i*51)%480,269,25,2,'#ffe1a0a0')}
 if(hits.every(Boolean)){glow(230,85,110,'#ffe5af20');glow(410,90,85,'#fff6bd17')}
}
$('city-hint').addEventListener('click',hint);$('city-reset').addEventListener('click',gen);$('city-next').addEventListener('click',next);
window.addEventListener('boringlab:language',()=>{paintBoard();show();message(tr('点击旋转管线，让所有城区亮起来。','Tap to rotate pipes and light every district.'));
 if(levelWin){$('city-win-title').textContent=tr('整座城市，醒了！','The City Is Awake!');$('city-win-desc').textContent=tr('本关已完成，继续挑战下一座城市。','Level complete. Continue to the next city.')}});
gen();
})();
