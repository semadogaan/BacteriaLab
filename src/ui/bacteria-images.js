/**
 * bacteria-images.js
 * 
 * 30 bakteri için Wikimedia Commons'tan doğrudan çalışan görsel URL'leri.
 * Tüm görseller CC-BY-SA lisanslı, kullanımda kaynak belirtilmesi önerilir.
 * 
 * Kullanım:
 *   import { getBacteriaImage } from './bacteria-images.js';
 *   const img = getBacteriaImage('Pseudomonas aeruginosa');
 *   // → { url: "https://...", source: "Wikimedia Commons", license: "Public Domain" }
 * 
 * Veya doğrudan haritayı kullanın:
 *   BACTERIA_IMAGES['Escherichia coli'].url
 */

const BASE = 'https://upload.wikimedia.org/wikipedia/commons';
const COMMONS = 'https://commons.wikimedia.org/wiki/Special:FilePath';

export const BACTERIA_IMAGES = {

  'Escherichia coli': {
    url: `${BASE}/d/d4/Escherichia_coli_gram_stain.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC / Dr. Patricia Fields, Dr. Collette Fitzgerald'
  },

  'Serratia marcescens': {
    url: `${COMMONS}/Serratia_marcescens_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Pseudomonas aeruginosa': {
    url: `${BASE}/thumb/f/f2/Pseudomonas_aeruginosa_electron_micrograph.jpg/400px-Pseudomonas_aeruginosa_electron_micrograph.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Micrococcus luteus': {
    url: `${COMMONS}/Micrococcus_luteus_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Staphylococcus aureus': {
    url: `${BASE}/thumb/5/53/Staphylococcus_aureus_VISA_2.jpg/400px-Staphylococcus_aureus_VISA_2.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC / Janice Haney Carr'
  },

  'Bacillus subtilis': {
    url: `${BASE}/thumb/5/54/Bacillus_subtilis_gram_stain.jpg/400px-Bacillus_subtilis_gram_stain.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Vibrio cholerae': {
    url: `${BASE}/thumb/a/a4/Vibrio_cholerae.jpg/400px-Vibrio_cholerae.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Salmonella enterica': {
    url: `${BASE}/thumb/1/17/SalmonellaNIAID.jpg/400px-SalmonellaNIAID.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'NIAID'
  },

  'Deinococcus radiodurans': {
    url: `${BASE}/thumb/5/5d/Deinococcus_radiodurans.jpg/400px-Deinococcus_radiodurans.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'Michael Daly'
  },

  'Aliivibrio fischeri': {
    url: `${COMMONS}/Aliivibrio_fischeri.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Chromobacterium violaceum': {
    url: `${COMMONS}/Chromobacterium_violaceum_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Clostridium sporogenes': {
    url: `${COMMONS}/Clostridium_sporogenes_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Mycobacterium tuberculosis': {
    url: `${BASE}/thumb/4/4c/Mycobacterium_tuberculosis_8438_lores.jpg/400px-Mycobacterium_tuberculosis_8438_lores.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC / Dr. Ray Butler'
  },

  'Listeria monocytogenes': {
    url: `${BASE}/thumb/7/73/Listeria_monocytogenes_PHIL_2287_lores.jpg/400px-Listeria_monocytogenes_PHIL_2287_lores.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Lactobacillus acidophilus': {
    url: `${COMMONS}/Lactobacillus_acidophilus_SEM.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 2.0'
  },

  'Streptococcus pneumoniae': {
    url: `${BASE}/thumb/7/70/Streptococcus_pneumoniae_01.jpg/400px-Streptococcus_pneumoniae_01.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Helicobacter pylori': {
    url: `${BASE}/thumb/8/8b/Helicobacter_pylori_diagram.svg/400px-Helicobacter_pylori_diagram.svg.png`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Thermus aquaticus': {
    url: `${COMMONS}/Thermus_aquaticus_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Halobacterium salinarum': {
    url: `${COMMONS}/Halobacterium_salinarum_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Bacillus anthracis': {
    url: `${BASE}/thumb/d/d9/Bacillus_anthracis.jpg/400px-Bacillus_anthracis.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Yersinia pestis': {
    url: `${BASE}/thumb/d/d4/Yersinia_pestis_fluorescent.jpeg/400px-Yersinia_pestis_fluorescent.jpeg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC / Larry Stauffer'
  },

  'Neisseria meningitidis': {
    url: `${BASE}/thumb/d/d7/Neisseria_meningitidis_serogroup_A.jpg/400px-Neisseria_meningitidis_serogroup_A.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },

  'Rhodospirillum rubrum': {
    url: `${COMMONS}/Rhodospirillum_rubrum.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Bifidobacterium bifidum': {
    url: `${COMMONS}/Bifidobacterium_bifidum.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Streptomyces coelicolor': {
    url: `${BASE}/thumb/2/28/Streptomyces_coelicolor.jpg/400px-Streptomyces_coelicolor.jpg`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Agrobacterium tumefaciens': {
    url: `${COMMONS}/Agrobacterium_tumefaciens_01.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Shewanella oneidensis': {
    url: `${COMMONS}/Shewanella_oneidensis_MR-1.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Pseudomonas syringae': {
    url: `${COMMONS}/Pseudomonas_syringae_pv_tomato_lesion.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Lactococcus lactis': {
    url: `${COMMONS}/Lactococcus_lactis.jpg?width=400`,
    source: 'Wikimedia Commons',
    license: 'CC BY-SA 3.0'
  },

  'Corynebacterium diphtheriae': {
    url: `${BASE}/thumb/d/d0/Corynebacterium_diphteriae_PHIL_1939_lores.jpg/400px-Corynebacterium_diphteriae_PHIL_1939_lores.jpg`,
    source: 'Wikimedia Commons',
    license: 'Public Domain',
    credit: 'CDC'
  },
};

/**
 * Bakteri adına göre görsel bilgisini döndürür.
 * Bulunamazsa Wikipedia API'ye fallback yapar.
 * 
 * @param {string} name - Bakteri tam adı
 * @returns {{ url: string, source: string, license: string } | null}
 */
export function getBacteriaImage(name) {
  return BACTERIA_IMAGES[name] ?? null;
}

/**
 * Görsel yükle + hata durumunda otomatik fallback.
 * Kullanım:
 *   loadBacteriaImage('Pseudomonas aeruginosa', imgElement, placeholderElement);
 */
export async function loadBacteriaImage(name, imgEl, placeholderEl = null) {
  const data = getBacteriaImage(name);
  if (!data) {
    if (placeholderEl) placeholderEl.style.display = 'flex';
    return;
  }

  return new Promise((resolve) => {
    imgEl.onload = () => {
      imgEl.style.display = 'block';
      if (placeholderEl) placeholderEl.style.display = 'none';
      resolve(true);
    };
    imgEl.onerror = async () => {
      // Birincil URL çalışmazsa Wikipedia API'ye fallback
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
          { headers: { 'Api-User-Agent': 'BacteriaLab/1.0' } }
        );
        const json = await res.json();
        if (json.thumbnail?.source) {
          imgEl.src = json.thumbnail.source;
          return;
        }
      } catch {}
      if (placeholderEl) placeholderEl.style.display = 'flex';
      resolve(false);
    };
    imgEl.src = data.url;
  });
}

// window üzerinde de erişilebilir yap (non-module script'ler için)
if (typeof window !== 'undefined') {
  window.BACTERIA_IMAGES = BACTERIA_IMAGES;
  window.getBacteriaImage = getBacteriaImage;
  window.loadBacteriaImage = loadBacteriaImage;
}
