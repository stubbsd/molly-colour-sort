/* Molly Colour Sort — original game code. No ads, no tracking, no network calls. */
(function(){
'use strict';
const COL={r:'#FF3D57',o:'#FF8C1A',y:'#FFD21F',g:'#2FD06F',b:'#2F7BFF',p:'#9A4DFF',k:'#FF5FC0',t:'#00C4CC',w:'#F2EEE4',n:'#A0632D',l:'#A6E22E',c:'#7FD8FF',v:'#CDB4FF',m:'#FFB38A',s:'#B4BECF',d:'#B0123E'};
const CAP=Rules.CAP, LEVELS=window.LEVELS, $=id=>document.getElementById(id);
function shade(h,f){h=h.slice(1);let r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  if(f<0){r*=1+f;g*=1+f;b*=1+f}else{r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f}return`rgb(${r|0},${g|0},${b|0})`;}

/* ---------- progress (local only) ---------- */
const SAVE='mollyColourSort.v1';
let prog;try{prog=JSON.parse(localStorage.getItem(SAVE))}catch(e){}
if(!prog||!prog.stars)prog={unlocked:1,stars:{}};
function save(){try{localStorage.setItem(SAVE,JSON.stringify(prog))}catch(e){}}

/* ---------- sound (synthesised, original) ---------- */
let ac=null;
function audio(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(ac&&ac.state==='suspended')ac.resume();return ac;}
function tone(type,f1,f2,t,dur,vol,filt){const a=audio();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;
  o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  let node=o;if(filt){const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=filt;o.connect(f);node=f}
  node.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+0.05);}
const SFX={
  glug(n,fill){const a=audio();if(!a)return;const t=a.currentTime;const k=2+n*2;
    for(let i=0;i<k;i++){const f=150+fill*55+i*8+Math.random()*25;tone("sine",f,f*2.4,t+i*0.065,0.06,0.32,1400);}},
  pick(){const a=audio();if(!a)return;tone('triangle',520,780,a.currentTime,0.09,0.15);},
  nope(){const a=audio();if(!a)return;const t=a.currentTime;tone('sine',300,230,t,0.12,0.14);tone('sine',260,200,t+0.12,0.14,0.12);},
  done(){const a=audio();if(!a)return;const t=a.currentTime;tone('triangle',880,1320,t,0.18,0.12);},
  win(){const a=audio();if(!a)return;const t=a.currentTime;[523,659,784,1047,1319].forEach((f,i)=>{tone('triangle',f,f*1.01,t+i*0.13,0.35,0.2);tone('sine',f*2,f*2,t+i*0.13,0.25,0.05)});},
};

/* ---------- state ---------- */
let L=0, state=null, history=[], moves=0, sel=-1, anim=null, drag=null, hint=null, shake=null, won=false, confetti=[];
const cv=$('cv'), ctx=cv.getContext('2d'); let W=0,H=0,DPR=1, lay=null;

function startLevel(i){L=i;state=Rules.fromLevel(LEVELS[i]);history=[];moves=0;sel=-1;anim=null;drag=null;hint=null;won=false;confetti=[];
  $('levelPill').textContent=i+1;$('win').classList.add('hidden');show('game');resize();}

/* ---------- layout ---------- */
function resize(){const r=cv.getBoundingClientRect();DPR=Math.min(3,window.devicePixelRatio||1);W=r.width;H=r.height;
  cv.width=W*DPR;cv.height=H*DPR;if(state)layout();}
function layout(){const n=state.t.length, per=Math.max(3,Math.ceil(n/4)), cols=Math.min(per,n), rows=Math.ceil(n/per);
  const sideW=0, mx=Math.max(8,W*0.03);
  const ix0=mx, ix1=W-mx, colW=(ix1-ix0)/per;
  let tw=Math.min(colW*0.64,140);
  const rowH=w=>w*1.75+w*0.45+34; // tube + rim room + shelf
  const avail=H-30; if(rows*rowH(tw)>avail)tw=Math.max(30,(avail/rows-34)/2.2);
  const th=tw*1.75, rh=rowH(tw), totalH=rows*rh, top0=Math.max(16,(H-totalH)/2);
  const tubes=[], shelves=[]; let k=0;
  for(let r=0;r<rows;r++){const inRow=Math.min(per,n-r*per);const y=top0+r*rh+tw*0.45;
    const rowW=inRow*colW, sx=ix0+(ix1-ix0-rowW)/2;
    for(let c=0;c<inRow;c++){tubes[k]={x:sx+c*colW+(colW-tw)/2,y,w:tw,h:th};k++;}
    shelves.push({x0:ix0-6,x1:ix1+6,y:y+th+2,floor:r===rows-1});}
  const floorY=shelves[shelves.length-1].y;
  lay={tubes,shelves,floorY,tw,mx};}
function setTubes(arr){state={t:arr.slice(),side:arr.map(()=>false),claim:arr.map(()=>null)};history=[];sel=-1;anim=null;won=false;layout();}

/* ---------- drawing ---------- */
function bodyPath(x,y,w,h,r,ey,close){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+h-r);ctx.arc(x+r,y+h-r,r,Math.PI,0,true);ctx.lineTo(x+w,y);
  if(close)ctx.ellipse(x+r,y,r,ey,0,0,Math.PI,false);}
