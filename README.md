# HUMI — AI Concierge untuk HMNS Perfume di Discord

> **HUMI** (Human Understanding & Matching Intelligence) adalah AI Conversational Agent berbasis Discord yang dirancang khusus untuk **HMNS Perfume**, membantu pelanggan menemukan parfum yang tepat berdasarkan vibe, aroma, occasion, dan kebutuhan personal — sekaligus membantu tim admin mengelola operasional customer service sehari-hari.

---

## 📋 Daftar Isi

- [Latar Belakang](#-latar-belakang)
- [Pengenalan Project](#-pengenalan-project)
- [Tech Stack](#-tech-stack)
- [Arsitektur & Workflow](#-arsitektur--workflow)
- [Struktur Data Produk](#-struktur-data-produk)
- [Fitur Utama](#-fitur-utama)
- [Status Pengembangan](#-status-pengembangan)
- [Tantangan & Pembelajaran](#-tantangan--pembelajaran)
- [Roadmap Selanjutnya](#-roadmap-selanjutnya)
- [Disclaimer](#-disclaimer)
- [Identitas Developer](#-identitas-developer)

---

## 🌱 Latar Belakang

Membeli parfum secara online punya satu tantangan unik yang tidak dimiliki kategori produk lain: **indra penciuman tidak bisa diwakilkan secara digital**. Foto bisa dilihat, ulasan bisa dibaca, tapi aroma tetap menjadi pertaruhan — terutama bagi pembeli yang belum pernah mencoba produk tersebut sebelumnya.

Tantangan ini diperparah oleh keterbatasan operasional customer service (CS) konvensional:

- **Jam layanan terbatas** — CS manusia hanya tersedia di jam kerja, sementara pelanggan berbelanja kapan saja, termasuk malam hari dan akhir pekan.
- **Waktu respons lambat saat ramai** — ketika CS menangani banyak percakapan sekaligus, waktu balas bisa melonjak dari hitungan menit menjadi berjam-jam.
- **Keputusan pembelian sensitif waktu** — semakin lama pelanggan menunggu respons, semakin besar kemungkinan minat belinya menurun.

HUMI dibangun untuk menjawab tantangan-tantangan ini: hadir 24/7, memberikan rekomendasi yang relevan berdasarkan data produk asli, dan tetap jujur ketika tidak memiliki jawaban yang pasti.

---

## 🎯 Pengenalan Project

HUMI adalah AI Agent yang beroperasi di **Discord**, berperan sebagai *digital concierge* yang:

1. **Memahami kebutuhan pelanggan secara natural** — pelanggan tidak perlu memilih dari menu kaku, cukup mengetik seperti mengobrol dengan CS manusia ("lagi nyari yang fresh buat sehari-hari dong").
2. **Mencari jawaban dari basis data produk asli** — bukan menebak atau mengarang, melainkan menarik informasi dari katalog resmi HMNS yang sudah diverifikasi.
3. **Mengenali batasannya sendiri** — untuk hal-hal sensitif (klaim kesehatan, status pesanan, data pembayaran), HUMI akan jujur mengakui keterbatasannya dan meneruskan ke admin manusia, bukan menjawab asal.
4. **Membantu admin bekerja lebih efisien** — lewat command khusus untuk update stok, broadcast promo, dan monitoring tanpa harus membuka banyak tools terpisah.

Filosofi inti dari pengembangan project ini: **AI yang jujur lebih bernilai daripada AI yang terlihat pintar tapi mengarang.** Setiap keputusan teknis dalam project ini — dari pemilihan vector search, sistem prompt, hingga validasi data katalog — diarahkan untuk meminimalkan risiko *hallucination*, terutama untuk informasi yang menyangkut harga, stok, dan klaim produk.

---

## 🛠️ Tech Stack

Seluruh komponen dipilih dengan prinsip open-source, self-hosted, dan dapat dijalankan tanpa biaya lisensi, bahkan di spesifikasi server yang ringan.

| Layer | Teknologi | Alasan Pemilihan |
|---|---|---|
| **Orkestrasi Workflow** | [n8n](https://n8n.io/) (Community Edition, Docker) | Gratis selamanya untuk self-hosted; node bawaan untuk AI Agent, Google Sheets, dan vector store sudah lengkap |
| **Channel Komunikasi** | Discord (Bot Application) | Gratis, mendukung *rich embed*, role-based access untuk membedakan customer dan admin |
| **Relay Pesan Discord** | Node.js custom (`discord.js` + `axios`) | Discord tidak menyediakan trigger native untuk pesan masuk di n8n; dibangun *relay bot* ringan yang meneruskan event `messageCreate` ke webhook n8n, menggunakan library resmi Discord agar stabil jangka panjang |
| **LLM (Otak HUMI)** | Google Gemini API — `gemini-2.5-flash` | Free tier tanpa kartu kredit, context window besar, performa memadai untuk Bahasa Indonesia informal |
| **Embedding** | Google Gemini API — `gemini-embedding-001` (3072 dimensi) | Dipanggil langsung lewat API, tidak memerlukan container model lokal yang berat |
| **Vector Database** | [Qdrant](https://qdrant.tech/) (Docker) | Open-source, ringan, digunakan untuk *semantic search* produk berdasarkan vibe/aroma |
| **Database Memori & Log** | PostgreSQL (Docker) | Menyimpan riwayat percakapan per pengguna sebagai *conversational memory* |
| **Sumber Data Produk** | Google Sheets | *Single source of truth* katalog produk, mudah diperbarui oleh tim non-teknis |
| **Containerization** | Docker & Docker Compose | Seluruh stack berjalan terisolasi, mudah direplikasi di lingkungan lain |

> **Catatan biaya:** seluruh software di atas gratis dan open-source. Satu-satunya biaya riil di luar kendali software adalah hosting (VPS atau perangkat pribadi yang menyala 24 jam) — namun dalam tahap pengembangan ini, seluruh sistem dijalankan secara lokal melalui Docker Desktop di komputer pribadi.

---

## 🏗️ Arsitektur & Workflow

Sistem HUMI dibangun di atas **3 workflow n8n** yang saling terpisah namun terhubung, plus satu *relay service* tambahan untuk menjembatani Discord dengan n8n.

### 0. Discord Relay Bot (Node.js)

Karena n8n tidak menyediakan trigger native untuk mendengarkan pesan Discord secara real-time, dibangun service kecil terpisah:

```
Discord (pesan masuk)
      ↓
Bot Node.js (discord.js) — mendengarkan event messageCreate
      ↓ (HTTP POST)
n8n Webhook Trigger — meneruskan ke workflow utama
```

Bot ini berjalan sebagai container Docker tersendiri, menggunakan library resmi `discord.js` untuk memastikan stabilitas jangka panjang (dibandingkan mengandalkan community node pihak ketiga yang berisiko berhenti diperbarui).

### 1. Knowledge Feeder

Bertugas memuat data katalog produk dari Google Sheets ke dalam Qdrant sebagai basis pengetahuan HUMI.

```
[Google Sheets: "Parfum (HMNS)"] ──┐
[Google Sheets: "Home of Humans"] ─┤
        ↓ (masing-masing jalur)
[Code Node: gabungkan kolom jadi 1 blok teks per produk]
        ↓
[Embeddings Google Gemini]
        ↓
[Qdrant: Insert ke collection terpisah]
   ├─ hmns_parfum  (28 produk: EDP, EDT, Hair & Body Mist, Body Wash)
   └─ hmns_home    (11 produk: Reed Diffuser, Multipurpose Spray)
```

Data dipisah menjadi dua *collection* terpisah agar pencarian semantik lebih presisi — pertanyaan soal "parfum badan" tidak akan tercampur dengan hasil "pengharum ruangan".

### 2. Customer Agent

Workflow utama yang menangani percakapan dengan pelanggan di channel publik/DM.

```
[Webhook: terima pesan dari Discord Relay]
        ↓
[IF: pengirim adalah Admin?] ── Ya ──▶ (diarahkan ke Workflow 3)
        │ Bukan
        ↓
[AI Agent Node]
   Model   : Google Gemini Chat Model (gemini-2.5-flash)
   Memory  : PostgreSQL (per Discord user ID)
   Tools   : 1) Cari Produk Parfum HMNS (Qdrant Vector Search)
             2) Cari Produk Home of Humans (Qdrant Vector Search)
   Sistem Prompt: persona HUMI, gaya bahasa santai khas HMNS,
                  larangan keras mengarang data produk/klaim sensitif,
                  wajib memanggil tool sebelum menjawab soal produk
        ↓
[Code Node: pemecah pesan panjang]
   Memecah balasan >1900 karakter menjadi beberapa bagian,
   mencegah error "Invalid Form Body" dari limit 2000 karakter Discord
        ↓
[Discord: kirim balasan ke channel asal]
```

### 3. Admin Console *(dalam pengembangan)*

Direncanakan sebagai channel khusus (`#admin-hmns`, role-gated) untuk command operasional:

| Command | Fungsi |
|---|---|
| `!broadcast <teks>` | Kirim pengumuman ke channel customer |
| `!stock <SKU> <jumlah>` | Update stok produk |
| `!harga <SKU> <nominal>` | Update harga produk |
| `!takeover <user>` | Admin mengambil alih percakapan tertentu |
| `!release <user>` | Mengembalikan kontrol ke HUMI |
| `!status` | Cek kesehatan sistem (n8n, Qdrant, Postgres, kuota Gemini API) |

---

## 📊 Struktur Data Produk

Katalog produk disusun dalam Google Sheets dengan 3 tab:

| Sheet | Isi | Jumlah Produk |
|---|---|---|
| **Parfum (HMNS)** | EDP, EDT, Extrait de Parfum, Hair & Body Mist, Body Wash | 28 produk (HMNS-PRF-001 s.d. HMNS-PRF-028) |
| **Home of Humans** | Reed Diffuser, Multipurpose Spray | 11 produk |
| **Catatan & Cara Pakai** | Dokumentasi sumber data, panduan pengisian kolom kosong | — |

**Kolom utama** mencakup: SKU, Nama, Tipe, Ukuran, Family Aroma, Mind/Heart/Soul Notes, Deskripsi, Sillage, Projection, Longevity, Harga, Stok, Link Web, dan Link Marketplace.

Data notes aroma (Mind/Heart/Soul Notes) diambil **langsung dari katalog resmi PDF HMNS dan Home of Humans** — bukan hasil tebakan AI — untuk memastikan deskripsi aroma yang disampaikan ke pelanggan akurat dan dapat dipertanggungjawabkan. Untuk produk yang tidak memiliki dokumentasi resmi (misal beberapa SKU pelengkap seperti atomizer atau produk kolaborasi), kolom notes **sengaja dikosongkan/ditandai** alih-alih diisi dengan asumsi.

---

## ✨ Fitur Utama

- 🔍 **Rekomendasi berbasis vibe/aroma** — pelanggan menyebutkan mood atau kebutuhan, HUMI mencari produk paling relevan lewat *semantic search*, lengkap dengan harga dan link pembelian.
- 🆚 **Perbandingan produk** — membandingkan dua atau lebih produk dari segi family aroma, harga, dan kecocokan kebutuhan.
- 🚫 **Anti-halusinasi** — sistem prompt secara eksplisit melarang HUMI mengklaim hal sensitif (BPOM, halal, efek medis) atau menebak status pesanan tanpa data yang terverifikasi.
- 📦 **Kesadaran stok** — HUMI menyampaikan status stok terbaru secara jujur, termasuk ketika produk tidak tersedia.
- 🔁 **Manajemen pesan panjang** — balasan yang melebihi limit karakter Discord otomatis dipecah menjadi beberapa bagian tanpa memutus konteks kalimat.
- 🧠 **Memori percakapan** — riwayat chat per pengguna disimpan di PostgreSQL, memungkinkan percakapan lanjutan yang kontekstual.
- 🔗 **Tautan langsung yang dapat diklik** — seluruh link produk diformat lengkap dengan `https://` agar dapat langsung dibuka dari Discord.

---

## 🚦 Status Pengembangan

| Komponen | Status |
|---|---|
| Discord Bot & Relay Service | ✅ Selesai & berjalan stabil |
| Integrasi Google Gemini API | ✅ Selesai |
| Knowledge Feeder (Google Sheets → Qdrant) | ✅ Selesai, 39 produk terindeks |
| Customer Agent dengan Vector Search | ✅ Selesai & teruji |
| Penanganan pesan panjang (anti-error Discord) | ✅ Selesai |
| Data katalog (notes aroma, harga, link produk) | ✅ Terverifikasi dari sumber resmi |
| Data stok real-time | ⚠️ Saat ini menggunakan data dummy untuk keperluan testing; integrasi ke sistem inventory asli masih tahap perencanaan |
| Admin Console (`#admin-hmns`) | 🔧 Dalam pengembangan |
| Dashboard analitik | 📋 Direncanakan |

---

## 🧩 Tantangan & Pembelajaran

Beberapa kendala teknis nyata yang ditemukan dan diselesaikan selama pengembangan, dicatat sebagai bagian dari proses pembelajaran:

- **Discord tidak memiliki trigger native di n8n** — diselesaikan dengan membangun *relay service* terpisah menggunakan `discord.js`, alih-alih mengandalkan community node pihak ketiga yang rawan terhenti dukungannya.
- **Perubahan format API key Gemini** — Google memperbarui format API key dari `AIza...` menjadi `AQ.Ab...`; perlu verifikasi ulang kompatibilitas dengan credential native n8n.
- **Mismatch dimensi vector embedding** — model embedding awal yang direncanakan (`text-embedding-004`) telah usang, digantikan `gemini-embedding-001` yang berdimensi 3072 (bukan 768), sehingga *collection* Qdrant perlu disesuaikan ulang.
- **AI Agent "menjanjikan" tindakan tanpa eksekusi** — pada kondisi tertentu, model sempat menulis kalimat seperti "coba HUMI cek dulu ya" tanpa benar-benar memanggil tool pencarian, menyebabkan balasan kosong pada giliran berikutnya. Diselesaikan dengan memperketat instruksi sistem agar pemanggilan tool terjadi dalam giliran yang sama dengan pernyataan tersebut.
- **Limit karakter Discord (2000 karakter)** — permintaan pelanggan untuk menampilkan seluruh katalog berisiko menghasilkan balasan yang melebihi limit API Discord. Diselesaikan dengan kombinasi pembatasan di sistem prompt (maksimal 4-5 produk per balasan) dan mekanisme pemecah pesan otomatis sebagai pengaman teknis.
- **Validasi data katalog** — beberapa data produk yang awalnya diestimasi otomatis (notes aroma, link individual produk) digantikan dengan data resmi dari katalog PDF HMNS begitu tersedia, untuk menjaga akurasi informasi yang disampaikan ke pelanggan.

---

## 🗺️ Roadmap Selanjutnya

- [ ] Menyelesaikan Workflow 3 (Admin Console) dengan command operasional lengkap
- [ ] Integrasi data stok real-time dari sistem inventory HMNS (menggantikan data dummy)
- [ ] Fitur eskalasi otomatis ke admin manusia untuk pertanyaan kompleks (status pesanan, komplain)
- [ ] Dashboard analitik sederhana (tren pertanyaan, tingkat eskalasi, estimasi konversi)
- [ ] Slash command Discord (`/rekomendasi`, `/cekstok`) untuk UI interaktif yang lebih kaya
- [ ] Adaptasi multi-channel (WhatsApp/Telegram) dengan basis logic AI Agent yang sama

---

## ⚠️ Disclaimer

- Project ini dikembangkan atas **inisiatif pribadi** sebagai bagian dari eksplorasi teknis dan portofolio.
- Seluruh data produk yang digunakan bersumber dari **materi katalog resmi publik HMNS** dan halaman website resmi (madeforhmns.com).
- Status stok yang ditampilkan dalam tahap pengembangan ini menggunakan **data dummy** untuk keperluan pengujian sistem, dan **belum mencerminkan stok aktual** hingga terintegrasi dengan sistem inventory resmi.
- Project ini bukan merupakan produk resmi atau yang disponsori oleh HMNS Perfume.

---

## 👨‍💻 Identitas Developer

**Al Fitra Nur Ramadhani**
*Data & Automation Enthusiast*

- 🐙 GitHub: [github.com/alfitranurr](https://github.com/alfitranurr)
- 💼 LinkedIn: [linkedin.com/in/al-fitra-nur-ramadhani](https://www.linkedin.com/in/al-fitra-nur-ramadhani/)
- 📧 Email: [alfitranurr@gmail.com](mailto:alfitranurr@gmail.com)
- 🌐 Website Personal: [alfitranurr.vercel.app](https://alfitranurr.vercel.app/)

---

<p align="center">
  © 2026 Al Fitra Nur Ramadhani
</p>
