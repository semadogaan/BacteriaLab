// ═══════════════════════════════════════════════════════
//  RENDERER ENGINE
//  Petri kabı canvas çizimleri, renk interpolasyonu, blob efekti
// ═══════════════════════════════════════════════════════

function smoothStep(t) { return t*t*(3-2*t); }

function hexToRgbArr(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1],16),parseInt(r[2],16),parseInt(r[3],16)] : [180,180,180];
}

function interpColor(stops, ratio) {
  if(!stops||stops.length<4) return [180,180,180];
  let t, c1, c2;
  if(ratio<=0.25){t=ratio/0.25;c1=hexToRgbArr(stops[0]);c2=hexToRgbArr(stops[1]);}
  else if(ratio<=0.65){t=(ratio-0.25)/0.4;c1=hexToRgbArr(stops[1]);c2=hexToRgbArr(stops[2]);}
  else{t=Math.min(1,(ratio-0.65)/0.35);c1=hexToRgbArr(stops[2]);c2=hexToRgbArr(stops[3]);}
  t=smoothStep(t);
  return [Math.round(c1[0]+t*(c2[0]-c1[0])),Math.round(c1[1]+t*(c2[1]-c1[1])),Math.round(c1[2]+t*(c2[2]-c1[2]))];
}

function drawBlob(ctx, cx, cy, r, rng, elongate) {
  const N = 8, step = Math.PI*2/N;
  const pts = [];
  for(let i=0;i<N;i++){
    const a = i*step;
    let rad = r*(0.82+rng()*0.38);
    if(elongate) rad *= (Math.abs(Math.cos(a))*0.6+0.4);
    pts.push({x:cx+Math.cos(a)*rad, y:cy+Math.sin(a)*rad});
  }
  ctx.beginPath();
  const sx=(pts[N-1].x+pts[0].x)/2, sy=(pts[N-1].y+pts[0].y)/2;
  ctx.moveTo(sx,sy);
  for(let i=0;i<N;i++){
    const p1=pts[i], p2=pts[(i+1)%N];
    ctx.quadraticCurveTo(p1.x,p1.y,(p1.x+p2.x)/2,(p1.y+p2.y)/2);
  }
  ctx.closePath();
}