function hgrad(x,w,stops){const g=ctx.createLinearGradient(x,0,x+w,0);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
/* segs: array of [colour, units] bottom->top (units may be fractional) */
function drawTube(x,y,w,h,segs,opt){opt=opt||{};const r=w/2,ey=w*0.17,cx=x+r,t=Math.max(3,w*0.075),cap=CAP;
  if(opt.shadow!==false){ctx.save();ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(cx,y+h+4+(opt.lift||0),w*0.62,w*0.12,0,0,7);ctx.filter='blur(4px)';ctx.fill();ctx.restore();}
  if(opt.glow){ctx.save();ctx.shadowColor='rgba(255,242,122,.95)';ctx.shadowBlur=30;ctx.fillStyle='rgba(255,242,122,.35)';ctx.beginPath();ctx.roundRect(x-8,y-14,w+16,h+22,r+8);ctx.fill();ctx.restore();}
  // glass wall + interior
  bodyPath(x,y,w,h,r,ey,true);ctx.fillStyle=hgrad(x,w,[[0,'rgba(159,180,220,.55)'],[.5,'rgba(207,224,255,.16)'],[1,'rgba(142,164,207,.6)']]);ctx.fill();
  const ix=x+t,iw=w-2*t,ir=r-t,iey=ey*ir/r;
  bodyPath(ix,y,iw,h-t,ir,iey,true);ctx.fillStyle=hgrad(ix,iw,[[0,'rgba(207,220,240,.35)'],[.5,'rgba(244,249,255,.12)'],[1,'rgba(195,210,234,.35)']]);ctx.fill();
  ctx.fillStyle='rgba(184,201,226,.28)';ctx.beginPath();ctx.ellipse(cx,y,ir,iey,0,0,7);ctx.fill();
  // liquid
  const usable=h-ey-r*0.35-t-4, lh=usable/cap, bottom=y+h-t-2; let level=0, topC=null;
  ctx.save();bodyPath(ix,y,iw,h-t,ir,iey,true);ctx.clip();
  for(const[c,u]of segs){if(u<=0.001)continue;const y1=bottom-(level+u)*lh, y0=level===0?y+h+5:bottom-level*lh+1;const col=COL[c];
    ctx.fillStyle=hgrad(x,w,[[0,shade(col,-.45)],[.25,col],[.45,shade(col,.35)],[.75,col],[1,shade(col,-.5)]]);ctx.fillRect(x,y1,w,y0-y1);level+=u;topC=c;}
  ctx.restore();
  if(topC){const ly=bottom-level*lh,col=COL[topC];
    const g=ctx.createRadialGradient(cx,ly+ey*.2,1,cx,ly,ir);g.addColorStop(0,shade(col,.15));g.addColorStop(.8,shade(col,.45));g.addColorStop(1,shade(col,.7));
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,ly,ir,ey*.75,0,0,7);ctx.fill();
    ctx.strokeStyle=shade(col,.6);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,ly,ir,ey*.75,0,0,Math.PI);ctx.stroke();
    const b0=segs.find(s=>s[1]>0.001);ctx.fillStyle=shade(COL[b0[0]],.3);ctx.globalAlpha=.5;ctx.beginPath();ctx.ellipse(cx,y+h-t*.6,r*.55,t*.8,0,0,7);ctx.fill();ctx.globalAlpha=1;}
  // front glass + highlights
  bodyPath(x,y,w,h,r,ey,true);ctx.fillStyle=hgrad(x,w,[[0,'rgba(159,182,214,.5)'],[.12,'rgba(255,255,255,.14)'],[.5,'rgba(232,243,255,.05)'],[.85,'rgba(255,255,255,.16)'],[1,'rgba(127,151,187,.55)']]);ctx.fill();
  bodyPath(x,y,w,h,r,ey,false);ctx.strokeStyle='rgba(201,217,247,.75)';ctx.lineWidth=2.5;ctx.stroke();
  const hl=ctx.createLinearGradient(0,y+ey,0,y+h-r);hl.addColorStop(0,'rgba(255,255,255,.15)');hl.addColorStop(.2,'rgba(255,255,255,.9)');hl.addColorStop(.8,'rgba(255,255,255,.75)');hl.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=hl;ctx.beginPath();ctx.roundRect(x+w*.15,y+ey+8,w*.1,Math.max(4,h-ey-r-20),w*.05);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.roundRect(x+w*.29,y+ey+16,w*.03,h*.33,w*.015);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.roundRect(x+w*.78,y+ey+22,w*.05,h*.42,w*.025);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.ellipse(cx,y+h-r,r*.62,r*.6,0,Math.PI*.25,Math.PI*.75);ctx.stroke();
  // clean flared lip — single ring, nothing inside the mouth
  const lr=r+3;const lg=ctx.createLinearGradient(0,y-ey,0,y+ey);lg.addColorStop(0,'rgba(255,255,255,.95)');lg.addColorStop(.5,'rgba(188,208,245,.8)');lg.addColorStop(1,'rgba(233,241,255,.95)');
  ctx.strokeStyle=lg;ctx.lineWidth=t+1.5;ctx.beginPath();ctx.ellipse(cx,y,lr,ey+2,0,0,7);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,y,lr,ey+2,0,Math.PI*.35,Math.PI*.9);ctx.stroke();}

