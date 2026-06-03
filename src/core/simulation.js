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

var CFU = class {
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


// ═══════════════════════════════════════════════════════════
//  LOTKA-VOLTERRA — İki Tür Arası Rekabet/Sinerji Modeli
//  dN1/dt = r1 · N1 · (1 − (N1 + α12·N2) / K1)
//  dN2/dt = r2 · N2 · (1 − (N2 + α21·N1) / K2)
// ═══════════════════════════════════════════════════════════

/**
 * Lotka-Volterra rekabet denklemleri — tek zaman adımı
 *
 * @param {number} N1      — tür 1 anlık popülasyon yoğunluğu (0–1 normalize)
 * @param {number} N2      — tür 2 anlık popülasyon yoğunluğu (0–1 normalize)
 * @param {number} r1      — tür 1 maksimum büyüme hızı (µ_max, h⁻¹)
 * @param {number} r2      — tür 2 maksimum büyüme hızı (µ_max, h⁻¹)
 * @param {number} K1      — tür 1 taşıma kapasitesi
 * @param {number} K2      — tür 2 taşıma kapasitesi
 * @param {number} alpha12 — tür 2'nin tür 1 üzerindeki rekabet katsayısı
 * @param {number} alpha21 — tür 1'in tür 2 üzerindeki rekabet katsayısı
 * @param {number} dt      — zaman adımı (saat)
 * @returns {{ dN1: number, dN2: number, N1_next: number, N2_next: number }}
 */
function lotkaVolterraStep(N1, N2, r1, r2, K1, K2, alpha12, alpha21, dt) {
  const safeK1 = K1 > 0 ? K1 : 1;
  const safeK2 = K2 > 0 ? K2 : 1;

  const dN1 = r1 * N1 * (1 - (N1 + alpha12 * N2) / safeK1) * dt;
  const dN2 = r2 * N2 * (1 - (N2 + alpha21 * N1) / safeK2) * dt;

  const N1_next = Math.max(0, N1 + dN1);
  const N2_next = Math.max(0, N2 + dN2);

  return { dN1, dN2, N1_next, N2_next };
}


// ═══════════════════════════════════════════════════════════
//  HILL DENKLEMİ — Antibiyotik Konsantrasyon–Etki İlişkisi
//  E = Emax · C^n / (EC50^n + C^n)
// ═══════════════════════════════════════════════════════════

/**
 * Hill denklemi — sigmoidal doz-yanıt modeli
 *
 * @param {number} C       — antibiyotik konsantrasyonu (mg/L)
 * @param {number} EC50    — yarı-maksimum etki konsantrasyonu (≈ MIC, mg/L)
 * @param {number} n       — Hill katsayısı (antibiotic_pk.json → hill_coefficient_n)
 *                           n=1: hiperbolik, n>1: kooperatif (daha dik eğri)
 * @param {number} [Emax=1] — maksimum öldürme hızı (0–1)
 * @returns {number} killRate (0–1 arası; 0=etkisiz, 1=tam öldürme)
 */
function hillEquation(C, EC50, n, Emax) {
  if (typeof Emax === 'undefined' || Emax === null) Emax = 1;
  if (C <= 0) return 0;
  if (EC50 <= 0) return Emax;

  const Cn    = Math.pow(C, n);
  const EC50n = Math.pow(EC50, n);

  return Emax * Cn / (EC50n + Cn);
}


// ═══════════════════════════════════════════════════════════
//  DOKU DİFÜZYON MODELİ — Fick 2. Yasası (erfc çözümü)
//  C(x,t) = C₀ · erfc( x / (2·√(D·t)) )
// ═══════════════════════════════════════════════════════════

/**
 * Tamamlayıcı hata fonksiyonu (erfc) — Abramowitz & Stegun 7.1.26
 * Polinom yaklaşımı, maksimum hata: 1.5×10⁻⁷
 *
 * @param {number} x
 * @returns {number} erfc(x)
 */
function erfc(x) {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const p  = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const erfVal = 1 - (a1*t + a2*t2 + a3*t3 + a4*t4 + a5*t5) *
                 Math.exp(-absX * absX);

  const erfcPos = 1 - erfVal;
  return sign >= 0 ? erfcPos : (2 - erfcPos);
}

/**
 * Doku difüzyon modeli — Fick 2. yasası yarı-sonsuz ortam çözümü
 *
 * @param {number} C0             — yüzey konsantrasyonu (mg/L)
 * @param {number} depth_mm       — derinlik (mm)
 * @param {number} diffusionCoeff — difüzyon katsayısı (cm²/s), tissue_models.json'dan
 * @param {number} t_hours        — geçen süre (saat)
 * @returns {number} o derinlikteki konsantrasyon (mg/L)
 */
function tissueDiffusion(C0, depth_mm, diffusionCoeff, t_hours) {
  if (C0 <= 0 || t_hours <= 0) return 0;
  if (depth_mm <= 0) return C0;
  if (diffusionCoeff <= 0) return 0;

  const depth_cm = depth_mm * 0.1;        // mm → cm
  const t_sec    = t_hours * 3600;         // saat → saniye

  const sqrtDt = Math.sqrt(diffusionCoeff * t_sec);
  if (sqrtDt <= 0) return 0;

  const arg = depth_cm / (2 * sqrtDt);
  return C0 * erfc(arg);
}


// ═══════════════════════════════════════════════════════════
//  POISSON MUTASYON MODELİ — Direnç Gelişim Simülasyonu
//  Lambda = µ_max × mutationRate × t
//  Knuth algoritması ile Poisson örnekleme (deterministik)
// ═══════════════════════════════════════════════════════════

/**
 * Poisson dağılımından örnekleme — Knuth algoritması
 *
 * @param {number} mu_max       — maksimum büyüme hızı (h⁻¹)
 * @param {number} mutationRate — baz mutasyon oranı (per cell per div, ~10⁻⁹)
 * @param {number} timeHours    — geçen süre (saat)
 * @param {number} seed         — deterministik sonuç için RNG seed
 * @returns {number} mutationEventCount (integer ≥ 0)
 */
function poissonMutation(mu_max, mutationRate, timeHours, seed) {
  const lambda = mu_max * mutationRate * timeHours;
  if (lambda <= 0) return 0;

  const rng = seededRandom(seed);

  // Büyük lambda → normal yaklaşım (Knuth çok yavaşlar)
  if (lambda > 500) {
    const u1 = rng() || 1e-10;
    const u2 = rng() || 1e-10;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }

  // Knuth algoritması
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= rng();
  } while (p > L);

  return k - 1;
}


