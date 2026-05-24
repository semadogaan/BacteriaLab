# 🧫 BacteriaLab — Mikrobiyoloji Simülasyonu

> **🔗 Canlı Demo:** [buraya-site-linki-ekle](#)

Tarayıcı tabanlı, bilimsel verilerle desteklenmiş interaktif bakteri büyüme simülasyonu. 30 farklı bakteri türü, gerçek çevre koşulları parametreleri ve görsel koloni renderı ile gerçekçi bir petri kabı deneyimi sunar.

---

## 📸 Ekran Görüntüsü

<!-- Buraya ekran görüntüsü ekle -->

---

## ✨ Özellikler

- **30 Bakteri Türü** — *E. coli*, *S. aureus*, *V. cholerae* ve daha fazlası; bilimsel kaynaklara dayalı büyüme parametreleriyle
- **Gerçek Zamanlı Çevre Simülasyonu** — Sıcaklık, pH, NaCl konsantrasyonu ve oksijen tipinin büyümeye etkisini canlı olarak gözlemle
- **Görsel Koloni Renderı** — Canvas üzerinde blob algoritması ve DLA (Diffusion-Limited Aggregation) ile türe özgü yayılım desenleri
- **Birden Fazla Petri Kabı** — Aynı anda birden fazla kap oluştur, farklı koşullarla karşılaştır
- **Karışık Kültür** — Aynı kaba birden fazla bakteri türü ekle
- **10 Farklı Grafik** — Büyüme eğrisi, antibiyotik direnci, mutasyon frekansı ve daha fazlası
- **Deney Kaydı** — Deneyleri isimle kütüphaneye kaydet, CSV olarak indir
- **Bilimsel Veri Seti** — Tüm parametreler tek tıkla JSON formatında indirilebilir
- **Wikimedia Görselleri** — Her bakteri türü için CC lisanslı mikroskop fotoğrafları

---

## 🗂️ Proje Yapısı

```
bacterialab/
│
├── index.html            # Ana uygulama arayüzü
├── intro.html            # Giriş ekranı ve kontrol rehberi
│
├── app.js                # Ana uygulama mantığı (petri kabı yönetimi, UI olayları, CSV indirme)
├── simulation.js         # Simülasyon motoru (CFU, DLA algoritması, çevre faktörleri)
├── renderer.js           # Canvas render motoru (blob efekti, renk interpolasyonu)
├── ui-panels.js          # Sağ panel, grafik yöneticisi, bilgi panelleri
├── bacteria-store.js     # Global veri deposu (BacteriaStore singleton)
├── bacteria-images.js    # Wikimedia görsel URL'leri ve fallback mantığı
├── data_loader.js        # JSON veri seti yükleyici
│
└── bacteria_dataset.json # 30 bakteri türünün bilimsel veri seti
```

---

## 🔬 Nasıl Çalışır?

### Veri Akışı

```
bacteria_dataset.json
        ↓
   DataLoader.load()
        ↓
   BacteriaStore.init()   ← master + growth + visuals + antibiotics + interactions birleştirilir
        ↓
   renderBacteriaList()   ← Sol panelde türler listelenir
```

### Simülasyon Akışı

```
Kullanıcı bakteri seçer → Petri kabına tıklar
        ↓
   new CFU(x, y, bacteria, seed)   ← Koloni yerleşimi hesaplanır (seeded random)
        ↓
   redraw(state)   ← Canvas yeniden çizilir
        ↓
   interpColor() + drawBlob()   ← Renk ve şekil, zaman × çevre faktörüne göre belirlenir
```

### Çevre Faktörleri

Her kaydırıcı değişiminde büyüme oranı şu formülle hesaplanır:

```
envFactor = calcPhFactor(pH) × calcTempFactor(temp) × oxyFac × calcNaClFactor(NaCl)
timeRatio = (slider_value / 100) × envFactor
```

Değerler 0.0–1.0 arasında normalize edilir; 1.0 ideal koşulları ifade eder.

---

## 🧮 Bilimsel Modeller

| Parametre | Model |
|-----------|-------|
| **pH faktörü** | Lineer interpolasyon: `[phMin → phOpt → phMax]` |
| **Sıcaklık faktörü** | Lineer interpolasyon: `[tMin → tOpt → tMax]` |
| **NaCl faktörü** | Lineer interpolasyon: `[nMin → nOpt → nMax]` |
| **Oksijen uyumsuzluğu** | Aerobik/anaerobik uyumsuzlukta ×0.10–0.25 penaltı |
| **Koloni büyümesi** | Lag → Log → Stationary → Death fazlarına göre `phaseScale` |
| **DLA yayılımı** | `branching` deseni için asenkron Diffusion-Limited Aggregation |
| **Biyolüminesans** | `timeRatio > 0.2` eşiğinden sonra yeşil kanal takviyesi |

---

## 📦 Veri Seti Yapısı (`bacteria_dataset.json`)

```json
{
  "master": [
    {
      "id": "ecoli",
      "scientific_name": "Escherichia coli",
      "gram_type": "gram-neg",
      "oxygen_type": "facultative",
      "pathogenicity_level": "low",
      "tags": ["model-organism", "gut-flora"]
    }
  ],
  "growth": {
    "ecoli": {
      "temp_min": 10, "temp_opt": 37, "temp_max": 49,
      "ph_min": 4.4, "ph_opt": 7.0, "ph_max": 9.0,
      "nacl_min": 0, "nacl_opt": 0.5, "nacl_max": 8.0,
      "doubling_time_h": 0.33,
      "mu_max": 2.1,
      "colony_size_mm_day": 3.0,
      "max_time_h": 72
    }
  },
  "visuals": { ... },
  "antibiotics": { ... },
  "interactions": [ ... ],
  "bacteria_details": { ... }
}
```

---

## 🚀 Kurulum ve Çalıştırma

Proje saf HTML/CSS/JS ile yazılmıştır; derleme adımı yoktur.

### Yerel Geliştirme

```bash
# Repo'yu klonla
git clone https://github.com/kullanici-adi/bacterialab.git
cd bacterialab

# Herhangi bir statik sunucu ile aç (Live Server, Python, Node...)
python -m http.server 8080
# veya
npx serve .
```

Ardından tarayıcıda `http://localhost:8080/intro.html` adresini aç.

> ⚠️ `bacteria_dataset.json` dosyası `fetch()` ile yüklendiğinden, `file://` protokolüyle doğrudan açmak çalışmaz. Bir HTTP sunucusu gereklidir.

### GitHub Pages ile Yayınlama

1. Repo'ya git → **Settings → Pages**
2. **Branch:** `main`, **Folder:** `/ (root)` seç
3. Kaydet — birkaç dakika içinde canlıya geçer

---

## 🎮 Kullanım Kılavuzu

| Adım | Açıklama |
|------|----------|
| **1. Giriş Ekranı** | `intro.html` kontrol rehberini gösterir, "Laboratuvara Gir" butonu ile ana uygulamaya geçilir |
| **2. Bakteri Seç** | Sol panelden bir tür tıkla — yeşil rozet ile seçili tür işaretlenir |
| **3. Petri Kabına Ekle** | Petri kabına istediğin noktaya tıkla → koloni o noktada oluşur |
| **4. Koşulları Ayarla** | Sıcaklık, pH, NaCl ve oksijen kaydırıcılarını değiştir |
| **5. Zaman İlerlet** | Time kaydırıcısı ile büyüme fazlarını gözlemle |
| **6. Grafikleri İncele** | Sağ panelden büyüme eğrisi ve diğer analizlere eriş |
| **7. Kaydet / İndir** | Petri üstündeki `+` butonu ile kaydet, CSV olarak indir |

---

## 🖼️ Görsel Kaynaklar

`bacteria-images.js` dosyasındaki tüm görseller **Wikimedia Commons**'tan alınmıştır:

- Lisanslar: **Public Domain** (CDC, NIAID kaynakları) veya **CC BY-SA 2.0/3.0**
- Görseller yüklenemediğinde otomatik olarak **Wikipedia REST API**'ye fallback yapılır

---

## 🛠️ Kullanılan Teknolojiler

| Teknoloji | Kullanım Amacı |
|-----------|---------------|
| **Vanilla JS (ES6+)** | Tüm uygulama mantığı |
| **HTML5 Canvas** | Koloni renderı |
| **CSS Variables + Animations** | Tema ve animasyonlar |
| **Space Mono & DM Sans** | Google Fonts tipografisi |
| **Wikimedia Commons API** | Bakteri görselleri |
| **Wikipedia REST API** | Görsel fallback |

Harici bağımlılık, framework veya build tool **kullanılmamıştır.**

---

## 🤝 Katkı

Pull request ve issue'lar memnuniyetle karşılanır.

1. Fork'la
2. Feature branch oluştur: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerini commit et: `git commit -m 'feat: yeni özellik eklendi'`
4. Push et: `git push origin feature/yeni-ozellik`
5. Pull Request aç

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında dağıtılmaktadır.

Wikimedia görselleri kendi lisanslarına tabidir — her görsel için `bacteria-images.js` dosyasındaki `license` ve `credit` alanlarına bakınız.

---

<p align="center">
  <sub>Bilimle geçirilen her dakika değerlidir 🔬</sub>
</p>