function segsOf(str,removeU,add){const segs=[];for(const c of str){if(segs.length&&segs[segs.length-1][0]===c)segs[segs.length-1][1]++;else segs.push([c,1]);}
  let rem=removeU||0;while(rem>0&&segs.length){const s=segs[segs.length-1];const d=Math.min(rem,s[1]);s[1]-=d;rem-=d;if(s[1]<=0.0001)segs.pop();}
  if(add&&add[1]>0){if(segs.length&&segs[segs.length-1][0]===add[0])segs[segs.length-1][1]+=add[1];else segs.push([add[0],add[1]]);}return segs;}

function plank(x0,x1,y){const th=Math.max(14,lay.tw*0.2);ctx.save();
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.filter='blur(8px)';ctx.fillRect(x0+10,y+th,x1-x0-20,14);ctx.filter='none';
  ctx.fillStyle='#4a2e1b';[x0+22,x1-38].forEach(bx=>{ctx.beginPath();ctx.moveTo(bx,y+th);ctx.lineTo(bx+16,y+th);ctx.lineTo(bx+16,y+th+22);ctx.closePath();ctx.fill();});
  let g=ctx.createLinearGradient(0,y-10,0,y);g.addColorStop(0,'#C98E5A');g.addColorStop(1,'#A8703F');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(x0+10,y-10);ctx.lineTo(x1-10,y-10);ctx.lineTo(x1,y);ctx.lineTo(x0,y);ctx.fill();
  g=ctx.createLinearGradient(0,y,0,y+th);g.addColorStop(0,'#8A5530');g.addColorStop(1,'#5E3A22');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x0,y,x1-x0,th,4);ctx.fill();
  ctx.fillStyle='rgba(226,172,120,.8)';ctx.fillRect(x0,y,x1-x0,2);
  ctx.strokeStyle='rgba(74,46,27,.35)';ctx.lineWidth=1.5;for(let k=0;x0+20+k*80<x1-60;k++){ctx.beginPath();ctx.moveTo(x0+20+k*80,y+th*.4+(k%3)*2);ctx.quadraticCurveTo(x0+60+k*80,y+th*.3,x0+80+k*80,y+th*.45);ctx.stroke();}
  ctx.restore();}