// ═══════════════════════════════════════════════════════════
//  FIC INDEX — Fraksiyonel İnhibitör Konsantrasyon İndeksi
//  FIC = (concA/micA) + (concB/micB)
// ═══════════════════════════════════════════════════════════

/**
 * FIC indeksi hesapla
 *
 * @param {number} concA — A ilacı konsantrasyonu (mg/L)
 * @param {number} concB — B ilacı konsantrasyonu (mg/L)
 * @param {number} micA  — A ilacı MIC değeri (mg/L)
 * @param {number} micB  — B ilacı MIC değeri (mg/L)
 * @returns {number} FIC indeksi
 *   ≤ 0.5      → Sinerji
 *   0.5 < < 2  → Aditif / İndifere
 *   ≥ 2.0      → Antagonizm
 */
function calculateFICIndex(concA, concB, micA, micB) {
  if (micA <= 0 || micB <= 0) {
    console.warn('[calculateFICIndex] MIC değerleri sıfır veya negatif olamaz.');
    return Infinity;
  }
  return (concA / micA) + (concB / micB);
}

/**
 * FIC indeksini yorumla
 *
 * @param {number} fic — FIC indeks değeri
 * @returns {{ category: string, description_tr: string, color: string }}
 */
function interpretFIC(fic) {
  if (fic <= 0.5) {
    return {
      category: 'synergy',
      description_tr: 'Sinerji — kombinasyon monoterapiden belirgin üstün',
      color: '#3fb950'
    };
  }
  if (fic <= 1.0) {
    return {
      category: 'additive',
      description_tr: 'Aditif — beklenen toplam etki',
      color: '#58a6ff'
    };
  }
  if (fic < 2.0) {
    return {
      category: 'indifferent',
      description_tr: 'İndifere — anlamlı etkileşim yok',
      color: '#d29922'
    };
  }
  return {
    category: 'antagonism',
    description_tr: 'Antagonizm — kombinasyon etkiyi azaltır',
    color: '#f85149'
  };
}


window.CFU = CFU;
window.buildDLAAsync = buildDLAAsync;
window.calcPhFactor = calcPhFactor;
window.calcNaClFactor = calcNaClFactor;
window.calcTempFactor = calcTempFactor;
window.seededRandom = seededRandom;
window.randGauss = randGauss;

// optimizer.js bu modellerin asıl sahibidir (PK/PD entegre)
// Burada sadece simulation.js'e özgü fonksiyonlar export edilir
window.erfc = erfc;
window.calculateFICIndex = calculateFICIndex;
window.interpretFIC = interpretFIC;

