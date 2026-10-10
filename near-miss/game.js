(()=>{'use strict';
const root=document.getElementById('runDevice');
if(!root||root.dataset.ready)return;
root.dataset.ready='1';
const $=id=>document.getElementById(id);
const canvas=$('runCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const W=380,H=660,BALL_Y=465,R=10.5;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
const format=n=>Math.floor(n).toLocaleString('en-US');
const phrases={
  zoneWide:['宽阔加速段','Wide acceleration zone'],zoneBend:['连续金属弯道','Winding metal track'],zoneNarrow:['极窄警戒区','Narrow danger zone'],zoneObstacle:['精密避障区','Precision obstacle zone'],
  ready:['钢珠已就位','Ball ready'],readyDetail:['轨道没有尽头，小心障碍物','Endless track. Watch the obstacles.'],
  running:['正在前进','Moving forward'],runningDetail:['左右转向，保持安全距离','Steer left or right. Keep clear.'],
  braking:['刹车减速中','Braking'],brakingDetail:['松开 S 或再次按 W 前进','Release S or press W to accelerate.'],
  pause:['等待继续前进','Waiting to move'],pauseDetail:['按 W 前进，A/D 转向','Press W to move, A/D to steer.'],
  near:['危险！即将碰撞','Danger! Collision ahead'],nearDetail:['提前调整方向，找到安全空隙','Steer early to find a safe gap.'],
  milestone:['突破 {n} 米！','{n} m milestone!'],milestoneDetail:['继续挑战最远距离','Keep pushing your record.'],
  failed:['挑战失败','Run ended'],failedDetail:['再试一次，突破自己的纪录','Try again and beat your record.'],
  titleShort:['再稳一点！','So close!'],titleStandard:['撞上了！','Crash!'],titleLong:['就差一点！','Almost made it!'],
  reasonEdge:['钢珠擦到了金属轨道边缘。','The steel ball clipped the track edge.'],reasonObstacle:['钢珠撞上了轨道上的障碍物。','The steel ball hit an obstacle.']
};
let lang='zh';
function language(){try{return window.BoringI18n?.getLanguage()==='en'?'en':'zh'}catch{return 'zh'}}
function t(id,vars={}){const s=phrases[id]?.[lang==='en'?1:0]||id;return s.replace(/\{(\w+)\}/g,(_,key)=>String(vars[key]??''))}
let distance=0,ballX=190,targetX=190,velocityX=0,velocity=0,pressed=false,dead=false,played=false,elapsed=0,record=0;
let pointerId=null,pointerStartX=0,ballStartX=190,lastFrame=0,request=0,lastHud=0;
let spark=[],flash=0,trail=[],keyW=false,keyS=false,keyA=false,keyD=false,warning=false,toastUntil=0,milestoneNumber=0,crashReason='reasonObstacle';
const BEST_KEY='boringlab.near-miss.best.v1';
try{const saved=Number(localStorage.getItem(BEST_KEY));if(Number.isFinite(saved)&&saved>0)record=saved}catch{}
function noise(index,key=0){
 let a=(Math.imul(index+1009,0x9e3779b1)^Math.imul(key+79,0x85ebca6b))>>>0;
 a=Math.imul(a^(a>>>16),0x7feb352d)>>>0;
 a=Math.imul(a^(a>>>15),0x846ca68b)>>>0;
 return ((a^(a>>>16))>>>0)/4294967296;
}
function anchor(i){return i<2?190:190+(noise(i,3)-.5)*116}
function center(s){
 if(s<0)return 190;
 const i=Math.floor(s/330),t=(s-i*330)/330,t2=t*t,t3=t2*t;
 const a=anchor(i-1),b=anchor(i),c=anchor(i+1),d=anchor(i+2);
 return clamp(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3),120,260);
}
function anchorWidth(i){
 if(i<=0)return 75;
 const n=noise(i,12);
 if(n<.23)return 34+noise(i,21)*9;
 if(n<.54)return 48+noise(i,22)*12;
 if(n<.78)return 62+noise(i,23)*14;
 return 78+noise(i,24)*9;
}
function halfWidth(s){if(s<130)return 75;const v=s-130,i=Math.floor(v/230);return lerp(anchorWidth(i),anchorWidth(i+1),ease((v-i*230)/230))}
function obstacle(index){
 if(index<0)return null;
 const s=520+index*278+(noise(index,7)-.5)*72;
 const hw=halfWidth(s),cx=center(s);
 let type=noise(index,8)<.43?'post':noise(index,8)<.76?'crate':'gate';
 if(hw<43&&type==='crate')type='post';
 if(index<2&&type==='gate')type='post';
 if(type==='gate'){
  const gapHalf=19+noise(index,19)*4;
  const maxOffset=Math.max(0,Math.min(18,hw-gapHalf-9));
  return {type,s,cx,hw,gap:cx+(noise(index,33)-.5)*2*maxOffset,gapHalf};
 }
 const r=type==='post'?12+noise(index,13)*3:17;
 const off=(noise(index,15)*2-1)*Math.min(Math.max(0,hw-r-13),25);
 return {type,s,cx,hw,x:cx+off,r,w:type==='crate'?31:0,h:type==='crate'?29:0};
}
function obstacles(){
 const start=Math.max(0,Math.floor((distance-390-520)/278)-1);
 const end=Math.floor((distance+BALL_Y+160-520)/278)+2;
 const result=[];
 for(let i=start;i<=end;i++){
  const o=obstacle(i);
  if(o&&o.s>distance-250&&o.s<distance+BALL_Y+120)result.push(o);
  if(i>3&&i%6===4){
   const s=o.s+67,hw=halfWidth(s),c=center(s),r=11;
   const off=(noise(i,41)>.5?1:-1)*Math.min(20,Math.max(0,hw-r-12));
   if(s>distance-250&&s<distance+BALL_Y+120)result.push({type:'post',s,x:c+off,cx:c,hw,r});
  }
 }
 return result;
}
// Stable, deterministic brushed steel pattern (generated locally; no image assets).
const texture=document.createElement('canvas');texture.width=176;texture.height=176;
const pt=texture.getContext('2d');let rngSeed=93;
function rand(){rngSeed=(Math.imul(rngSeed,1664525)+1013904223)>>>0;return rngSeed/4294967296}
pt.fillStyle='#72828b';pt.fillRect(0,0,176,176);
for(let i=0;i<3000;i++){
 const x=rand()*176,y=rand()*176;
 pt.strokeStyle=rand()>.5?'#ffffff1c':'#0c1b2235';pt.lineWidth=rand()*.8+.1;
 pt.beginPath();pt.moveTo(x,y);pt.lineTo(x+rand()*105+3,y+(rand()-.5)*.45);pt.stroke();
}
const metal=ctx.createPattern(texture,'repeat');
const sy=s=>BALL_Y+distance-s;
const sw=y=>distance+BALL_Y-y;
function railShape(extra){
 const path=new Path2D();
 for(let y=-8;y<=H+8;y+=4){const s=sw(y),edge=center(s)-halfWidth(s)-extra;if(y===-8)path.moveTo(edge,y);else path.lineTo(edge,y)}
 for(let y=H+8;y>=-8;y-=4){const s=sw(y);path.lineTo(center(s)+halfWidth(s)+extra,y)}
 path.closePath();return path;
}
function railLine(side,extra){ctx.beginPath();for(let y=-8;y<=H+8;y+=4){const s=sw(y),v=center(s)+side*(halfWidth(s)+extra);if(y===-8)ctx.moveTo(v,y);else ctx.lineTo(v,y)}}
function screw(x,y,r=5){
 const g=ctx.createRadialGradient(x-1,y-1,0,x,y,r);
 g.addColorStop(0,'#f0f5ec');g.addColorStop(.35,'#a7b4b5');g.addColorStop(.7,'#4b5d65');g.addColorStop(1,'#18252d');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#17262d';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-2.5,y+2.3);ctx.lineTo(x+2.5,y-2.3);ctx.stroke();
}
function background(){
 const g=ctx.createLinearGradient(0,0,W,H);
 g.addColorStop(0,'#697b86');g.addColorStop(.3,'#354b56');g.addColorStop(.7,'#5a6b72');g.addColorStop(1,'#33444e');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.26;ctx.fillStyle=metal;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
 for(const x of [14,366]){
  ctx.fillStyle='#1b303c';ctx.fillRect(x-7,0,14,H);
  ctx.fillStyle='#e1e9dd52';ctx.fillRect(x-5,0,1,H);
  ctx.fillStyle='#0816229b';ctx.fillRect(x+5,0,2,H);
  const start=Math.floor(sw(H)/105)*105;
  for(let v=start;v<sw(-10);v+=105){const y=sy(v);if(y>-10&&y<H+10)screw(x,y,4.8)}
 }
 const glow=ctx.createLinearGradient(0,0,W,0);
 glow.addColorStop(0,'#081622b9');glow.addColorStop(.14,'#d6f5e50e');glow.addColorStop(.52,'#ffffff0b');glow.addColorStop(.87,'#b0d7d810');glow.addColorStop(1,'#061421bd');
 ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
}
function track(){
 ctx.save();ctx.shadowColor='#000d';ctx.shadowBlur=17;ctx.shadowOffsetX=3;ctx.fillStyle='#17242b';ctx.fill(railShape(22));ctx.restore();
 ctx.fillStyle='#2b3b45';ctx.fill(railShape(19));
 const bevel=ctx.createLinearGradient(50,0,330,0);
 bevel.addColorStop(0,'#24343d');bevel.addColorStop(.2,'#c6d0cf');bevel.addColorStop(.4,'#7b9097');bevel.addColorStop(.6,'#b7c5c0');bevel.addColorStop(.83,'#647984');bevel.addColorStop(1,'#24343d');
 ctx.fillStyle=bevel;ctx.fill(railShape(13));
 ctx.save();ctx.globalAlpha=.27;ctx.fillStyle=metal;ctx.fill(railShape(13));ctx.restore();
 const floor=ctx.createLinearGradient(20,0,360,0);
 floor.addColorStop(0,'#07151e');floor.addColorStop(.24,'#1a303a');floor.addColorStop(.52,'#29414a');floor.addColorStop(.78,'#1b303a');floor.addColorStop(1,'#091720');
 ctx.fillStyle=floor;ctx.fill(railShape(0));
 ctx.save();ctx.clip(railShape(-1));
 for(let m=Math.floor(sw(H)/18)*18;m<sw(-10);m+=18){const y=sy(m);ctx.strokeStyle=m%54===0?'#b4d9ce15':'#b4d9ce0a';ctx.lineWidth=m%54===0?1.2:.55;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 const gloss=ctx.createLinearGradient(0,0,W,0);gloss.addColorStop(0,'#ffffff0c');gloss.addColorStop(.47,'#bdd8d70e');gloss.addColorStop(1,'#ffffff06');ctx.fillStyle=gloss;ctx.fillRect(0,0,W,H);ctx.restore();
 for(const side of [-1,1]){
  railLine(side,3);ctx.strokeStyle=side<0?'#dfebe2':'#9db0b1';ctx.lineWidth=3.8;ctx.stroke();
  railLine(side,-2);ctx.strokeStyle='#061720';ctx.lineWidth=3.1;ctx.stroke();
  railLine(side,11);ctx.strokeStyle='#d9e4d2a6';ctx.lineWidth=1.5;ctx.stroke();
  railLine(side,20);ctx.strokeStyle='#10232d';ctx.lineWidth=2.1;ctx.stroke();
 }
 for(let m=Math.floor(sw(H)/30)*30;m<sw(-10);m+=30){
  if(halfWidth(m)>44)continue;
  const y=sy(m),c=center(m),w=halfWidth(m);
  for(const side of [-1,1]){ctx.strokeStyle='#efb76b8a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c+side*(w-4),y);ctx.lineTo(c+side*(w-12),y-9);ctx.stroke()}
 }
 for(let m=Math.floor(sw(H)/100)*100;m<sw(-10);m+=100){
  const y=sy(m);if(y<-15||y>H+15||m<=0)continue;
  const c=center(m);
  ctx.font='bold 9px system-ui';ctx.fillStyle='#a3d1c485';ctx.textAlign='center';ctx.fillText(`${m} m`,c,y-8);
  ctx.strokeStyle='#b5dace35';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(c-13,y);ctx.lineTo(c+13,y);ctx.stroke();
 }
}
function crate(x,y,w,h){
 ctx.save();ctx.shadowColor='#031018ca';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
 const g=ctx.createLinearGradient(x,y-h/2,x+w,y+h/2);
 g.addColorStop(0,'#c8d2ce');g.addColorStop(.23,'#6e8187');g.addColorStop(.55,'#43555d');g.addColorStop(1,'#162b34');
 ctx.fillStyle=g;ctx.fillRect(x-w/2,y-h/2,w,h);ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(x-w/2+2,y-h/2+2,w-4,h-4);ctx.clip();
 ctx.fillStyle='#39474b';ctx.fillRect(x-w/2+3,y-h/2+3,w-6,h-6);
 for(let k=-30;k<50;k+=12){ctx.strokeStyle=k%24===0?'#f2c66e':'#d5a654';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-w/2+k,y+h/2+5);ctx.lineTo(x-w/2+k+28,y-h/2-5);ctx.stroke()}
 ctx.fillStyle='#1a2a30a0';ctx.fillRect(x-w/2+4,y-h/2+4,w-8,h-8);ctx.restore();
 ctx.strokeStyle='#d2e0d1a6';ctx.lineWidth=1.1;ctx.strokeRect(x-w/2+1,y-h/2+1,w-2,h-2);
 for(const dx of [-w/2+5,w/2-5])for(const dy of [-h/2+5,h/2-5])screw(x+dx,y+dy,2.4);
}
function post(x,y,r){
 ctx.save();ctx.shadowColor='#061016ed';ctx.shadowBlur=14;ctx.shadowOffsetY=6;
 const base=ctx.createRadialGradient(x-3,y-4,1,x,y,r+7);
 base.addColorStop(0,'#dee4d8');base.addColorStop(.45,'#6c848c');base.addColorStop(.77,'#2b3e48');base.addColorStop(1,'#0c1c25');
 ctx.fillStyle=base;ctx.beginPath();ctx.arc(x,y,r+5,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.strokeStyle='#d9af6a';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.stroke();
 const g=ctx.createRadialGradient(x-r*.4,y-r*.5,0,x,y,r);
 g.addColorStop(0,'#eaf0e9');g.addColorStop(.2,'#c8d4d0');g.addColorStop(.51,'#81959b');g.addColorStop(.85,'#354a53');g.addColorStop(1,'#192932');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#e5f0ec80';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*.62,2.1,5.5);ctx.stroke();
 ctx.fillStyle='#dc8664';ctx.beginPath();ctx.arc(x,y,r*.18,0,Math.PI*2);ctx.fill();
}
function drawObstacles(list){
 for(const o of list){
  const y=sy(o.s);if(y<-55||y>H+55)continue;
  if(o.type==='post')post(o.x,y,o.r);
  else if(o.type==='crate')crate(o.x,y,o.w,o.h);
  else{
   const left=o.cx-o.hw+4,right=o.cx+o.hw-4,a=o.gap-o.gapHalf,b=o.gap+o.gapHalf;
   if(a>left+3)crate((left+a)/2,y,a-left,23);
   if(right>b+3)crate((right+b)/2,y,right-b,23);
   for(const xx of [a,b]){ctx.save();ctx.shadowColor='#ff7250';ctx.shadowBlur=9;ctx.fillStyle='#fd9872';ctx.beginPath();ctx.arc(xx,y,3.7,0,Math.PI*2);ctx.fill();ctx.restore()}
  }
 }
}
function ball(){
 ctx.save();ctx.shadowBlur=16;ctx.shadowOffsetY=8;ctx.shadowColor='#000e';ctx.fillStyle='#030c13a9';ctx.beginPath();ctx.ellipse(ballX,BALL_Y+5,17,9,0,0,Math.PI*2);ctx.fill();ctx.restore();
 if((pressed||keyW)&&!dead){
  ctx.strokeStyle='#9fead24e';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ballX,BALL_Y,22,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#c7f4dc25';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ballX,BALL_Y,28,0,Math.PI*2);ctx.stroke();
 }
 const g=ctx.createRadialGradient(ballX-5,BALL_Y-6,1,ballX,BALL_Y,R+3);
 g.addColorStop(0,'#fff');g.addColorStop(.12,'#f0f8f5');g.addColorStop(.28,'#cbd9da');g.addColorStop(.5,'#647982');g.addColorStop(.71,'#879ca3');g.addColorStop(.87,'#2f434d');g.addColorStop(1,'#09171e');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(ballX,BALL_Y,R,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#deeeeb8a';ctx.lineWidth=.8;ctx.stroke();
 const shine=ctx.createRadialGradient(ballX-4,BALL_Y-5,0,ballX-4,BALL_Y-5,6);shine.addColorStop(0,'#ffffffef');shine.addColorStop(1,'#ffffff00');ctx.fillStyle=shine;
 ctx.beginPath();ctx.arc(ballX-4,BALL_Y-5,6,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#f5fff85c';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(ballX,BALL_Y,7.5,3.6,5.3);ctx.stroke();
}
function paint(list){
 background();track();drawObstacles(list);
 ctx.save();trail.forEach((point,i)=>{const y=sy(point.s);if(y<0||y>H)return;ctx.globalAlpha=i/trail.length*.34;ctx.strokeStyle='#b6ecd9';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(point.x,y,4.5,0,Math.PI*2);ctx.stroke()});ctx.restore();
 ball();ctx.save();spark.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()});ctx.restore();
 if(flash>0){ctx.fillStyle=`rgba(247,96,67,${flash*.30})`;ctx.fillRect(0,0,W,H)}
 const v=ctx.createRadialGradient(W/2,H*.4,110,W/2,H*.5,400);v.addColorStop(0,'#0000');v.addColorStop(1,'#07152185');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}
function hits(o){
 const dy=Math.abs(distance-o.s);
 if(o.type==='post')return Math.hypot(ballX-o.x,distance-o.s)<R+o.r+1;
 if(o.type==='crate'){
  const dx=Math.max(Math.abs(ballX-o.x)-o.w/2,0),dd=Math.max(dy-o.h/2,0);
  return dx*dx+dd*dd<R*R;
 }
 return dy<=12+R&&(ballX-R<o.gap-o.gapHalf||ballX+R>o.gap+o.gapHalf);
}
function saveBest(){if(distance>record){record=distance;try{localStorage.setItem(BEST_KEY,String(record))}catch{}}}
function showMilestone(n){milestoneNumber=n;toastUntil=performance.now()+1400;$('milestone').textContent=t('milestone',{n:format(n)});$('milestone').classList.add('show')}
function display(){
 $('distance').textContent=format(distance);
 $('best').textContent=format(Math.max(record,distance))+' m';
 const section=Math.floor(distance/500),narrow=halfWidth(distance)<43,bend=Math.abs(center(distance+110)-center(distance))>23;
 const zone=narrow?'zoneNarrow':bend?'zoneBend':halfWidth(distance)>70?'zoneWide':'zoneObstacle';
 $('zone').textContent=String(Math.min(section+1,99)).padStart(2,'0')+' · '+t(zone);
 $('danger').style.opacity=warning&&!dead?'1':'0';
 const now=performance.now();
 if(dead){$('status').textContent=t('failed');$('detail').textContent=t('failedDetail')}
 else if(toastUntil>now){$('status').textContent=t('milestone',{n:format(milestoneNumber)});$('detail').textContent=t('milestoneDetail')}
 else{
  const braking=keyS;
  const state=warning?'near':braking?'braking':pressed||keyW?'running':played?'pause':'ready';
  $('status').textContent=t(state);$('detail').textContent=t(state+'Detail');
 }
}
function syncLanguage(){
 lang=language();document.querySelectorAll('#runMain [data-zh][data-en]').forEach(el=>el.textContent=el.dataset[lang]);
 root.setAttribute('aria-label',lang==='en'?'Almost Made It, endless precision challenge':'差一点就过了，无尽轨道挑战');
 canvas.setAttribute('aria-label',lang==='en'?'Hold or press W to move, drag or use A/D to steer, S to brake':'钢珠轨道。按住或 W 前进，左右拖动或 A/D 转向，S 刹车');
 $('danger').textContent=lang==='en'?'DANGER · COLLISION':'危险 · 接近障碍';
 if(dead){$('resultTitle').textContent=t(distance<200?'titleShort':distance>1500?'titleLong':'titleStandard');$('resultReason').textContent=t(crashReason);$('status').textContent=t('failed');$('detail').textContent=t('failedDetail')}
 else display();
 if(toastUntil>performance.now())$('milestone').textContent=t('milestone',{n:format(milestoneNumber)});
}
function finish(reason){
 if(dead)return;
 dead=true;pressed=false;keyW=keyS=keyA=keyD=false;velocity=0;velocityX=0;crashReason=reason;
 saveBest();flash=1;
 for(let i=0;i<32;i++){
  const a=rand()*Math.PI*2,v=40+rand()*180;
  spark.push({x:ballX,y:BALL_Y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.7+rand()*.3,r:.8+rand()*2,color:rand()>.45?'#f6c17f':'#e9f7e3'});
 }
 $('resultTitle').textContent=t(distance<200?'titleShort':distance>1500?'titleLong':'titleStandard');
 $('resultDistance').textContent=format(distance);
 $('resultBest').textContent=format(record)+' m';
 $('resultTime').textContent=elapsed.toFixed(1)+' s';
 $('resultReason').textContent=t(reason);
 $('overlay').hidden=false;
 $('status').textContent=t('failed');$('detail').textContent=t('failedDetail');
 display();
}
function reset(){
 distance=0;ballX=190;targetX=190;velocityX=0;velocity=0;pressed=false;dead=false;played=false;elapsed=0;
 pointerId=null;pointerStartX=0;ballStartX=190;trail=[];spark=[];flash=0;warning=false;toastUntil=0;milestoneNumber=0;
 keyW=keyS=keyA=keyD=false;
 $('overlay').hidden=true;$('guide').style.opacity='1';$('milestone').classList.remove('show');
 display();paint(obstacles());
}
function pointerX(e){const r=canvas.getBoundingClientRect();return (e.clientX-r.left)*W/r.width}
canvas.addEventListener('pointerdown',e=>{
 if(dead||pointerId!==null)return;
 e.preventDefault();pointerId=e.pointerId;pressed=true;played=true;
 pointerStartX=pointerX(e);ballStartX=ballX;targetX=ballX;
 $('guide').style.opacity='0';
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 try{root.focus({preventScroll:true})}catch{}
});
canvas.addEventListener('pointermove',e=>{
 if(dead||pointerId!==e.pointerId)return;e.preventDefault();
 targetX=clamp(ballStartX+(pointerX(e)-pointerStartX)*1.28,12,W-12);
});
function release(e){if(pointerId!==e.pointerId)return;pointerId=null;pressed=false;targetX=ballX}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
const controls={KeyW:'keyW',ArrowUp:'keyW',KeyA:'keyA',ArrowLeft:'keyA',KeyD:'keyD',ArrowRight:'keyD',KeyS:'keyS',ArrowDown:'keyS',Space:'keyW'};
const activeCodes=new Set();
function changeKey(e,down){
 if(!Object.hasOwn(controls,e.code))return;
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
 e.preventDefault();
 if(dead)return;
 if(down){activeCodes.add(e.code);played=true;$('guide').style.opacity='0'}else activeCodes.delete(e.code);
 keyW=['KeyW','ArrowUp','Space'].some(k=>activeCodes.has(k));
 keyS=['KeyS','ArrowDown'].some(k=>activeCodes.has(k));
 keyA=['KeyA','ArrowLeft'].some(k=>activeCodes.has(k));
 keyD=['KeyD','ArrowRight'].some(k=>activeCodes.has(k));
}
window.addEventListener('keydown',e=>changeKey(e,true));window.addEventListener('keyup',e=>changeKey(e,false));
window.addEventListener('blur',()=>{activeCodes.clear();keyW=keyS=keyA=keyD=false;pressed=false;pointerId=null;targetX=ballX});
$('restart').addEventListener('click',()=>{activeCodes.clear();reset()});
$('retry').addEventListener('click',()=>{activeCodes.clear();reset()});
window.addEventListener('boringlab:language',syncLanguage);
function update(dt){
 if(dead)return;
 if(keyA)targetX-=220*dt;
 if(keyD)targetX+=220*dt;
 targetX=clamp(targetX,11,W-11);
 // W (or pointer hold) accelerates, S brakes, releasing naturally coasts to a stop.
 const targetSpeed=keyS?0:(keyW||pressed)?Math.min(161,92+Math.floor(distance/500)*5):0;
 velocity+=(targetSpeed-velocity)*Math.min(1,dt*(keyS?16:targetSpeed>0?4.5:8));
 velocityX+=((targetX-ballX)*39-velocityX*12)*dt;
 velocityX=clamp(velocityX,-275,275);
 ballX=clamp(ballX+velocityX*dt,11,W-11);
 if(velocity>.05){
  const prior=distance;distance+=velocity*dt;elapsed+=dt;
  if(!trail.length||distance-trail[trail.length-1].s>12){trail.push({x:ballX,s:distance});if(trail.length>30)trail.shift()}
  const a=Math.floor(prior/500),b=Math.floor(distance/500);
  if(b>a&&b>0)showMilestone(b*500);
 }
 const clearance=halfWidth(distance)-Math.abs(ballX-center(distance))-R;
 const list=obstacles();let next=Infinity;
 for(const o of list){const d=o.s-distance;if(d>0&&d<next)next=d}
 warning=clearance<12||(next<115);
 if(clearance<=0&&distance>5){finish('reasonEdge');return}
 for(const o of list){if(hits(o)){finish('reasonObstacle');return}}
 if(performance.now()>toastUntil)$('milestone').classList.remove('show');
 if(performance.now()-lastHud>80){display();lastHud=performance.now()}
}
function frame(now){
 if(!document.contains(root)){cancelAnimationFrame(request);return}
 const dt=Math.min(.035,(now-lastFrame)/1000||.016);lastFrame=now;
 update(dt);
 if(flash>0)flash=Math.max(0,flash-dt*2);
 for(let i=spark.length-1;i>=0;i--){const p=spark[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt*1.8;if(p.life<=0)spark.splice(i,1)}
 paint(obstacles());request=requestAnimationFrame(frame);
}
lang=language();reset();syncLanguage();request=requestAnimationFrame(frame);
})();
