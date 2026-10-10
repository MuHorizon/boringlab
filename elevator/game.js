(()=>{'use strict';
const root=document.getElementById('elevator-device');if(!root||root.dataset.ready)return;root.dataset.ready='1';
const $=id=>document.getElementById(id),isEn=()=>window.BoringI18n?.getLanguage()==='en';
const txt=(a,b)=>isEn()?b:a;
let floor='1',card=false,log=false,power=false,tape=false,phone=false,locked=false,travel=false,round=0;
const rooms={B:['地下停车场','Basement Garage','EXIT / LEVEL B'],1:['空荡的大厅','Empty Lobby','NO SIGNAL'],2:['废弃办公层','Abandoned Offices','TELEPHONE'],3:['维修设备层','Maintenance Floor','SERVICE ACCESS'],4:['管理办公室','Records Office','RECORD ROOM'],5:['紧急配电层','Backup Power','GRID OFFLINE']};
function msg(a,b){$('elevator-message').textContent=txt(a,b)}
function repaint(){
 $('elevator-floor').textContent=floor;$('elevator-floor-sign').textContent=floor;$('elevator-wall-note').textContent=rooms[floor][2];
 $('elevator-location').textContent=txt(rooms[floor][0],rooms[floor][1]);
 $('elevator-stage').className='mini-stage elevator-stage floor-'+floor+($('elevator-stage').classList.contains('open')?' open':'');
 $('elevator-power').textContent=power?'ONLINE':'OFFLINE';
 $('elevator-objective').textContent=power?txt('目标：前往地下出口','GOAL: HEAD TO BASEMENT'):card?txt('目标：恢复备用电源','GOAL: RESTORE POWER'):txt('目标：找到出口','GOAL: FIND THE EXIT');
 $('elevator-items').textContent=txt('随身物品：','Items: ')+(card?txt('维修卡','Access card'):txt('空','Empty'))+(log?txt(' · 值班日志',' · Logbook'):'');
 $('elevator-action').textContent=txt('调查这一层 ↗','INVESTIGATE ↗');
 root.querySelectorAll('[data-floor]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.floor===floor));
}
let token=0;
function go(target){
 if(locked||travel||floor===target)return;
 travel=true;const serial=++token;$('elevator-stage').classList.remove('open');$('elevator-floor').textContent='--';
 root.querySelectorAll('[data-floor]').forEach(btn=>btn.disabled=true);
 msg('电梯开始下降，井道深处响起奇怪的刮擦声……','The elevator moves. Something scrapes against the shaft walls.');
 setTimeout(()=>{
  if(serial!==token)return;
  floor=target;repaint();$('elevator-stage').classList.add('open');
  if(floor==='B')power?msg('地下出口的指示灯终于变绿。','The basement exit light is finally green.'):msg('出口被锁死。电子锁需要应急电力。','The exit is sealed. It requires emergency power.');
  else if(floor==='3')msg('走廊尽头有一个旧检修柜。','An old maintenance cabinet stands at the far end.');
  else if(floor==='5')msg('备用电源需要权限认证。','The backup power console requires authorization.');
  else if(floor==='2')msg('明明没有人，走廊电话却响了。','An empty corridor. A telephone begins ringing.');
  else if(floor==='4')msg('有人在桌上留下一本发黄的值班日志。','A yellowed security log lies on the desk.');
  else msg('监控画面上的时间停在 03:17。','The security monitor is frozen at 03:17 AM.');
  setTimeout(()=>{if(serial!==token)return;travel=false;root.querySelectorAll('[data-floor]').forEach(btn=>btn.disabled=false)},650);
 },680);
}
function investigate(){
 if(locked||travel)return;
 if(floor==='1'){tape=true;msg('监控：一名维修员走进三楼，之后再也没有出来。','CCTV: A technician entered floor 3 and never came out.');}
 if(floor==='2'){phone=true;msg('听筒低语：“三楼有维修卡……五楼恢复电力。”','A whisper: “Access card on three… restore power on five.”');}
 if(floor==='3'){if(!card){card=true;msg('你找到一张老旧的维修门禁卡。','You found a worn maintenance access card.')}else msg('柜子已经空了。','The cabinet is empty.');}
 if(floor==='4'){log=true;msg('值班日志：地下室出口可通往地面，但没人记录下最后一名管理员的离开时间。','Security log: The basement exit leads outside, but the last caretaker never signed out.');}
 if(floor==='5'){if(!card)msg('权限不足。你需要三楼的维修卡。','Access denied. Find the maintenance card on floor 3.');else if(!power){power=true;msg('备用电源恢复，整栋楼的灯逐层亮起。监控里似乎多了一个人。','Power restored. Lights turn on floor by floor. Someone new appears on the CCTV feed.');}else msg('备用电源运行正常。现在可以尝试地下出口。','The backup grid is online. Try the basement exit.');}
 if(floor==='B'){
  if(!power)msg('地下出口仍然锁着。先恢复备用电源。','The basement exit is locked. Restore backup power first.');
  else{
   locked=true;
   $('elevator-ending').textContent=log?txt('真相结局 · 最后的管理员','True Ending · The Last Caretaker'):txt('成功逃出 · 午夜来客','Escaped · Midnight Visitor');
   $('elevator-ending-detail').textContent=log?txt('你终于离开了大楼。但监控的最后一帧显示：电梯里，一直有人站在你身后。','You escaped. Yet the final CCTV frame shows someone standing behind you in the elevator all along.'):txt('应急门打开了。你走进凌晨的街道，监控屏幕却依旧显示有人被困在电梯里。','The exit swings open. You step outside, but the CCTV still shows someone trapped inside the elevator.');
   $('elevator-overlay').hidden=false;
  }
 }
 repaint();
}
function reset(){
 token++;floor='1';card=false;log=false;power=false;tape=false;phone=false;locked=false;travel=false;round++;
 $('elevator-overlay').hidden=true;$('elevator-stage').classList.remove('open');root.querySelectorAll('[data-floor]').forEach(b=>b.disabled=false);
 repaint();msg('电梯停在一楼。你试着按下开门键……','The elevator stops on floor one. You press the door button…');
 const serial=token;setTimeout(()=>{if(serial===token)$('elevator-stage').classList.add('open')},220);
}
root.querySelectorAll('[data-floor]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.floor)));
$('elevator-action').addEventListener('click',investigate);$('elevator-restart').addEventListener('click',reset);$('elevator-again').addEventListener('click',reset);
window.addEventListener('boringlab:language',()=>{repaint();if(!locked)msg('调查楼层、寻找维修卡，恢复电源后从地下出口逃离。','Investigate floors, find the access card, restore power and reach the basement exit.')});
reset();
})();