function badge(T,i){const cx=T.x+T.w/2,R=Math.max(18,T.w*0.27),by=T.y-T.w*0.17-R-12,claim=state.claim[i];
  ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=10;ctx.shadowOffsetY=5;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,by,R,0,7);ctx.fill();ctx.restore();
  const d=R*0.72;ctx.beginPath();ctx.moveTo(cx,by-d);ctx.bezierCurveTo(cx+d*.95,by+d*.05,cx+d*.85,by+d*.85,cx,by+d*.85);ctx.bezierCurveTo(cx-d*.85,by+d*.85,cx-d*.95,by+d*.05,cx,by-d);
  if(claim){const g=ctx.createRadialGradient(cx-d*.3,by,1,cx,by+d*.3,d);g.addColorStop(0,shade(COL[claim],.6));g.addColorStop(.5,COL[claim]);g.addColorStop(1,shade(COL[claim],-.4));ctx.fillStyle=g;}
  else{const g=ctx.createLinearGradient(cx-d,by-d,cx+d,by+d);['#FF3D57','#FFD21F','#2FD06F','#2F7BFF','#9A4DFF'].forEach((c,j)=>g.addColorStop(j/4,c));ctx.fillStyle=g;}
  ctx.fill();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.ellipse(cx-d*.3,by+d*.15,d*.12,d*.22,0,0,7);ctx.fill();
  if(!claim){const bx=cx+R*0.85,bb=by-R*0.75,rr=R*0.48;ctx.fillStyle='#2F7BFF';ctx.beginPath();ctx.arc(bx,bb,rr,0,7);ctx.fill();
    ctx.fillStyle='#fff';ctx.font=`900 ${rr*1.5}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1',bx,bb+1);}}

function easeIO(p){return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2}
function pourPose(a,b){const A=lay.tubes[a],B=lay.tubes[b];const right=(B.x+B.w/2)>W/2;const ang=(right?1:-1)*1.75;
  const mx=B.x+B.w/2+(right?-1:1)*B.w*0.18, my=B.y-B.w*0.55;return{mx,my,ang};}

function frame(now){requestAnimationFrame(frame);if(!state||$('game').classList.contains('hidden'))return;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  // soft stars
  for(let i=0;i<30;i++){const x=(i*137.5)%W,y=(i*89.3)%H;ctx.fillStyle=`rgba(255,255,255,${.15+.25*Math.abs(Math.sin(now/1500+i))})`;ctx.beginPath();ctx.arc(x,y,1.6,0,7);ctx.fill();}
  lay.shelves.forEach(s=>plank(s.x0,s.x1,s.y));
  let A=null,P=0;
  if(anim){P=Math.min(1,(now-anim.start)/anim.dur);if(P>=1){commit();}}
  state.t.forEach((str,i)=>{const T=lay.tubes[i];if(!T)return;
    if(anim&&i===anim.a)return; if(drag&&drag.active&&i===drag.i)return;
    let segs;const pp=anim?Math.max(0,Math.min(1,(P-.3)/.45)):0;
    if(anim&&i===anim.b)segs=segsOf(str,0,[anim.c,anim.n*pp]);else segs=segsOf(str);
    let dx=0;if(shake&&shake.i===i){const q=(now-shake.start)/400;if(q<1)dx=Math.sin(q*30)*8*(1-q);else shake=null;}
    const lift=(sel===i&&!anim)?T.w*0.32:0;
    const glow=sel===i||(hint&&(hint.a===i||hint.b===i)&&Math.floor((now-hint.start)/350)%2===0);
    drawTube(T.x+dx,T.y-lift,T.w,T.h,segs,{glow,lift});});
  if(anim){const a=anim.a,T=lay.tubes[a],pose=pourPose(a,anim.b);const p1=easeIO(Math.min(1,P/.3)),p3=easeIO(Math.max(0,(P-.78)/.22));
    const k=p1*(1-p3);const hx=T.x+T.w/2,hy=T.y-(anim.fromLift||0);
    const mx=hx+(pose.mx-hx)*k,my=hy+(pose.my-hy)*k,ang=pose.ang*k;const pp=Math.max(0,Math.min(1,(P-.3)/.45));
    // stream
    if(P>.28&&P<.8){const B=lay.tubes[anim.b];const col=COL[anim.c];const lip=(pose.ang>0?1:-1)*T.w*0.0;
      const tgtY=B.y+B.h-B.w*0.17-B.w*0.175-(B.h-B.w*0.17-B.w*.175-B.w*.075-4)/CAP*(state.t[anim.b].length+anim.n*pp);
      const sx=mx+lip, w=T.w*0.22*(P>.72?(.8-P)/.08:1);ctx.strokeStyle=hgrad(sx-w,w*2,[[0,shade(col,-.3)],[.5,shade(col,.3)],[1,shade(col,-.3)]]);
      ctx.lineWidth=Math.max(2,w);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx,my+4);
      ctx.quadraticCurveTo(sx+Math.sin(now/60)*2,(my+tgtY)/2,B.x+B.w/2+Math.sin(now/90)*1.5,tgtY);ctx.stroke();
      ctx.fillStyle=col;for(let d=0;d<3;d++){const q=((now/300)+d/3)%1;ctx.beginPath();ctx.arc(B.x+B.w/2+(d-1)*B.w*0.25*q,tgtY-q*B.w*0.3,B.w*0.05*(1-q),0,7);ctx.fill();}}
    ctx.save();ctx.translate(mx,my);ctx.rotate(ang);drawTube(-T.w/2,0,T.w,T.h,segsOf(state.t[a],anim.n*pp),{shadow:k<.1});ctx.restore();}
  if(drag&&drag.active){const T=lay.tubes[drag.i];ctx.save();ctx.globalAlpha=.95;drawTube(drag.x-T.w/2,drag.y-T.h*0.3,T.w,T.h,segsOf(state.t[drag.i]),{glow:true,shadow:false});ctx.restore();
    const over=hitTube(drag.x,drag.y,drag.i);if(over>=0){const B=lay.tubes[over];ctx.strokeStyle=Rules.canPour(state,drag.i,over)?'rgba(120,255,170,.9)':'rgba(255,255,255,.25)';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(B.x+B.w/2,B.y,B.w/2+10,B.w*.17+8,0,0,7);ctx.stroke();}}
  if(hint&&now-hint.start<2600&&!anim){const A2=lay.tubes[hint.a],B=lay.tubes[hint.b];const ax=A2.x+A2.w/2,ay=A2.y-A2.w*.6,bx=B.x+B.w/2,by=B.y-B.w*.6;
    const bob=Math.sin(now/180)*6;ctx.strokeStyle='#FFF27A';ctx.lineWidth=7;ctx.setLineDash([14,12]);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(ax,ay+bob);ctx.quadraticCurveTo((ax+bx)/2,Math.min(ay,by)-60+bob,bx,by+bob);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#FFF27A';ctx.beginPath();ctx.arc(bx,by+bob,11,0,7);ctx.fill();}else if(hint&&now-hint.start>=2600)hint=null;
  // confetti
  if(confetti.length){confetti.forEach(c=>{c.vy+=0.12;c.x+=c.vx;c.y+=c.vy;c.r+=c.vr;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.r);ctx.fillStyle=c.c;ctx.fillRect(-7,-4,14,8);ctx.restore();});
    confetti=confetti.filter(c=>c.y<H+40);}}

/* ---------- moves ---------- */
function tryPour(a,b){const n=Rules.canPour(state,a,b);if(!n){shake={i:b,start:performance.now()};SFX.nope();return false;}
  const fromLift=(sel===a)?lay.tubes[a].w*0.32:0;
  anim={a,b,n,c:state.t[a].slice(-1),start:performance.now(),dur:520+n*70,fromLift};sel=-1;hint=null;
  setTimeout(()=>SFX.glug(n,state.t[b].length),150);return true;}
function commit(){const{a,b}=anim;history.push(Rules.clone(state));state=Rules.pour(state,a,b);moves++;anim=null;
  const T=state.t[b];if(T.length===CAP&&/^(.)\1*$/.test(T))SFX.done();
  if(Rules.solved(state)&&!won){won=true;setTimeout(winLevel,300);}}
function winLevel(){const sol=LEVELS[L].sol;const s=moves<=sol?3:moves<=Math.ceil(sol*1.5)+2?2:1;
  prog.stars[L]=Math.max(prog.stars[L]||0,s);prog.unlocked=Math.max(prog.unlocked,Math.min(LEVELS.length,L+2));save();SFX.win();
  for(let i=0;i<140;i++)confetti.push({x:Math.random()*W,y:-20-Math.random()*H*.5,vx:(Math.random()-.5)*3,vy:Math.random()*3,r:0,vr:(Math.random()-.5)*.3,c:Object.values(COL)[i%16]});
  ['s1','s2','s3'].forEach((id,i)=>{const e=$(id);e.classList.remove('on');if(i<s)setTimeout(()=>e.classList.add('on'),250+i*300);});
  $('btnNext').classList.toggle('hidden',L+1>=LEVELS.length);$('win').classList.remove('hidden');}

/* ---------- input ---------- */
function hitTube(x,y,except){let best=-1;lay.tubes.forEach((T,i)=>{if(i===except)return;if(x>=T.x-14&&x<=T.x+T.w+14&&y>=T.y-T.w*0.7-20&&y<=T.y+T.h+14)best=i;});return best;}
function pos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
cv.addEventListener('pointerdown',e=>{audio();if(anim||won)return;const p=pos(e);const i=hitTube(p.x,p.y);cv.setPointerCapture(e.pointerId);
  drag={i,sx:p.x,sy:p.y,x:p.x,y:p.y,active:false};});
cv.addEventListener('pointermove',e=>{if(!drag||drag.i<0)return;const p=pos(e);drag.x=p.x;drag.y=p.y;
  if(!drag.active&&Math.hypot(p.x-drag.sx,p.y-drag.sy)>14&&state.t[drag.i].length&&(sel<0||sel===drag.i)){drag.active=true;sel=-1;SFX.pick();}});
function up(e){if(!drag)return;const d=drag;drag=null;if(anim||won)return;const p=pos(e);
  if(d.active){const t=hitTube(p.x,p.y,d.i);if(t>=0)tryPour(d.i,t);return;}
  const i=d.i;if(i<0){sel=-1;return;}
  if(sel<0){if(state.t[i].length){sel=i;SFX.pick();}else{shake={i,start:performance.now()};}}
  else if(sel===i){sel=-1;}
  else{const a=sel;if(!tryPour(a,i)){sel=-1;}}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{drag=null});

$('btnUndo').onclick=()=>{audio();if(anim)return;if(history.length){state=history.pop();moves++;sel=-1;won=false;$('win').classList.add('hidden');SFX.pick();}};
$('btnRestart').onclick=()=>{audio();if(anim)return;startLevel(L);};
$('btnHint').onclick=()=>{audio();if(anim||won)return;const sol=Rules.solve(state,60000);
  if(sol&&sol.length){hint={a:sol[0][0],b:sol[0][1],start:performance.now()};sel=-1;SFX.pick();}
  else{const u=$('btnUndo');u.classList.remove('pulse');void u.offsetWidth;u.classList.add('pulse');}};
$('btnHome').onclick=()=>{audio();showMap();};$('btnWinMap').onclick=()=>{showMap();};
$('btnNext').onclick=()=>{startLevel(L+1);};
window.addEventListener('resize',()=>{resize();if(!$('map').classList.contains('hidden'))buildMap();});

/* ---------- map ---------- */
function show(id){['map','game'].forEach(s=>$(s).classList.toggle('hidden',s!==id));}
function buildMap(){const box=$('mapPath');const N=LEVELS.length,step=150,pad=150,w=box.clientWidth||Math.min(innerWidth,600);
  const h=N*step+pad*2;box.style.height=h+'px';const xs=[.5,.78,.5,.22];const pts=[];for(let i=0;i<N;i++)pts.push([w*xs[i%4],h-pad-i*step]);
  const keys=Object.keys(COL);let html=`<svg width="${w}" height="${h}"><path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="#05081a" stroke-width="54" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 10)" opacity=".7"/><path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="#34407a" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/><path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="1 34" opacity=".8"/></svg>`;
  let tot=0;for(let i=0;i<N;i++){const st=prog.stars[i]||0;tot+=st;const locked=i+1>prog.unlocked,cur=i+1===prog.unlocked;const c=COL[keys[i%keys.length]];
    const bg=`radial-gradient(circle at 35% 30%, ${shade(c,.55)}, ${c} 50%, ${shade(c,-.45)})`;
    html+=`<button class="lv${locked?' locked':''}${cur?' cur':''}" data-l="${i}" style="left:${pts[i][0]}px;top:${pts[i][1]}px;background:${bg};${keys[i%keys.length]==='w'?'color:#5d6f92;':''}">${i+1}${st?`<span class="st">${[0,1,2].map(j=>`<i class="${j<st?'on':''}"></i>`).join('')}</span>`:''}</button>`;}
  box.innerHTML=html;$('starTotal').textContent=tot;
  box.querySelectorAll('.lv').forEach(b=>b.onclick=()=>{audio();const l=+b.dataset.l;if(l+1<=prog.unlocked)startLevel(l);else SFX.nope();});
  const curY=pts[Math.min(N,prog.unlocked)-1][1];$('mapScroll').scrollTop=curY-$('mapScroll').clientHeight/2;}
function showMap(){show('map');buildMap();}

/* ---------- boot ---------- */
window.MCS={startLevel,setTubes,get state(){return state},tryPour,lay:()=>lay,prog:()=>prog,solveNow:()=>Rules.solve(state,60000),forceCommit:()=>{if(anim)commit();}};
showMap();requestAnimationFrame(frame);
if('serviceWorker'in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>r.update());}
})();
