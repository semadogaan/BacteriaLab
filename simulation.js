// ═══════════════════════════════════════════════════════
//  SIMULATION ENGINE
//  Matematiksel modeller, CFU, DLA ve büyüme algoritmaları
// ═══════════════════════════════════════════════════════

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function randGauss(rng) {
  let u = 0, v = 0;
  while(!u) u = rng();
  while(!v) v = rng();
  return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
}

class CFU {
  constructor(x, y, bacteria, seed) {
    this.originX = x; 
    this.originY = y;
    this.bacteria = bacteria;
    this.seedNum = seed;
    this.colonies = [];
    this.isDLA = bacteria.spreadPattern === 'branching';
    this.dlaCache = null;
    this.isComputingDLA = false;

    if (!this.isDLA) {
      const rng = seededRandom(seed);
      const gr = bacteria.growthRate;
      const base = Math.floor(gr * 100);
      const clusters = [];
      const nc = 2 + Math.floor(rng() * 3);
      clusters.push({ x, y, r: 35 + rng()*25 });
      for (let i = 1; i < nc; i++) {
        const a = rng()*Math.PI*2, d = 8+rng()*35;
        clusters.push({ x: x+Math.cos(a)*d, y: y+Math.sin(a)*d, r: 18+rng()*18 });
      }

      const place = (n, type, rmin, rmax) => {
        for (let i = 0; i < n; i++) {
          const cl = clusters[Math.floor(rng()*clusters.length)];
          const d = Math.abs(randGauss(rng)) * cl.r * 0.4;
          const a = rng()*Math.PI*2;
          this.colonies.push({
            type, x: cl.x+Math.cos(a)*d, y: cl.y+Math.sin(a)*d,
            maxRadius: rmin + rng()*(rmax-rmin),
            rotation: rng()*Math.PI*2,
            blobSeed: Math.floor(rng()*100000),
            deleted: false
          });
        }
      };

      place(Math.max(1,Math.floor(base*0.07)), 'dominant', 18, 26);
      place(Math.floor(base*0.22), 'medium', 10, 17);
      place(Math.floor(base*0.35), 'small', 5, 9);
      place(Math.floor(base*0.25), 'micro', 1, 4);

      const doms = this.colonies.filter(c => c.type==='dominant');
      for (let i = 0; i < Math.floor(base*0.08); i++) {
        if (!doms.length) break;
        const p = doms[Math.floor(rng()*doms.length)];
        const a = rng()*Math.PI*2, dd = p.maxRadius+2+rng()*10;
        this.colonies.push({
          type:'satellite', x:p.x+Math.cos(a)*dd, y:p.y+Math.sin(a)*dd,
          maxRadius:3+rng()*4, rotation:a, blobSeed:Math.floor(rng()*100000), deleted:false
        });
      }

      // Inhibition zones
      this.colonies.forEach(c => {
        if (c.type==='small'||c.type==='micro') {
          for (const d of doms) {
            const dx=c.x-d.x, dy=c.y-d.y;
            if (Math.sqrt(dx*dx+dy*dy) < d.maxRadius*1.4) {
              if (rng()<0.7) c.deleted=true;
              else c.maxRadius*=0.5;
              break;
            }
          }
        }
      });

      this.colonies = this.colonies.filter(c=>!c.deleted);
    }
  }
}

function buildDLAAsync(cx, cy, maxR, count, rng, envFactor, done) {
  const stuck = [{x:cx,y:cy,r:3}];
  const grid = new Set();
  const gs = 4;
  const key = (x,y) => `${Math.floor(x/gs)},${Math.floor(y/gs)}`;
  grid.add(key(cx,cy));
  let maxStuck = 3;
  let pi = 0;
  const step = 2+(1-envFactor)*4;

  function chunk() {
    const end = Math.min(pi+40, count);
    for (; pi < end; pi++) {
      const spR = maxStuck+20, a = rng()*Math.PI*2;
      let px = cx+Math.cos(a)*spR, py = cy+Math.sin(a)*spR;
      for (let s = 0; s < 1500; s++) {
        px += (rng()-0.5)*step; py += (rng()-0.5)*step;
        const d = Math.sqrt((px-cx)**2+(py-cy)**2);
        if (d>maxR||d>spR*2) break;
        const gx=Math.floor(px/gs), gy=Math.floor(py/gs);
        let hit = false;
        for (let dx=-1;dx<=1&&!hit;dx++) for(let dy=-1;dy<=1&&!hit;dy++) if(grid.has(`${gx+dx},${gy+dy}`)) hit=true;
        if (hit) {
          const r = rng()*3+1.5;
          stuck.push({x:px,y:py,r});
          grid.add(key(px,py));
          const dd = Math.sqrt((px-cx)**2+(py-cy)**2);
          if(dd>maxStuck) maxStuck=dd;
          break;
        }
      }
    }
    if(pi<count) requestAnimationFrame(chunk);
    else done(stuck);
  }
  requestAnimationFrame(chunk);
}

// Environmental factors
function calcPhFactor(ph, phMin, phOpt, phMax) {
  if(ph<=phMin||ph>=phMax) return 0.15;
  if(ph<phOpt) return 0.15 + 0.85*((ph-phMin)/(phOpt-phMin));
  return 0.15 + 0.85*((phMax-ph)/(phMax-phOpt));
}

function calcNaClFactor(nacl, nMin, nOpt, nMax) {
  if(nacl<=nMin||nacl>=nMax) return 0.15;
  if(nacl<nOpt) return 0.15 + 0.85*((nacl-nMin)/(nOpt-nMin));
  return 0.15 + 0.85*((nMax-nacl)/(nMax-nOpt));
}

function calcTempFactor(temp, tMin, tOpt, tMax) {
  if(temp<=tMin||temp>=tMax) return 0.1;
  if(temp<tOpt) return 0.1 + 0.9*((temp-tMin)/(tOpt-tMin));
  return 0.1 + 0.9*((tMax-temp)/(tMax-tOpt));
}

// Global scope exports for compatibility
window.CFU = CFU;
window.buildDLAAsync = buildDLAAsync;
window.calcPhFactor = calcPhFactor;
window.calcNaClFactor = calcNaClFactor;
window.calcTempFactor = calcTempFactor;
window.seededRandom = seededRandom;
