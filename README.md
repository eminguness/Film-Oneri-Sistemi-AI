# Film Öneri Sistemi

Yapay zeka destekli film öneri web uygulaması. Beğendiğiniz bir filmi yazın, size benzeyen filmleri saniyeler içinde keşfedin!

## 🎯 Özellikler

- **Akıllı Öneri Algoritması**: Cosine similarity tabanlı film benzerliği
- **Modern Arayüz**: Responsive, şık ve kullanıcı dostu tasarım
- **Film Posterleri**: TMDB API ile otomatik poster çekme
- **Film Detayları**: Tür, yıl, süre, IMDb puanı ve özet bilgileri
- **Otomatik Tamamlama**: Hızlı film arama önerileri
- **Modal Detay**: Filmleri tıklayarak detaylı bilgi görme

## 🛠️ Teknolojiler

### Backend
- **FastAPI**: Modern, hızlı Python web framework
- **scikit-learn**: Makine öğrenmesi ve similarity hesaplama
- **pandas**: Veri işleme ve analiz
- **TMDB API**: Film posterleri ve detayları için

### Frontend
- **HTML5/CSS3**: Modern ve responsive tasarım
- **Vanilla JavaScript**: Dinamik arayüz ve API entegrasyonu
- **Font Awesome**: İkonlar
- **Glassmorphism**: Modern görsel efektler

## 📁 Proje Yapısı

```
film_recommend/
├── main.py              # FastAPI backend ve API endpoint'leri
├── requirements.txt     # Python bağımlılıkları
├── movie_dict.pkl       # Film veritabanı (pickle formatında)
├── similarity.pkl       # Film benzerlik matrisi
├── static/              # Frontend dosyaları
│   ├── index.html       # Ana sayfa
│   ├── css/
│   │   └── style.css    # Stil dosyaları
│   └── js/
│       └── app.js       # JavaScript uygulama mantığı
└── README.md           # Bu dosya
```

## 🚀 Kurulum ve Çalıştırma

### ⚠️ ÖNEMLİ: Projeyi Çalıştırmadan Önce

Bu projede model dosyaları (.pkl) GitHub'a yüklenmemiştir. **Projenin çalışması için öncelikle model_training.ipynb notebook'unu çalıştırarak kendi .pkl dosyalarınızı oluşturmanız gerekmektedir.**

#### Model Dosyalarını Oluşturma Adımları:
1. **Gerekli verileri indirin:**
   - [tmdb_5000_movies.csv](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata)
   - [tmdb_5000_credits.csv](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata)
   
2. **Notebook'u çalıştırın:**
   ```bash
   jupyter notebook model_training.ipynb
   ```
   
3. **Tüm hücreleri sırayla çalıştırın**
   - Bu işlem `movie_dict.pkl` ve `similarity.pkl` dosyalarını oluşturacaktır
   - İşlem 5-10 dakika sürebilir (bilgisayar hızınıza bağlı)

### 1. Gerekli Kütüphaneleri Yükleyin
```bash
pip install -r requirements.txt
```

### 2. Uygulamayı Başlatın
```bash
uvicorn main:app --reload
```

### 3. Tarayıcıda Açın
Uygulama `http://localhost:8000` adresinde çalışacaktır.

## 📊 API Endpoint'leri

### POST `/recommend`
Film önerileri almak için kullanılır.

**Request:**
```json
{
  "movie": "Inception"
}
```

**Response:**
```json
{
  "film": "Inception",
  "film_poster": "https://image.tmdb.org/t/p/w500/...",
  "oneriler": [
    {
      "title": "Interstellar",
      "poster": "https://image.tmdb.org/t/p/w500/...",
      "year": "2014",
      "genres": ["Bilim Kurgu", "Dram"],
      "overview": "Film özeti...",
      "runtime": "169"
    }
  ]
}
```

## 🎨 Arayüz Özellikleri

- **Açılış Ekranı**: Modern hero bölümü, ortalanmış logo ve arama kutusu
- **Arama Deneyimi**: Otomatik tamamlama ve poster önizlemeleri
- **Sonuç Sayfası**: 5 adet öneri film kartı, hover efektleri
- **Film Detay Modalı**: Geniş poster ve detaylı bilgiler
- **Responsive Tasarım**: Mobil ve tablet uyumlu

## 🔧 Yapılandırma

### TMDB API Anahtarı
Film posterlerini çekmek için `.env` dosyasına API anahtarınızı ekleyin:
```
TMDB_API_KEY=your_api_key_here
```

### CORS Ayarları
`main.py` içinde CORS ayarları mevcuttur. Geliştirme için tüm origin'lere izin verilmiştir.

## 📈 Veri Seti

- **movie_dict.pkl**: ~4800 film içeren veritabanı
- **similarity.pkl**: Cosine similarity matrisi
- **TMDB Entegrasyonu**: Poster ve detay bilgileri için

## 🎯 Kullanım

1. **Film Seçin**: Arama kutusuna beğendiğiniz bir film yazın
2. **Öneri Alın**: "Keşfe Çık" butonuna tıklayın
3. **Keşfedin**: Size benzeyen 5 film önerisi sunulur
4. **Detay Görün**: İstediğiniz filme tıklayarak detayları görüntüleyin

## 🐛 Hata Ayıklama

- **Poster Görüntülenmiyor**: TMDB API anahtarını kontrol edin
- **Film Bulunamadı**: Film adının doğru yazıldığından emin olun
- **Yavaş Yükleme**: İnternet bağlantısını ve API limitlerini kontrol edin

## 🤝 Katkı

İstekler ve hata bildirimleri için GitHub Issues kullanabilirsiniz.

## 📄 Lisans

Bu proje MIT Lisansı altında dağıtılmaktadır.

---

**Film Öneri Sistemi** - Sinema evreninde kaybolmayın! 🎬✨