function redraw(state) {
  const {ctx, canvas, inoculations, time, temp, ph, nacl, oxy} = state;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const tval = document.getElementById(`${state.id}-tval`);
  const oxyWarn = document.getElementById(`${state.id}-oxywarning`);
  const phaseBar = document.getElementById(`${state.id}-phase`);

  const rawRatio = time/100;

  if(oxyWarn) oxyWarn.style.display='none';
  if(inoculations.length===0){
    if(tval) tval.textContent='0h';
    if(phaseBar) phaseBar.style.width='0%';
    return;
  }

  const firstBac = inoculations[0].bacteria;
  if(tval) tval.textContent = `${(rawRatio*firstBac.maxTime).toFixed(1)}h`;

  // Phase color
  let phaseColor = '#4ade80', phasePct = rawRatio*100;
  if(rawRatio>0.85){phaseColor='#f87171';}
  else if(rawRatio>0.65){phaseColor='#f59e0b';}
  if(phaseBar){phaseBar.style.width=phasePct+'%';phaseBar.style.background=phaseColor;}

  let oxyFlag = false;
  const renderQ = [];
  const dlaQ = [];

  inoculations.forEach(cfu => {
    const b = cfu.bacteria;
    const phFac = calcPhFactor(ph, b.phMin, b.phOptimum, b.phMax);
    const tempFac = calcTempFactor(temp, b.tempMin, b.tempOptimum, b.tempMax);

    let oxyFac = 1.0;
    if(b.oxygenReq!=='facultative'&&b.oxygenReq!==oxy){
      oxyFac=0.25; oxyFlag=true;
    }
    if(oxy==='anaerobic'&&b.oxygenReq==='aerobic'){oxyFac=0.1;}

    const naclFac = calcNaClFactor(nacl||0.5, b.naclMin, b.naclOptimal, b.naclMax);
    const envFactor = phFac * tempFac * oxyFac * naclFac;
    const timeRatio = rawRatio * envFactor;

    let color = interpColor(b.colorStops, timeRatio);
    if(b.tempSensitivePigment){
      const tf = Math.max(0,Math.min(1,(b.tempMax-temp)/(b.tempMax-b.tempMin)));
      const lum = 0.3*color[0]+0.59*color[1]+0.11*color[2];
      color = color.map((c,i) => Math.round(lum + tf*(c-lum)));
    }
    // Bioluminescence: add glow tint
    if(b.bioluminescent && timeRatio>0.2){
      const glow = Math.min(1,(timeRatio-0.2)/0.4);
      color[1] = Math.min(255, color[1]+Math.floor(40*glow));
    }

    if(cfu.isDLA){
      if(!cfu.dlaCache&&!cfu.isComputingDLA){
        cfu.isComputingDLA=true;
        const rng = seededRandom(cfu.seedNum);
        const cnt = Math.min(800, Math.floor(b.growthRate*600));
        buildDLAAsync(cfu.originX,cfu.originY,canvas.width/2*0.85,cnt,rng,envFactor,(struct)=>{
          cfu.dlaCache={structure:struct};
          cfu.isComputingDLA=false;
          redraw(state);
        });
      }
      if(cfu.isComputingDLA){
        dlaQ.push({text:'Computing...',x:cfu.originX,y:cfu.originY});
      } else if(cfu.dlaCache){
        dlaQ.push({cfu,color,timeRatio});
      }
      return;
    }

    // Phase scale
    let phaseScale = 0, opMult = 1;
    if(timeRatio<=0.15) phaseScale=(timeRatio/0.15)*0.12;
    else if(timeRatio<=0.65) phaseScale=0.12+((timeRatio-0.15)/0.5)*0.68;
    else if(timeRatio<=0.85) phaseScale=0.8+((timeRatio-0.65)/0.2)*0.2;
    else{phaseScale=1;opMult=1-((timeRatio-0.85)/0.15)*0.55;}

    const order = {blur:0,micro:1,small:2,medium:3,dominant:4,satellite:5};

    cfu.colonies.forEach(c => {
      let rs=phaseScale, op=opMult;
      if(c.type==='micro'){if(timeRatio>0.85)op*=0.2;rs*=0.5;}
      else if(c.type==='small')rs*=0.8;
      else if(c.type==='dominant'&&timeRatio>0.15)rs*=1.2;

      const cr = c.maxRadius*b.growthRate*rs;
      if(cr<=0.5) return;

      renderQ.push({type:c.type,x:c.x,y:c.y,r:cr,color,op,rot:c.rotation,bs:c.blobSeed,sat:c.type==='satellite',order:order[c.type]||0});
    });
  });

  if(oxyFlag&&oxyWarn) oxyWarn.style.display='block';
  renderQ.sort((a,b)=>a.order-b.order);

  // Halos
  renderQ.forEach(({x,y,r,color,type,rot,bs,sat})=>{
    const hr=r*1.4;
    const halo=ctx.createRadialGradient(x,y,r*0.5,x,y,hr);
    halo.addColorStop(0,`rgba(${color[0]},${color[1]},${color[2]},0.18)`);
    halo.addColorStop(1,`rgba(${color[0]},${color[1]},${color[2]},0)`);
    ctx.fillStyle=halo;
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);
    drawBlob(ctx,0,0,hr,seededRandom(bs+999),sat);
    ctx.fill();ctx.restore();
  });

  // Bodies
  renderQ.forEach(({x,y,r,color,op,type,rot,bs,sat})=>{
    let base=0.75;
    if(type==='dominant')base=0.9;
    if(type==='micro')base=0.45;
    base*=op;
    ctx.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${base})`;
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);
    drawBlob(ctx,0,0,r,seededRandom(bs),sat);
    ctx.fill();
    // Core
    const cr=[Math.max(0,color[0]-30),Math.max(0,color[1]-30),Math.max(0,color[2]-30)];
    ctx.fillStyle=`rgba(${cr[0]},${cr[1]},${cr[2]},${Math.min(1,base+0.15)})`;
    drawBlob(ctx,0,0,r*0.3,seededRandom(bs+1),sat);
    ctx.fill();
    ctx.restore();
  });

  // DLA
  dlaQ.forEach(item=>{
    if(item.text){
      ctx.save();ctx.font='bold 11px Space Mono,monospace';
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(item.text,item.x,item.y);ctx.restore();
    } else {
      const nodes=item.cfu.dlaCache.structure;
      const vis=Math.floor(nodes.length*item.timeRatio);
      const c=item.color, cx2=item.cfu.originX, cy2=item.cfu.originY;
      nodes.slice(0,vis).forEach(n=>{
        const dr=Math.sqrt((n.x-cx2)**2+(n.y-cy2)**2)/(canvas.width/2);
        const alpha=Math.max(0.08,0.85-dr*0.4);
        const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*2.5);
        g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},${alpha*0.4})`);
        g.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.beginPath();ctx.arc(n.x,n.y,n.r*2.5,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${alpha})`;ctx.fill();
      });
    }
  });

  // Update charts if they exist and we are looking at a bacteria
  if (window.ChartManager && window.selectedBacteria) {
    window.ChartManager.updateAll(window.selectedBacteria, state);
  }
}

function renderThumbnail(miniCanvas, state) {
  const mc = miniCanvas.getContext('2d');
  const scale = 50 / 260;
  mc.save();
  mc.scale(scale, scale);
  const tempCtx = state.ctx;
  // Draw simplified version
  state.inoculations.forEach(cfu => {
    const b = cfu.bacteria;
    const color = hexToRgbArr(b.hex);
    cfu.colonies.slice(0, 20).forEach(c => {
      mc.beginPath();
      mc.arc(c.x, c.y, c.maxRadius * b.growthRate * 0.5, 0, Math.PI*2);
      mc.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.7)`;
      mc.fill();
    });
  });
  mc.restore();
}

window.redraw = redraw;
window.renderThumbnail = renderThumbnail;
