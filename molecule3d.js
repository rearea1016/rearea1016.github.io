(() => {
  const stage = document.getElementById('moleculeStage');
  const canvas = document.getElementById('molecule3d');
  if (!stage || !canvas) return;
  stage.classList.add('is-3d');
  const ctx = canvas.getContext('2d');
  const energyLabel = document.getElementById('energyCount');
  let width = 0, height = 0, dpr = 1;
  let rx = -0.68, ry = 0.25, vx = 0, vy = 0.0035, zoom = 1;
  let dragging = false, lastX = 0, lastY = 0, lastTime = 0;
  let grabbedElectron = false, releasedElectron = false, releasedAt = 0;
  let electron = {x:0, y:0, vx:0, vy:0};
  let electronScreen = {x:0, y:0};
  let energy = 0, pulse = 0;

  const atoms = [];
  const bonds = [];
  const cageCount = 46;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < cageCount; i++) {
    const y = 1 - (i / (cageCount - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * i;
    atoms.push({x:Math.cos(angle)*radius*2.45,y:y*2.45,z:Math.sin(angle)*radius*2.45,type:[4,17,29,40].includes(i)?'N':'C'});
  }
  const bondKeys = new Set();
  atoms.forEach((atom, index) => {
    atoms.map((other, otherIndex) => ({otherIndex,distance:Math.hypot(atom.x-other.x,atom.y-other.y,atom.z-other.z)}))
      .filter(item => item.otherIndex !== index).sort((a,b) => a.distance-b.distance).slice(0,3)
      .forEach(item => {const a=Math.min(index,item.otherIndex),b=Math.max(index,item.otherIndex),key=`${a}-${b}`;if(!bondKeys.has(key)){bondKeys.add(key);bonds.push([a,b,1])}});
  });
  atoms.push({x:0,y:0,z:0,type:'core',hidden:true});

  function resize() {
    const rect = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function rotate(point) {
    const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
    const x=point.x*cy+point.z*sy, z=-point.x*sy+point.z*cy;
    return {x,y:point.y*cx-z*sx,z:point.y*sx+z*cx};
  }
  function project(point) {
    const p=rotate(point), perspective=7/(7-p.z), scale=Math.min(width,height)*.125*zoom;
    return {x:width/2+p.x*scale*perspective,y:height/2+p.y*scale*perspective,z:p.z,r:perspective};
  }

  function sphere(x,y,r,color,highlight='#fff') {
    const g=ctx.createRadialGradient(x-r*.35,y-r*.42,r*.08,x,y,r);
    g.addColorStop(0,highlight);g.addColorStop(.2,color);g.addColorStop(1,'#090909');
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.stroke();
  }
  function stick(a,b,order=1) {
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    const offsets=order===2?[-2.2,2.2]:[0];
    offsets.forEach(offset=>{ctx.beginPath();ctx.moveTo(a.x+nx*offset,a.y+ny*offset);ctx.lineTo(b.x+nx*offset,b.y+ny*offset);ctx.strokeStyle='#262626';ctx.lineWidth=order===2?2.3:3.5;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.moveTo(a.x+nx*offset-1,a.y+ny*offset-1);ctx.lineTo(b.x+nx*offset-1,b.y+ny*offset-1);ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=.8;ctx.stroke()});
  }

  function draw(now) {
    if (!dragging && !grabbedElectron) {ry+=vy;rx+=vx;vy*=.992;vx*=.992;if(Math.abs(vy)<.0015)vy=.0015;}
    ctx.clearRect(0,0,width,height);
    const projected=atoms.map(project);
    bonds.map(b=>({b,a:projected[b[0]],c:projected[b[1]],z:(projected[b[0]].z+projected[b[1]].z)/2})).sort((a,b)=>a.z-b.z).forEach(item=>stick(item.a,item.c,item.b[2]));
    projected.map((p,i)=>({p,i,z:p.z})).filter(item=>!atoms[item.i].hidden).sort((a,b)=>a.z-b.z).forEach(({p,i})=>{
      const atom=atoms[i], base=atom.type==='N'?'#c51f27':'#3b3b3b', radius=(atom.type==='N'?12:9)*p.r;
      sphere(p.x,p.y,radius,base,atom.type==='N'?'#ffd5d7':'#e7e7e7');
      if(atom.type==='N'){ctx.fillStyle='#fff';ctx.font=`${Math.max(7,8*p.r)}px DM Mono`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('N',p.x,p.y+.5)}
    });
    const t=now*.0011;
    const orbitTarget=project({x:Math.cos(t)*3.05,y:Math.sin(t)*1.4,z:Math.sin(t)*2.1});
    if (!grabbedElectron && !releasedElectron) {
      electronScreen=orbitTarget;
    } else if (releasedElectron) {
      const flightTime=now-releasedAt;
      const attraction=flightTime<700?.0018:.009;
      const target=flightTime<700?{x:width/2,y:height/2}:orbitTarget;
      electron.vx+=(target.x-electron.x)*attraction;
      electron.vy+=(target.y-electron.y)*attraction;
      electron.vx*=.986;electron.vy*=.986;
      electron.x+=electron.vx;electron.y+=electron.vy;
      electronScreen.x=electron.x;electronScreen.y=electron.y;
      const joinedOrbit=Math.hypot(electron.x-orbitTarget.x,electron.y-orbitTarget.y)<12;
      if((flightTime>900&&joinedOrbit)||flightTime>2800)releasedElectron=false;
    } else {
      electronScreen.x=electron.x;electronScreen.y=electron.y;
    }
    sphere(electronScreen.x,electronScreen.y,9,'#d6202a','#fff0f0');
    ctx.beginPath();ctx.arc(electronScreen.x,electronScreen.y,18+Math.sin(now*.008)*3,0,Math.PI*2);ctx.strokeStyle='rgba(197,31,39,.25)';ctx.lineWidth=1;ctx.stroke();
    if(pulse>0){ctx.beginPath();ctx.arc(width/2,height/2,(1-pulse)*130,0,Math.PI*2);ctx.strokeStyle=`rgba(197,31,39,${pulse})`;ctx.lineWidth=2;ctx.stroke();pulse=Math.max(0,pulse-.025)}
    requestAnimationFrame(draw);
  }

  canvas.addEventListener('pointerdown', e=>{
    e.stopPropagation();
    const distance=Math.hypot(e.offsetX-electronScreen.x,e.offsetY-electronScreen.y);
    if(distance<42){
      releasedElectron=false;grabbedElectron=true;
      electron={x:e.offsetX,y:e.offsetY,vx:0,vy:0};canvas.classList.add('electron-grabbed');
    }else{dragging=true;canvas.classList.add('rotating')}
    lastX=e.clientX;lastY=e.clientY;lastTime=performance.now();canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    e.stopPropagation();
    if(!dragging&&!grabbedElectron)return;const now=performance.now(),dt=Math.max(8,now-lastTime),dx=e.clientX-lastX,dy=e.clientY-lastY;
    if(grabbedElectron){electron.x=e.offsetX;electron.y=e.offsetY;electron.vx=dx/dt*13;electron.vy=dy/dt*13}else{ry+=dx*.009;rx-=dy*.009;vy=dx/dt*.04;vx=-dy/dt*.04}
    lastX=e.clientX;lastY=e.clientY;lastTime=now;
  });
  function releasePointer(e) {
    if(e)e.stopPropagation();
    if(grabbedElectron){
      grabbedElectron=false;releasedElectron=true;releasedAt=performance.now();canvas.classList.remove('electron-grabbed');
      energy+=Math.max(1,Math.min(9,Math.round(Math.hypot(electron.vx,electron.vy))));
      energyLabel.textContent=`E ${String(energy).padStart(2,'0')}`;
    }
    dragging=false;canvas.classList.remove('rotating');
    if(e && canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener('pointerup',releasePointer);
  canvas.addEventListener('pointercancel',releasePointer);
  window.addEventListener('pointerup',e=>{if(dragging||grabbedElectron)releasePointer(e)});
  window.addEventListener('blur',()=>{if(dragging||grabbedElectron)releasePointer()});
  canvas.addEventListener('dblclick',()=>{vy=.055;pulse=1;energy+=5;energyLabel.textContent=`E ${String(energy).padStart(2,'0')}`});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.72,Math.min(1.5,zoom-e.deltaY*.001))},{passive:false});
  new ResizeObserver(resize).observe(stage);resize();requestAnimationFrame(draw);
})();
