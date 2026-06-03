# BacteriaLab

Web tabanlı mikrobiyoloji simülasyon platformu. Birden fazla patojen tarafından enfekte olan doku modellerinde antibiyotik tedavi optimizasyonu için geliştirilmiştir.

## Kurulum

Sunucu gerekmez. Proje klasörünü açın, `index.html` dosyasını bir tarayıcıda çalıştırın.

```
BacteriaLab/
├── index.html              Ana uygulama
├── intro.html              Giriş ekranı
├── canvas3d.html           3D simülasyon oynatıcı
├── app.js                  Uygulama mantığı
├── index-patch.js          Düzeltme ve ek özellikler
├── bacteria-store.js       Merkezi veri deposu
├── data_loader.js          Veri yükleme modülü
├── bacteria_dataset.json   30 bakteri türü veri seti
├── data/
│   ├── tissue_models.json          8 doku modeli
│   ├── antibiotic_pk.json          12 antibiyotik farmakokinetiği
│   ├── interaction_matrix.json     39 tür arası etkileşim
│   └── literature_benchmarks.json  Literatür doğrulama değerleri
└── src/
    ├── core/
    │   ├── simulation.js    Büyüme kinetiği ve matematiksel modeller
    │   ├── optimizer.js     Genetik algoritma optimizasyonu
    │   └── validation.js    Benchmark karşılaştırma
    ├── render/
    │   └── renderer.js      Canvas çizim motoru
    └── ui/
        ├── ui-panels.js     Panel yönetimi ve grafikler
        └── bacteria-images.js  Bakteri görselleri
```

## Kullanım

**1. Bakteri Seçimi**
Sol panelden bir bakteri türü seçin. Bilimsel bilgi ve experiment log paneli açılır. Petri kabına tıklayarak ekimleme yapın.

**2. Ortam Koşulları**
Sağ kontrol panelinden sıcaklık, pH, NaCl ve oksijen tipini ayarlayın.

**3. Doku Tipi**
8 seçenek: cilt yarası, yanık, kronik yara, akciğer, bağırsak, idrar yolu, kan, kemik.

**4. Antibiyotik**
İlaç seçin, konsantrasyon ve uygulama yolunu belirleyin. Uyumsuz kombinasyonlar uyarı verir.

**5. Görünüm Sekmeleri**
- Üst Görünüm: Petri kabı, gerçek zamanlı koloni büyümesi
- Yan Görünüm: Anatomik katmanlar, bakteri dağılımı, antibiyotik gradyanı
- Katmanlar: Z-stack penetrasyon analizi

**6. Analiz**
Grafik sekmesinden 10 farklı grafik türü; optimizasyon sekmesinden protokol önerisi; rapor sekmesinden R²/RMSE validasyonu.

## Veri Kaynakları

Tüm büyüme parametreleri, MIC değerleri, farmakokinetiğik veriler ve tür arası etkileşim katsayıları PMID referanslı literatür kaynaklarından derlenmiştir. Her veri girişinin kaynağı ilgili JSON dosyasında `references` alanında belirtilmiştir.

## Matematiksel Modeller

| Model | Kullanım |
|---|---|
| Lojistik büyüme | Tek tür büyüme kinetiği |
| Lotka-Volterra | Çok türlü rekabet/sinerji dinamikleri |
| Hill denklemi | Antibiyotik doz-yanıt (kill rate) |
| Fick difüzyon | Doku içi antibiyotik yayılımı |
| Poisson dağılımı | Mutasyon ve direnç gelişimi |
| FIC indeksi | Kombinasyon antibiyotik değerlendirmesi |

## Teknik Gereksinimler

Modern tarayıcı (Chrome, Firefox, Edge, Safari). İnternet bağlantısı yalnızca Google Fonts ve bakteri görselleri için gereklidir; tüm hesaplamalar çevrimdışı çalışır.
