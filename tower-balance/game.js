(()=>{'use strict';
const root=document.getElementById('tower-device');if(!root||root.dataset.ready)return;root.dataset.ready='1';
const $=id=>document.getElementById(id),c=$('tower-canvas'),g=c.getContext('2d');
const W=400,H=620,clamp=(a,l,r)=>Math.max(l,Math.min(r,a)),lang=()=>window.BoringI18n?.getLanguage()==='en';
const tr=(zh,en)=>lang()?en:zh;
const shapes=[['book',116,28,'精装旧书','Antique book'],['cup',66,56,'陶瓷咖啡杯','Ceramic mug'],['apple',57,53,'红苹果','Red apple'],['stool',98,72,'复古木凳','Wooden stool'],['vase',62,75,'玻璃花瓶','Glass vase'],['clock',68,60,'复古闹钟','Vintage clock'],['frame',86,62,'木制相框','Wooden frame']];
let stack=[],next=0,aim=200,dead=false,dragId=null,sway=0,velocity=0,stability=100,disturbed=0,wind=0,windTime=0,fallTime=0,particles=[],best=0,frame=0,last=0,wasPlayed=false;
try{best=Number(localStorage.getItem('boringlab.tower.best.v1'))||0}catch{}
function item(i){const shape=shapes[(i*5+Math.floor(i/7)*3)%shapes.length];const size=.92+(i*73%14)/100;return{type:shape[0],w:Math.round(shape[1]*size),h:Math.round(shape[2]*size),zh:shape[3],en:shape[4]};}
function grad(x1,y1,x2,y2,stops){const z=g.createLinearGradient(x1,y1,x2,y2);stops.forEach(a=>z.addColorStop(...a));return z}
function path(points){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath()}
function rounded(x,y,w,h,r,col){g.fillStyle=col;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
function ellipse(x,y,w,h,col){g.beginPath();g.ellipse(x,y,w,h,0,0,Math.PI*2);g.fillStyle=col;g.fill()}
function drawObject(o,x,bottom,rotation=0,alpha=1){
 const {type,w,h}=o;g.save();g.globalAlpha=alpha;g.translate(x,bottom);g.rotate(rotation);
 g.shadowBlur=10;g.shadowOffsetY=6;g.shadowColor='#281f1e5f';
 if(type==='book'){
  rounded(-w/2,-h,w,h,3,grad(-w/2,0,w/2,0,[[0,'#253f38'],[.24,'#678478'],[.65,'#314c40'],[1,'#1a3029']]));g.shadowBlur=0;
  rounded(-w/2+5,-h+4,w-10,h-8,2,'#ebdfc9');g.strokeStyle='#b1a185';g.lineWidth=.75;
  for(let i=0;i<5;i++){g.beginPath();g.moveTo(-w/2+9,-h+6+i*3);g.lineTo(w/2-8,-h+6+i*3);g.stroke()}
  rounded(-w/2,-h,w,5,2,'#547c68');g.fillStyle='#c9ad7b';g.fillRect(-w/2+11,-h+1,15,2);
 }else if(type==='cup'){
  rounded(-w*.34,-h+8,w*.68,h-13,8,grad(-w*.4,0,w*.4,0,[[0,'#c6b89f'],[.28,'#fffdf2'],[.75,'#e9dcc8'],[1,'#ac9b84']]));g.shadowBlur=0;
  g.strokeStyle='#e3d3b9';g.lineWidth=7;g.beginPath();g.arc(w*.29,-h*.56,13,-1.35,1.55);g.stroke();
  ellipse(0,-h+7,w*.34,5,'#e9d8b7');ellipse(0,-h+7,w*.30,3,'#654934');
  g.strokeStyle='#ac8864';g.lineWidth=1;g.beginPath();g.moveTo(-12,-h*.45);g.quadraticCurveTo(0,-h*.4,12,-h*.47);g.stroke();
 }else if(type==='apple'){
  ellipse(0,-h*.48,w*.47,h*.47,grad(-w/2,-h,w/2,-h*.4,[[0,'#7d231e'],[.34,'#e66c50'],[.7,'#d14232'],[1,'#7d1e1a']]));g.shadowBlur=0;
  ellipse(-w*.18,-h*.64,7,14,'#ffffff3c');g.strokeStyle='#624c2d';g.lineWidth=3;g.beginPath();g.moveTo(0,-h+5);g.lineTo(3,-h-8);g.stroke();ellipse(10,-h+2,10,4,'#62975e');
 }else if(type==='stool'){
  g.fillStyle='#714936';path([[-w*.42,-h+15],[-w*.37,-3],[-w*.24,-3],[-w*.22,-h+15]]);g.fill();path([[w*.42,-h+15],[w*.37,-3],[w*.24,-3],[w*.22,-h+15]]);g.fill();
  g.strokeStyle='#855d43';g.lineWidth=5;g.beginPath();g.moveTo(-w*.3,-23);g.lineTo(w*.3,-23);g.stroke();
  rounded(-w/2,-h+8,w,16,6,grad(-w/2,-h,w/2,-h+15,[[0,'#65412e'],[.35,'#be946b'],[1,'#714d36']]));g.shadowBlur=0;
  for(let k=0;k<4;k++){g.strokeStyle='#ebd1ae38';g.lineWidth=.7;g.beginPath();g.moveTo(-w*.45,-h+10+k*3);g.lineTo(w*.45,-h+10+k*3);g.stroke()}
 }else if(type==='vase'){
  g.beginPath();g.moveTo(-w*.24,-h+4);g.lineTo(-w*.29,-h*.75);g.bezierCurveTo(-w*.54,-h*.58,-w*.53,-h*.20,-w*.33,-4);g.quadraticCurveTo(0,1,w*.33,-4);g.bezierCurveTo(w*.53,-h*.2,w*.54,-h*.58,w*.29,-h*.75);g.lineTo(w*.24,-h+4);g.closePath();g.fillStyle=grad(-w/2,0,w/2,0,[[0,'#32616a'],[.25,'#b4dad1'],[.56,'#568d8f'],[1,'#274b53']]);g.fill();g.shadowBlur=0;
  g.strokeStyle='#e1fff4a1';g.lineWidth=2;g.beginPath();g.moveTo(-w*.2,-h*.85);g.bezierCurveTo(-w*.36,-h*.6,-w*.33,-h*.28,-w*.2,-12);g.stroke();rounded(-w*.24,-h,w*.48,6,2,'#a9cfcc');
 }else if(type==='clock'){
  ellipse(0,-h*.48,w*.45,h*.47,grad(-w/2,-h,w/2,-h*.1,[[0,'#594633'],[.33,'#e3ca9f'],[.7,'#a58a60'],[1,'#493c32']]));g.shadowBlur=0;
  ellipse(0,-h*.48,w*.35,h*.35,'#f3eadd');
  g.strokeStyle='#76634a';g.lineWidth=1.1;for(let i=0;i<12;i++){let a=i*Math.PI/6;g.beginPath();g.moveTo(Math.sin(a)*19,-h*.48-Math.cos(a)*19);g.lineTo(Math.sin(a)*23,-h*.48-Math.cos(a)*23);g.stroke()}
  g.lineWidth=2.4;g.beginPath();g.moveTo(0,-h*.48);g.lineTo(6,-h*.64);g.moveTo(0,-h*.48);g.lineTo(-11,-h*.42);g.stroke();ellipse(0,-h*.48,2.5,2.5,'#b18a57');
 }else{
  rounded(-w/2,-h,w,h,3,grad(-w/2,-h,w/2,-h,[[0,'#654734'],[.32,'#dab581'],[.65,'#9f744d'],[1,'#583c2d']]));g.shadowBlur=0;
  rounded(-w/2+8,-h+8,w-16,h-16,2,'#b9ceb8');path([[-w/2+9,-9],[-12,-h*.58],[8,-h*.3],[w/2-9,-h*.72],[w/2-9,-9]]);g.fillStyle='#729a91';g.fill();ellipse(14,-h+20,6,6,'#efdeb5');
  g.strokeStyle='#f2e1bfad';g.lineWidth=1.5;g.strokeRect(-w/2+5,-h+5,w-10,h-10);
 }
 g.restore();
}
function totalHeight(){return stack.reduce((s,o)=>s+o.h,0)}
function draw(t){
 const bg=grad(0,0,0,H,[[0,'#ebe7df'],[.65,'#d7d1c7'],[1,'#c0b4a4']]);g.fillStyle=bg;g.fillRect(0,0,W,H);
 path([[0,0],[168,0],[0,480]]);g.fillStyle='#ffffff30';g.fill();
 for(let k=0;k<14;k++){g.strokeStyle='#9b958719';g.lineWidth=1;g.beginPath();g.moveTo(k*47,0);g.lineTo(k*47-80,H);g.stroke()}
 let base=H-64+Math.max(0,totalHeight()-355);
 ellipse(200,base+17,170,18,'#56483e52');
 rounded(-5,base,410,23,3,grad(0,base,0,base+23,[[0,'#e4cbaa'],[.18,'#be9b76'],[1,'#674a38']]));g.fillStyle='#f7d8ad7a';g.fillRect(0,base+1,W,2);
 let cursor=base;
 g.save();g.translate(200,base);g.rotate(sway);g.translate(-200,-base);
 for(let k=0;k<stack.length;k++){
  let o=stack[k];cursor-=o.h;
  let factor=dead?Math.min(1,fallTime)*((k+1)/stack.length):0;
  let extra=dead?Math.pow(factor,2)*120*(k%2?1:-1):0;
  drawObject(o,o.x+extra,cursor+o.h+Math.pow(factor,2)*190,factor*(k%2?-.7:.7));
 }
 g.restore();
 if(!dead){
  const current=item(next),top=base-totalHeight(),floatBottom=Math.min(top-58,118+Math.max(0,totalHeight()-355)*.12);
  g.save();g.setLineDash([3,6]);g.lineWidth=1.3;g.strokeStyle='#78957985';g.beginPath();g.moveTo(aim,floatBottom+7);g.lineTo(aim,top);g.stroke();g.restore();
  drawObject(current,aim,floatBottom+Math.sin(t*.004)*3,Math.sin(t*.002)*.015,.94);
  g.fillStyle='#6b8c6c';path([[aim-5,top-4],[aim+5,top-4],[aim,top+4]]);g.fill();
 }
 if(dead&&fallTime>0){g.fillStyle='rgba(250,230,198,'+Math.min(.16,fallTime*.16)+')';g.fillRect(0,0,W,H)}
}
function updateLabels(){
 $('tower-height').textContent=stack.length;$('tower-best').textContent=best;
 $('tower-current').textContent=String(next+1).padStart(2,'0')+' · '+(lang()?item(next).en:item(next).zh);
 $('tower-stability').style.width=stability+'%';$('tower-stability').style.background=stability<35?'#c77f66':stability<62?'#c7a563':'#83a48b';
 $('tower-stability-text').textContent=Math.round(stability)+'%';
}
function message(zh,en){$('tower-message').textContent=tr(zh,en)}
function save(){if(stack.length>best){best=stack.length;try{localStorage.setItem('boringlab.tower.best.v1',String(best))}catch{}}}
function fail(){if(dead)return;dead=true;fallTime=.01;
 $('tower-result').textContent=Math.max(0,stack.length-1);save();updateLabels();
 message('塔失去了重心，开始倒塌！','The tower lost its balance and toppled!');
 setTimeout(()=>{$('tower-overlay').hidden=false;$('tower-end-note').textContent=tr('这次叠到了 '+Math.max(0,stack.length-1)+' 层，下次再高一点。','You stacked '+Math.max(0,stack.length-1)+' objects. Go higher next time.')},780);
}
function place(){if(dead)return;
 const d=item(next),previous=stack[stack.length-1];let overlap=previous?Math.min(d.w,previous.w):150;
 let distance=previous?Math.abs(aim-previous.x):Math.abs(aim-200);
 if(previous&&distance>overlap*.72){stack.push({...d,x:aim});next++;fail();return}
 stack.push({...d,x:aim});next++;
 let weighted=0,sum=0;
 for(let i=0;i<stack.length;i++){const w=(i+1)*stack[i].h;weighted+=(stack[i].x-200)*w;sum+=w}
 const offset=Math.abs(weighted/sum);
 const stabilityCost=Math.max(0,distance-overlap*.14)*.38+Math.max(0,offset-5)*.72+(stack.length>3?stack.length*.22:0);
 stability=clamp(100-stabilityCost*2.1-Math.abs(sway)*600,0,100);
 velocity+=(aim-(previous?.x??200))*.00072;
 if(stability<12||offset>49){fail();return}
 save();aim=clamp(200+Math.sin(next*2.47)*12,65,335);updateLabels();
 $('tower-hint').style.opacity='0';message('放稳了！继续往上叠。','Nice placement! Keep stacking.');
}
function reset(){stack=[];next=0;aim=200;dead=false;dragId=null;sway=0;velocity=0;stability=100;wind=0;fallTime=0;windTime=0;
 $('tower-overlay').hidden=true;$('tower-hint').style.opacity='1';message('物品会摇晃，重心偏移会导致倒塌。','Objects sway. Off-center weight can topple your tower.');updateLabels();
}
const localX=e=>{const r=c.getBoundingClientRect();return clamp((e.clientX-r.left)*W/r.width,48,W-48)};
c.addEventListener('pointerdown',e=>{if(dead)return;e.preventDefault();dragId=e.pointerId;aim=localX(e);try{c.setPointerCapture(e.pointerId)}catch{}});
c.addEventListener('pointermove',e=>{if(dead)return;if(dragId===e.pointerId)aim=localX(e)});
c.addEventListener('pointerup',e=>{if(dragId!==e.pointerId)return;aim=localX(e);dragId=null;place()});c.addEventListener('pointercancel',()=>dragId=null);
$('tower-drop').addEventListener('click',place);$('tower-restart').addEventListener('click',reset);$('tower-retry').addEventListener('click',reset);
root.addEventListener('keydown',e=>{if(['a','A','ArrowLeft','d','D','ArrowRight',' ','Enter'].includes(e.key))e.preventDefault();if(['a','A','ArrowLeft'].includes(e.key))aim=clamp(aim-14,48,W-48);if(['d','D','ArrowRight'].includes(e.key))aim=clamp(aim+14,48,W-48);if(e.key===' '||e.key==='Enter')place()});
window.addEventListener('boringlab:language',()=>{updateLabels();message('移动物品，找准重心，挑战无限高度。','Position objects carefully and reach an endless height.')});
function loop(t){if(!document.contains(root))return;let dt=Math.min(.04,(t-last)/1000||.016);last=t;
 if(!dead&&stack.length){windTime+=dt;if(windTime>3.8){windTime=0;wind=(Math.random()-.5)*.00065}
  let sum=0,den=0;stack.forEach((p,i)=>{let w=(i+1)*p.h;sum+=(p.x-200)*w;den+=w});const center=sum/den;
  const tendency=clamp(center*.000006+wind,-.0016,.0016);
  velocity+=(tendency-sway*.85-velocity*.12)*dt*30;
  sway+=velocity*dt*30;
  if(Math.abs(sway)>.19)fail();
 }else if(dead)fallTime=Math.min(1,fallTime+dt*1.55);
 draw(t);frame=requestAnimationFrame(loop);
}
reset();frame=requestAnimationFrame(loop);
})();
