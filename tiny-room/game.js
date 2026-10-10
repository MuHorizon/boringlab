(()=>{'use strict';
const root=document.getElementById('tiny-device');if(!root||root.dataset.ready)return;root.dataset.ready='1';
const $=id=>document.getElementById(id),canvas=$('tiny-canvas'),g=canvas.getContext('2d'),W=320,H=260;
g.imageSmoothingEnabled=false;const en=()=>window.BoringI18n?.getLanguage()==='en',tr=(a,b)=>en()?b:a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let coins=20,mood=72,energy=76,food=68,day=1,seconds=0,edit=false,drag=null,job='idle',jobEnd=0,petX=158,target=158,steps=0,notice='',noteUntil=0,journalZh='小人搬进了电脑。他正在打量自己的新家。',journalEn='A tiny person has moved into your computer. Everything is new.',last=0,raf=0,tick=0,nextEvent=7,particles=[];
let furniture=[{type:'plant',x:280,y:172},{type:'desk',x:92,y:190},{type:'bed',x:220,y:204},{type:'shelf',x:31,y:167}];
const saveKey='boringlab.tiny-room.v1';
try{const data=JSON.parse(localStorage.getItem(saveKey)||'null');if(data){coins=clamp(data.coins??20,0,99999);mood=clamp(data.mood??72,0,100);energy=clamp(data.energy??76,0,100);food=clamp(data.food??68,0,100);day=Math.max(1,data.day||1);furniture=Array.isArray(data.furniture)&&data.furniture.length===4?data.furniture:furniture;}}catch{}
function save(){try{localStorage.setItem(saveKey,JSON.stringify({coins,mood,energy,food,day,furniture}))}catch{}}
function box(x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function ellipse(x,y,rx,ry,color){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill()}
function text(value,x,y,color,size=11){g.font=size+'px sans-serif';g.fillStyle=color;g.textAlign='left';g.fillText(value,x,y)}
function furnitureDraw(o){const x=Math.round(o.x),y=Math.round(o.y);
 if(o.type==='plant'){
  box(x-12,y-19,24,21,'#c38d68');box(x-10,y-17,20,3,'#f0d6ad');box(x-9,y-5,18,6,'#a7795f');box(x-2,y-50,4,36,'#456e48');
  for(let i=0;i<8;i++){const a=i*2.4;box(x+Math.sin(a)*14-7,y-47+Math.cos(a)*13-4,15,9,['#367455','#6ba57c','#85ae79'][i%3])}
 }
 if(o.type==='shelf'){
  box(x-19,y-77,39,80,'#536e60');box(x-16,y-74,33,74,'#b7926b');
  for(let k=0;k<3;k++){box(x-16,y-68+k*23,33,4,'#76573d');for(let j=0;j<5;j++)box(x-12+j*6,y-82+k*23,4,14,['#ad6e60','#739d91','#ddc48e','#567f81','#cfa575'][(k*3+j)%5])}
  box(x-20,y-3,41,5,'#5f4936');
 }
 if(o.type==='desk'){
  box(x-34,y-6,68,10,'#927052');box(x-31,y+2,8,25,'#5c4a38');box(x+23,y+2,8,25,'#5c4a38');box(x-33,y-15,65,9,'#c19d73');
  box(x-27,y-45,44,30,'#445b53');box(x-23,y-42,36,23,'#abd1bb');box(x-20,y-39,30,17,'#4a786e');
  box(x-15,y-35,23,2,'#b2dac8');box(x-12,y-29,17,2,'#b2dac8');box(x-14,y-15,21,2,'#fff4cf');box(x-10,y-13,13,3,'#a8bbb3');
  box(x+23,y-29,5,14,'#afa48c');box(x+18,y-34,14,7,'#ebd093');
 }
 if(o.type==='bed'){
  box(x-45,y-14,90,21,'#815f50');box(x-43,y-20,86,16,'#e0c7a9');box(x-38,y-18,74,8,'#b6c7bd');box(x-39,y-19,27,10,'#f5e9d6');
  box(x-45,y-29,8,30,'#725447');box(x+37,y-25,8,26,'#725447');box(x-40,y+4,7,6,'#3e4240');box(x+31,y+4,7,6,'#3e4240');
 }
}
function drawPet(time){let px=Math.round(petX),py=192+(job==='sleep'?4:Math.sin(time*.009)*1.5);
 box(px-8,py-30,20,20,'#3a363c');box(px-7,py-27,18,18,'#e8bd96');box(px-9,py-31,22,9,'#36323b');box(px-6,py-34,14,6,'#33313b');
 box(px-4,py-21,2,3,'#383539');box(px+7,py-21,2,3,'#383539');box(px-10,py-16,23,22,job==='work'?'#5d9383':job==='sleep'?'#9bac9d':'#b6a36c');
 box(px-7,py+6,6,8+Math.sin(steps)*3,'#536078');box(px+5,py+6,6,8-Math.sin(steps)*3,'#536078');
 box(px-9,py+14,10,4,'#343d46');box(px+5,py+14,10,4,'#343d46');
 if(job==='sleep')text('z z',px+15,py-38,'#f4f4d2',13);
 if(Date.now()<noteUntil){let content=notice,w=Math.min(184,Math.max(70,content.length*(en()?6.7:10.7)+19)),left=clamp(px-w/2,4,W-w-4),top=Math.max(26,py-67);
  box(left+2,top+2,w,25,'#0e2c2e');box(left,top,w,23,'#faf1d8');box(left+4,top+4,w-8,15,'#e3ead3');
  g.textAlign='center';text(content,left+7,top+16,'#3f5147',10);g.textAlign='left';
  box(px-3,top+23,6,6,'#faf1d8');
 }
}
function scene(t){
 const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#b7d1bd');sky.addColorStop(.62,'#94b6a6');sky.addColorStop(1,'#69827e');g.fillStyle=sky;g.fillRect(0,0,W,H);
 for(let i=0;i<15;i++)box(i*24,20,1,148,'#e3eed411');
 box(0,165,W,95,'#957e6b');box(0,167,W,3,'#e8d0a9');
 for(let row=176;row<H;row+=15){box(0,row,W,1,'#cfac8c88');for(let x=(row%36);x<W;x+=52)box(x,row+1,1,14,'#544c4540')}
 box(165,45,114,96,'#6f8e83');box(169,49,106,89,'#263f58');
 const glass=g.createLinearGradient(0,50,0,140);glass.addColorStop(0,'#354e6b');glass.addColorStop(1,'#a0aabc');g.fillStyle=glass;g.fillRect(174,54,96,78);
 for(let i=0;i<10;i++){let x=175+i*10,h=20+(i*13)%40;box(x,132-h,8,h,'#32495b');for(let z=0;z<h-7;z+=8)if((z+i)%3!==0)box(x+2,132-h+z+5,2,3,'#f5d085')}
 box(220,50,4,89,'#83a59c');box(170,90,104,4,'#83a59c');box(172,52,5,82,'#ecf6db30');
 box(20,37,53,43,'#7e6356');box(24,41,45,35,'#e7debe');box(30,54,31,2,'#baa786');box(33,60,25,2,'#baa786');box(36,66,19,2,'#baa786');
 furniture.slice().sort((a,b)=>a.y-b.y).forEach(furnitureDraw);drawPet(t);
 if(edit){furniture.forEach(o=>{g.strokeStyle='#efffe580';g.strokeRect(o.x-20,o.y-45,40,54)});text(en()?'DRAG FURNITURE':'拖动家具',10,H-8,'#d4f6dc',11)}
 particles=particles.filter(p=>p.life>0);for(const p of particles){box(p.x,p.y,4,4,p.color);p.y+=p.v;p.life--}
}
function refresh(){
 $('tiny-coins').textContent=coins;for(const k of ['mood','energy','food']){const val={mood,energy,food}[k];$("tiny-"+k).textContent=Math.floor(val);$("tiny-"+k+"bar").style.width=val+'%'}
 $('tiny-day').textContent='DAY '+String(day).padStart(2,'0');$('tiny-clock').textContent=String((9+Math.floor(seconds/20))%24).padStart(2,'0')+':'+String((42+seconds*3)%60).padStart(2,'0');
 $('tiny-decorate').classList.toggle('active',edit);$('tiny-message').textContent=tr(journalZh,journalEn);
}
function note(a,b,duration=3400){notice=tr(a,b);noteUntil=Date.now()+duration}
function journal(a,b){journalZh=a;journalEn=b;refresh()}
function action(kind){if(edit){edit=false;drag=null}
 if(kind==='feed'){
  if(coins<3){note('没钱买零食……','I am out of coins...');journal('金币不够买食物了。','Not enough coins for food.');return}
  coins-=3;food=clamp(food+25,0,100);mood=clamp(mood+6,0,100);job='eat';jobEnd=Date.now()+1900;target=165;
  journal('小人吃上点心，开心地晃起了脑袋。','A fresh snack brightens the little person’s day.');note('好吃！','Delicious!');
  for(let i=0;i<8;i++)particles.push({x:petX+Math.random()*25-12,y:156,v:-Math.random()*1.8,life:42,color:'#f1d3a1'});
 }else if(kind==='work'){
  if(job==='work')return;
  if(energy<12||food<10){journal('小人太累或者太饿，暂时无法工作。','Too tired or hungry to work.');note('先休息吧','Need a break');return}
  energy-=13;food-=7;job='work';jobEnd=Date.now()+3500;target=furniture.find(o=>o.type==='desk').x+22;
  journal('小人坐在电脑前认真工作，准备赚一点金币。','The little person starts working at the desk.');note('今天要赚钱！','Time to earn!');
 }else if(kind==='rest'){
  job='sleep';jobEnd=Date.now()+3600;target=furniture.find(o=>o.type==='bed').x-17;
  journal('小人躺到床上，决定给自己放个假。','The little person climbs into bed for a break.');note('呼……','Zzz…');
 }else if(kind==='decorate'){edit=!edit;
  if(edit){journal('布置模式：拖动屏幕里的家具换个位置。','Decorating mode: drag furniture to rearrange the room.');note('家具随你摆！','Move anything!')}
  else{journal('家具布置完成，小人开始适应新的房间。','The rearranged room is ready to explore.');note('新布局不错！','Nice setup!')}
 }
 save();refresh();
}
for(const a of ['feed','work','rest','decorate'])$('tiny-'+a).addEventListener('click',()=>action(a));
const local=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
canvas.addEventListener('pointerdown',e=>{const p=local(e);
 if(!edit){target=clamp(p.x,24,296);note('去看看！','Let’s explore!');return}
 let match=null,dist=1e9;for(const o of furniture){const d=Math.hypot(p.x-o.x,p.y-(o.y-22));if(d<dist&&d<66){dist=d;match=o}}
 if(match){drag={id:e.pointerId,f:match,dx:p.x-match.x,dy:p.y-match.y};try{canvas.setPointerCapture(e.pointerId)}catch{}}
});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const p=local(e);drag.f.x=clamp(p.x-drag.dx,29,291);drag.f.y=clamp(p.y-drag.dy,133,220)});
canvas.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.id){drag=null;save();journal('你移动了一件家具，小人会继续探索这个房间。','You moved the furniture. The tiny person will explore the new arrangement.')}});
canvas.addEventListener('pointercancel',()=>drag=null);
function spontaneous(){const n=Math.floor(Math.random()*5);
 if(n===0){mood=clamp(mood+5,0,100);target=furniture.find(o=>o.type==='plant').x-17;note('给花浇水','Watering plants');journal('你没注意的时候，小人偷偷给花浇了水。','While you were away, the tiny person watered the plant.');}
 if(n===1){mood=clamp(mood+3,0,100);target=150;note('今天想摸鱼','Taking it easy');journal('小人坐着发呆，假装自己很忙。','The little person pretends to be busy while daydreaming.');}
 if(n===2){food=clamp(food-3,0,100);target=120;note('偷吃一口','Just one bite…');journal('小人偷偷藏了一块饼干，觉得没人发现。','The little person secretly stashes a cookie.');}
 if(n===3){coins+=2;energy=clamp(energy-4,0,100);target=furniture.find(o=>o.type==='desk').x+20;note('捡到金币！','Found coins!');journal('小人在键盘下找到 2 枚金币。','Two coins were found under the keyboard.');}
 if(n===4){energy=clamp(energy+4,0,100);target=furniture.find(o=>o.type==='bed').x-18;note('偷偷休息一下','Secret nap');journal('小人躺了十秒，假装什么也没发生。','The little person quietly takes a brief nap.');}
 save();refresh();
}
function loop(time){if(!document.contains(root))return;const dt=Math.min(.05,(time-last)/1000||.016);last=time;tick+=dt;
 if(tick>=1){tick-=1;seconds++;
  if(seconds%4===0){food=clamp(food-1,0,100);energy=clamp(energy-.55,0,100)}
  if(seconds%70===0)day++;
  nextEvent--;
  if(nextEvent<=0&&job==='idle'&&!edit){nextEvent=10+Math.floor(Math.random()*6);spontaneous()}
  refresh();if(seconds%10===0)save();
 }
 if(Math.abs(target-petX)>2){let dx=target-petX;petX+=Math.sign(dx)*Math.min(Math.abs(dx),dt*65);steps+=dt*13}
 if(jobEnd&&Date.now()>=jobEnd){
  if(job==='work'){coins+=9;mood=clamp(mood+4,0,100);journal('工作完成！小人赚了 9 枚金币。','Work complete! Earned 9 coins.');note('我可真努力！','Hard work pays!')}
  else if(job==='sleep'){energy=clamp(energy+35,0,100);mood=clamp(mood+6,0,100);journal('小人睡饱了，又充满了能量。','A refreshing rest restores energy.');note('精神满满！','All refreshed!')}
  job='idle';jobEnd=0;save();refresh();
 }
 scene(time);raf=requestAnimationFrame(loop);
}
window.addEventListener('boringlab:language',()=>{refresh();notice=tr('今天也要好好生活','Another day in my little world')});
refresh();raf=requestAnimationFrame(loop);
})();
