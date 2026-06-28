# HUMI — AI Concierge untuk HMNS Perfume di Discord

> **HUMI** (Human Understanding & Matching Intelligence) adalah AI Conversational Agent berbasis Discord yang dirancang khusus untuk **HMNS Perfume**, membantu pelanggan menemukan parfum yang tepat berdasarkan vibe, aroma, occasion, dan kebutuhan personal — sekaligus membantu tim admin mengelola operasional customer service sehari-hari.

---

## 📋 Daftar Isi

- [HUMI — AI Concierge untuk HMNS Perfume di Discord](#humi--ai-concierge-untuk-hmns-perfume-di-discord)
  - [📋 Daftar Isi](#-daftar-isi)
  - [🌱 Latar Belakang](#-latar-belakang)
  - [🎯 Pengenalan Project](#-pengenalan-project)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🏗️ Arsitektur \& Workflow](#️-arsitektur--workflow)
    - [0. Discord Relay Bot (Node.js)](#0-discord-relay-bot-nodejs)
    - [1. Knowledge Feeder](#1-knowledge-feeder)
    - [2. Customer Agent](#2-customer-agent)
    - [3. Admin Console](#3-admin-console)
  - [🔧 Detail Implementasi: Admin Console](#-detail-implementasi-admin-console)
    - [Mengapa Sub-Workflow, Bukan Webhook Terpisah?](#mengapa-sub-workflow-bukan-webhook-terpisah)
    - [Konfigurasi Workflow Input Schema](#konfigurasi-workflow-input-schema)
    - [Catatan Teknis: Perubahan Struktur Data Setelah Melalui Execute Workflow](#catatan-teknis-perubahan-struktur-data-setelah-melalui-execute-workflow)
    - [Routing Channel untuk `!broadcast`](#routing-channel-untuk-broadcast)
    - [Skema Tabel Pendukung](#skema-tabel-pendukung)
  - [📊 Struktur Data Produk](#-struktur-data-produk)
  - [✨ Fitur Utama](#-fitur-utama)
  - [🚦 Status Pengembangan](#-status-pengembangan)
  - [🧩 Tantangan \& Pembelajaran](#-tantangan--pembelajaran)
  - [🗺️ Roadmap Selanjutnya](#️-roadmap-selanjutnya)
  - [⚠️ Disclaimer](#️-disclaimer)
  - [👨‍💻 Identitas Developer](#-identitas-developer)

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

| Layer                     | Teknologi                                                 | Alasan Pemilihan                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orkestrasi Workflow**   | [n8n](https://n8n.io/) (Community Edition, Docker)        | Gratis selamanya untuk self-hosted; node bawaan untuk AI Agent, Google Sheets, dan vector store sudah lengkap                                                                                                     |
| **Channel Komunikasi**    | Discord (Bot Application)                                 | Gratis, mendukung *rich embed*, role-based access untuk membedakan customer dan admin                                                                                                                             |
| **Relay Pesan Discord**   | Node.js custom (`discord.js` + `axios`)                   | Discord tidak menyediakan trigger native untuk pesan masuk di n8n; dibangun *relay bot* ringan yang meneruskan event `messageCreate` ke webhook n8n, menggunakan library resmi Discord agar stabil jangka panjang |
| **LLM (Otak HUMI)**       | Google Gemini API — `gemini-2.5-flash`                    | Free tier tanpa kartu kredit, context window besar, performa memadai untuk Bahasa Indonesia informal                                                                                                              |
| **Embedding**             | Google Gemini API — `gemini-embedding-001` (3072 dimensi) | Dipanggil langsung lewat API, tidak memerlukan container model lokal yang berat                                                                                                                                   |
| **Vector Database**       | [Qdrant](https://qdrant.tech/) (Docker)                   | Open-source, ringan, digunakan untuk *semantic search* produk berdasarkan vibe/aroma                                                                                                                              |
| **Database Memori & Log** | PostgreSQL (Docker)                                       | Menyimpan riwayat percakapan per pengguna dan data operasional (stok, harga)                                                                                                                                      |
| **Sumber Data Produk**    | Google Sheets                                             | *Single source of truth* katalog produk, mudah diperbarui oleh tim non-teknis                                                                                                                                     |
| **Containerization**      | Docker & Docker Compose                                   | Seluruh stack berjalan terisolasi, mudah direplikasi di lingkungan lain                                                                                                                                           |

> **Catatan biaya:** seluruh software di atas gratis dan open-source. Satu-satunya biaya riil di luar kendali software adalah hosting (VPS atau perangkat pribadi yang menyala 24 jam) — namun dalam tahap pengembangan ini, seluruh sistem dijalankan secara lokal melalui Docker Desktop di komputer pribadi.

---

## 🏗️ Arsitektur & Workflow

Sistem HUMI dibangun di atas **3 workflow n8n** yang saling terpisah namun terhubung, plus satu *relay service* tambahan untuk menjembatani Discord dengan n8n.

### 0. Discord Relay Bot (Node.js)

Karena n8n tidak menyediakan trigger native untuk mendengarkan pesan Discord secara real-time, dibangun service kecil terpisah:

```
Discord (pesan masuk — dari channel mana pun, customer atau admin)
      ↓
Bot Node.js (discord.js) — mendengarkan event messageCreate
      ↓ (HTTP POST, satu webhook yang sama untuk semua channel)
n8n Webhook Trigger — meneruskan ke Workflow 2 (Customer Agent)
```

Bot ini berjalan sebagai container Docker tersendiri, menggunakan library resmi `discord.js` untuk memastikan stabilitas jangka panjang. **Penting:** bot relay ini hanya mengenal **satu** endpoint webhook — pemisahan pesan admin vs customer terjadi **di dalam n8n**, bukan di level bot relay. Pendekatan ini dipilih agar bot relay tetap sederhana dan tidak perlu diubah setiap kali ada jenis channel baru di masa depan.

### 1. Knowledge Feeder

Bertugas memuat data katalog produk dari Google Sheets ke dalam Qdrant sebagai basis pengetahuan HUMI.

```
[Google Sheets: "Parfum (HMNS)"] ──┐
[Google Sheets: "Home of Humans"] ─┤
        ↓ (masing-masing jalur)
[Code Node: gabungkan kolom jadi 1 blok teks per produk]
        ↓
[Embeddings Google Gemini — gemini-embedding-001, 3072 dimensi]
        ↓
[Qdrant: Insert ke collection terpisah]
   ├─ hmns_parfum  (28 produk: EDP, EDT, Hair & Body Mist, Body Wash)
   └─ hmns_home    (11 produk: Reed Diffuser, Multipurpose Spray)
```

Data dipisah menjadi dua *collection* terpisah agar pencarian semantik lebih presisi — pertanyaan soal "parfum badan" tidak akan tercampur dengan hasil "pengharum ruangan".

### 2. Customer Agent

Workflow utama yang menangani **seluruh pesan masuk dari Discord**, baik dari customer maupun admin. Workflow ini bertindak sebagai *router* utama.

```
[Webhook: terima pesan dari Discord Relay]
        ↓
[IF: pengirim memiliki role "HMNS-Admin"?]
        │
        ├─ Ya  ──▶ [Execute Workflow: panggil Workflow 3 — Admin Console]
        │
        └─ Tidak ──▶ [AI Agent Node]
                         Model   : Google Gemini Chat Model (gemini-2.5-flash)
                         Memory  : PostgreSQL (per Discord user ID)
                         Tools   : 1) Cari Produk Parfum HMNS (Qdrant Vector Search)
                                   2) Cari Produk Home of Humans (Qdrant Vector Search)
                         Sistem Prompt: persona HUMI, gaya bahasa santai khas HMNS,
                                        larangan keras mengarang data produk/klaim sensitif,
                                        wajib memanggil tool sebelum menjawab soal produk,
                                        wajib memanggil tool dalam giliran yang sama
                                        (tidak boleh "menjanjikan cek" tanpa eksekusi),
                                        maksimal 4-5 produk per balasan
                              ↓
                         [Code Node: pemecah pesan panjang]
                            Memecah balasan >1900 karakter menjadi beberapa bagian,
                            mencegah error "Invalid Form Body" dari limit 2000 karakter Discord
                              ↓
                         [Discord: kirim balasan ke channel asal]
```

### 3. Admin Console

Dipicu sebagai **sub-workflow** dari Workflow 2 ketika pengirim pesan terdeteksi memiliki role admin. Pendekatan sub-workflow dipilih dibanding webhook terpisah agar bot relay Discord tetap sederhana (lihat bagian [Detail Implementasi](#-detail-implementasi-admin-console) untuk rinciannya).

```
[Execute Workflow Trigger: menerima data dari Workflow 2]
        ↓
[Code Node: Parse Command — pisahkan command (!stock, dst) dari argumennya]
        ↓
[Switch Node: routing berdasarkan command]
        │
        ├─ !stock <SKU> <jumlah>   → Update Postgres → balasan konfirmasi
        ├─ !harga <SKU> <nominal>  → Update Postgres → balasan konfirmasi
        ├─ !broadcast <teks>       → Discord: kirim ke #promo-customer
        │                             → Discord: konfirmasi balik ke #admin-hmns
        ├─ !status                 → Cek kesehatan sistem → balasan info
        ├─ !log                    → Query Postgres agregat → ringkasan statistik
        └─ (tidak dikenali)        → balasan daftar command yang tersedia
```

---

## 🔧 Detail Implementasi: Admin Console

Bagian ini mendokumentasikan secara teknis bagaimana Admin Console dihubungkan ke Customer Agent, termasuk konfigurasi yang perlu disetel manual di n8n (tidak otomatis terbawa saat import file workflow).

### Mengapa Sub-Workflow, Bukan Webhook Terpisah?

Dua pendekatan dipertimbangkan untuk memisahkan command admin dari percakapan customer biasa:

| Pendekatan                                                     | Kelebihan                                                                                                  | Kekurangan                                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Webhook terpisah** (bot relay kirim ke 2 endpoint berbeda)   | Pemisahan lebih "bersih" di level infrastruktur                                                            | Bot relay perlu logic tambahan untuk menentukan endpoint; setiap channel baru di masa depan butuh perubahan kode bot relay |
| **Sub-workflow** (1 webhook, routing di dalam n8n) ✅ *dipilih* | Bot relay tetap sederhana selamanya; pola ini mudah direplikasi untuk kebutuhan routing lain di masa depan | Perlu konfigurasi *Workflow Input Schema* secara manual di n8n                                                             |

### Konfigurasi Workflow Input Schema

Node **Execute Workflow Trigger** di Workflow 3 (sebelumnya berupa Webhook node, diubah menjadi trigger sub-workflow) perlu didefinisikan skema input-nya secara manual melalui UI n8n, karena skema ini tidak otomatis tersimpan dalam representasi JSON yang portable. Field yang didefinisikan:

| Field             | Tipe   | Sumber Data dari Workflow 2        |
| ----------------- | ------ | ---------------------------------- |
| `channel_id`      | String | `{{ $json.body.channel_id }}`      |
| `content`         | String | `{{ $json.body.content }}`         |
| `author_id`       | String | `{{ $json.body.author_id }}`       |
| `author_username` | String | `{{ $json.body.author_username }}` |
| `channel_name`    | String | `{{ $json.body.channel_name }}`    |

Mapping ini diisi pada node **Execute Workflow** di Workflow 2 (bukan di Workflow 3), tepat sebelum sub-workflow dipanggil. Field-field inilah yang membawa konteks pesan Discord asli (isi command, channel asal, identitas pengirim) dari Workflow 2 menuju Workflow 3.

### Catatan Teknis: Perubahan Struktur Data Setelah Melalui Execute Workflow

Salah satu detail teknis yang penting dicatat: struktur data yang diterima oleh node-node di dalam Workflow 3 **berbeda** dari struktur data webhook mentah.

- Pada Webhook node biasa, data pesan Discord dibungkus dalam objek `body` — misalnya `$json.body.content`.
- Namun setelah data dipetakan secara eksplisit melalui *Workflow Input* pada node Execute Workflow (lihat tabel mapping di atas), data yang diterima oleh trigger sub-workflow di Workflow 3 sudah berbentuk **flat**, tanpa pembungkus `body` — sehingga menjadi `$json.content` saja.

Akibatnya, kode pada node **Parse Command** yang awalnya ditulis dengan asumsi struktur webhook mentah:

```javascript
// Versi awal — sesuai untuk Webhook node langsung, TIDAK sesuai untuk sub-workflow
const body = $input.first().json.body;
```

perlu disesuaikan menjadi:

```javascript
// Versi final — sesuai dengan struktur data hasil mapping Execute Workflow
const body = $input.first().json;
```

Baris-baris kode berikutnya (pemisahan command dan argumen) tidak perlu diubah, karena seluruh referensi selanjutnya menggunakan variabel `body` yang sudah dikoreksi tersebut.

### Routing Channel untuk `!broadcast`

Command `!broadcast` memerlukan penanganan khusus karena, berbeda dengan command lain yang membalas ke channel asal (`#admin-hmns`), pesan broadcast harus diteruskan ke channel customer (`#promo-customer`). Implementasinya dipisah menjadi jalur Discord node tersendiri:

```
Switch Command (case: !broadcast)
        ↓
Susun Pesan Broadcast (format teks pengumuman)
        ↓
Discord - Kirim Broadcast (channel ID di-hardcode ke #promo-customer)
        ↓
Konfirmasi Broadcast ke Admin (balasan "✅ Broadcast berhasil dikirim" ke channel asal command)
```

Pendekatan ini memberi admin kepastian (*feedback loop*) bahwa broadcast telah terkirim, tanpa harus berpindah channel untuk memverifikasi.

### Skema Tabel Pendukung

Command `!stock` dan `!harga` memerlukan tabel `products` di PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS products (
    sku VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(255),
    harga INTEGER,
    stok_web VARCHAR(100)
);
```

> **Status saat ini:** tabel ini belum tersambung otomatis dengan data dari Google Sheets — sinkronisasi dua arah antara Google Sheets (sumber katalog) dan tabel `products` (sumber operasional admin) masih menjadi bagian dari roadmap pengembangan.

---

## 📊 Struktur Data Produk

Katalog produk disusun dalam Google Sheets dengan 3 tab:

| Sheet                    | Isi                                                      | Jumlah Produk                              |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------ |
| **Parfum (HMNS)**        | EDP, EDT, Extrait de Parfum, Hair & Body Mist, Body Wash | 28 produk (HMNS-PRF-001 s.d. HMNS-PRF-028) |
| **Home of Humans**       | Reed Diffuser, Multipurpose Spray                        | 11 produk                                  |
| **Catatan & Cara Pakai** | Dokumentasi sumber data, panduan pengisian kolom kosong  | —                                          |

**Kolom utama** mencakup: SKU, Nama, Tipe, Ukuran, Family Aroma, Mind/Heart/Soul Notes, Deskripsi, Sillage, Projection, Longevity, Harga, Stok, Link Web, dan Link Marketplace.

Data notes aroma (Mind/Heart/Soul Notes) diambil **langsung dari katalog resmi PDF HMNS dan Home of Humans** — bukan hasil tebakan AI — untuk memastikan deskripsi aroma yang disampaikan ke pelanggan akurat dan dapat dipertanggungjawabkan. Untuk produk yang tidak memiliki dokumentasi resmi, kolom notes **sengaja dikosongkan/ditandai** alih-alih diisi dengan asumsi.

---

## ✨ Fitur Utama

**Sisi Customer:**
- 🔍 **Rekomendasi berbasis vibe/aroma** — pelanggan menyebutkan mood atau kebutuhan, HUMI mencari produk paling relevan lewat *semantic search*, lengkap dengan harga dan link pembelian.
- 🆚 **Perbandingan produk** — membandingkan dua atau lebih produk dari segi family aroma, harga, dan kecocokan kebutuhan.
- 🚫 **Anti-halusinasi** — sistem prompt secara eksplisit melarang HUMI mengklaim hal sensitif (BPOM, halal, efek medis) atau menebak status pesanan tanpa data yang terverifikasi.
- 📦 **Kesadaran stok** — HUMI menyampaikan status stok terbaru secara jujur, termasuk ketika produk tidak tersedia.
- 🔁 **Manajemen pesan panjang** — balasan yang melebihi limit karakter Discord otomatis dipecah menjadi beberapa bagian tanpa memutus konteks kalimat.
- 🧠 **Memori percakapan** — riwayat chat per pengguna disimpan di PostgreSQL, memungkinkan percakapan lanjutan yang kontekstual.
- 🔗 **Tautan langsung yang dapat diklik** — seluruh link produk diformat lengkap dengan `https://` agar dapat langsung dibuka dari Discord.

**Sisi Admin:**
- 📢 **Broadcast satu arah ke channel customer** (`!broadcast`) — admin mengetik dari channel khusus, pesan otomatis tersalur ke channel publik, dengan konfirmasi pengiriman.
- 📦 **Update stok & harga** (`!stock`, `!harga`) — operasional dasar tanpa perlu membuka Google Sheets secara manual.
- 🩺 **Pemantauan kesehatan sistem** (`!status`) — cek cepat apakah n8n dan workflow berjalan normal.
- 📊 **Ringkasan log percakapan** (`!log`) — statistik dasar volume chat harian.
- 🔐 **Akses berbasis role** — seluruh command admin hanya dapat dijalankan oleh akun dengan role `HMNS-Admin`, dan channel `#admin-hmns` disetel privat agar tidak terlihat oleh customer.

---

## 🚦 Status Pengembangan

| Komponen                                       | Status                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Discord Bot & Relay Service                    | ✅ Selesai & berjalan stabil                                         |
| Integrasi Google Gemini API                    | ✅ Selesai                                                           |
| Knowledge Feeder (Google Sheets → Qdrant)      | ✅ Selesai, 39 produk terindeks                                      |
| Customer Agent dengan Vector Search            | ✅ Selesai & teruji                                                  |
| Penanganan pesan panjang (anti-error Discord)  | ✅ Selesai                                                           |
| Data katalog (notes aroma, harga, link produk) | ✅ Terverifikasi dari sumber resmi                                   |
| Admin Console — routing sub-workflow           | ✅ Selesai & teruji                                                  |
| Admin Console — `!status`                      | ✅ Teruji                                                            |
| Admin Console — `!broadcast`                   | ✅ Teruji (terkirim ke #promo-customer + konfirmasi ke admin)        |
| Admin Console — `!stock`, `!harga`             | 🔧 Workflow selesai, menunggu pengisian tabel `products` & pengujian |
| Admin Console — `!log`                         | 🔧 Workflow selesai, menunggu data chat untuk pengujian              |
| Sinkronisasi tabel `products` ↔ Google Sheets  | 📋 Direncanakan                                                      |
| Data stok real-time dari sistem inventory asli | ⚠️ Saat ini menggunakan data dummy untuk keperluan testing           |
| Dashboard analitik                             | 📋 Direncanakan                                                      |

---

## 🧩 Tantangan & Pembelajaran

Beberapa kendala teknis nyata yang ditemukan dan diselesaikan selama pengembangan, dicatat sebagai bagian dari proses pembelajaran:

- **Discord tidak memiliki trigger native di n8n** — diselesaikan dengan membangun *relay service* terpisah menggunakan `discord.js`, alih-alih mengandalkan community node pihak ketiga yang rawan terhenti dukungannya.
- **Perubahan format API key Gemini** — Google memperbarui format API key dari `AIza...` menjadi `AQ.Ab...`; perlu verifikasi ulang kompatibilitas dengan credential native n8n.
- **Mismatch dimensi vector embedding** — model embedding awal yang direncanakan (`text-embedding-004`) telah usang, digantikan `gemini-embedding-001` yang berdimensi 3072 (bukan 768), sehingga *collection* Qdrant perlu disesuaikan ulang.
- **AI Agent "menjanjikan" tindakan tanpa eksekusi** — pada kondisi tertentu, model sempat menulis kalimat seperti "coba HUMI cek dulu ya" tanpa benar-benar memanggil tool pencarian, menyebabkan balasan kosong pada giliran berikutnya. Diselesaikan dengan memperketat instruksi sistem agar pemanggilan tool terjadi dalam giliran yang sama dengan pernyataan tersebut.
- **Limit karakter Discord (2000 karakter)** — permintaan pelanggan untuk menampilkan seluruh katalog berisiko menghasilkan balasan yang melebihi limit API Discord. Diselesaikan dengan kombinasi pembatasan di sistem prompt (maksimal 4-5 produk per balasan) dan mekanisme pemecah pesan otomatis sebagai pengaman teknis.
- **Perubahan struktur data saat melewati Execute Workflow node** — data yang awalnya dibungkus dalam objek `body` (format webhook standar) berubah menjadi struktur *flat* setelah dipetakan secara eksplisit melalui *Workflow Input Schema* pada node Execute Workflow. Kode parsing yang awalnya berasumsi struktur webhook mentah (`$json.body.content`) perlu disesuaikan menjadi struktur flat (`$json.content`) — detail lengkap dijelaskan di bagian [Detail Implementasi: Admin Console](#-detail-implementasi-admin-console).
- **Pemilihan arsitektur routing admin vs customer** — dipertimbangkan antara membuat webhook terpisah untuk channel admin atau melakukan routing di dalam satu workflow. Pendekatan *sub-workflow* dipilih agar bot relay Discord tidak perlu diubah setiap kali ada kebutuhan routing baru di masa depan.
- **Validasi data katalog** — beberapa data produk yang awalnya diestimasi otomatis (notes aroma, link individual produk) digantikan dengan data resmi dari katalog PDF HMNS begitu tersedia, untuk menjaga akurasi informasi yang disampaikan ke pelanggan.

---

## 🗺️ Roadmap Selanjutnya

- [ ] Sinkronisasi dua arah antara tabel `products` (Postgres) dan Google Sheets, agar update lewat `!stock`/`!harga` tercermin di katalog utama
- [ ] Pengujian command `!stock`, `!harga`, dan `!log` secara menyeluruh dengan data nyata
- [ ] Integrasi data stok real-time dari sistem inventory HMNS (menggantikan data dummy)
- [ ] Fitur eskalasi otomatis ke admin manusia untuk pertanyaan kompleks (status pesanan, komplain)
- [ ] Command tambahan: `!takeover`, `!release`, `!resetmemory`, `!flagged` sesuai rancangan awal
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