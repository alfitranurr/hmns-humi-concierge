# Progress: HUMI lanjutan (AI automation)

_Dibuat 27 Oktober 2026. Update tabel status setiap kali satu langkah selesai._

Legenda: ✅ selesai · 🔄 sedang dikerjakan · ⬜ belum · 👤 dikerjakan pemilik · 🤖 dikerjakan Claude · 🔒 butuh izin pemilik

Kondisi awal (27 Okt 2026, dari README):
- Sudah jalan: Discord relay bot, Gemini (`gemini-2.5-flash` + `gemini-embedding-001`), Knowledge Feeder (39 produk di Qdrant), Customer Agent dengan vector search, pemecah pesan panjang, Admin Console (`!status`, `!broadcast`, `!log`, `!stock`, `!harga`), tabel `products` (data awal).
- Belum: sinkronisasi `products` ↔ Google Sheets, stok real (masih dummy), dashboard. Folder `postgres/init/`, `docs/`, `prompts/` masih kosong. Semua masih jalan lokal di Docker Desktop.

Kondisi sekarang (27 Okt 2026, sore):
- Stack lokal dibangun ulang dari nol (volume lama hilang). 6 credential di n8n: Discord, Groq, Gemini, Google Sheets OAuth, Postgres, Qdrant.
- Customer Agent: Groq `openai/gpt-oss-120b` + cadangan `openai/gpt-oss-20b`, prompt Gen Z ringan dari `prompts/customer-agent.md`, sapaan chat pertama, eskalasi ke #admin-hmns, balasan maaf saat AI gagal. Relay: #tanya-humi + DM + mention, indikator mengetik, batas 6 pesan/menit.
- Admin Console: `!stock`, `!harga` (DB + sheet, memicu sinkron), `!broadcast`, `!status`, `!log` (hari ini/7 hari/total), `!help`.
- Knowledge Feeder: sinkron otomatis sheet → `products` + Qdrant tiap 5 menit dan setelah command admin, tanpa duplikat, lapor ke #admin-hmns.
- Kode, nama node, header sheet, kolom DB, dan README dalam bahasa Inggris; jawaban customer, pesan admin, prompt, dan file ini tetap Indonesia.
- Kapasitas gratis Groq ≈ 2 pertanyaan/menit dan ±55 pertanyaan/hari.

Langkah berikutnya:
1. 👤 Publish Customer Agent, tes `harga Farhampton berapa?` (harus Rp375.000) dan `!status` di #tanya-humi (harus diarahkan ke #admin-hmns).
2. 👤 Tutup tahap 0: hapus Gemini API key lama di AI Studio dan secret OAuth lama yang tidak dipakai di Google Cloud, bersihkan catatan lokal, pastikan Google Sheet berstatus Restricted.
3. Sambutan member baru: nyalakan Server Members Intent, `ENABLE_WELCOME=true`, recreate relay.
4. Lanjut tahap 1.6 (tes dari nol), tahap 4 (eval), tahap 5 (Oracle + widget).

## Tahap 0 — Keamanan

| # | Pekerjaan | Siapa | Status |
|---|---|---|---|
| 0.1 | Regenerate token bot Discord (Developer Portal → Bot → Reset Token) | 👤 | ✅ 27 Okt: token lama → 401, relay login dengan token baru, credential n8n `Discord Bot account` dibuat |
| 0.2 | Buat Gemini API key baru, hapus yang lama (Google AI Studio) | 👤 | 🔄 key baru dipakai credential n8n (embedding sinkron berhasil); key lama belum dihapus |
| 0.3 | Cabut / rotate OAuth client Google lama yang dipakai untuk Google Sheets (Google Cloud Console), buat ulang credential di n8n | 👤 | 🔄 secret baru di client `n8n HUMI`, credential n8n baca + tulis sheet terbukti; secret lama yang tidak dipakai belum di-disable/hapus |
| 0.4 | Isi nilai baru hanya di `.env` (sudah di-`.gitignore`), restart stack | 👤 + 🤖 | ✅ `.env` terisi (+ `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GROQ_API_KEY`, setelan channel relay), stack jalan, HUMI menjawab di Discord |
| 0.5 | Hapus semua nilai rahasia dari catatan lokal di luar repo; pastikan tidak ada secret di riwayat git (`git log -p` scan) | 👤 + 🤖 | 🔄 scan riwayat git ✅ (5 commit, 0 temuan) dan scan file kerja ✅ (0 temuan, termasuk pola key Groq); catatan lokal 👤 ⬜ |

## Tahap 1 — Bisa dibangun ulang dari nol

| # | Pekerjaan | Siapa | Status |
|---|---|---|---|
| 1.1 | Simpan skema SQL (`products` + tabel pendukung admin) ke `postgres/init/01_schema.sql`, ambil struktur asli dari database lewat `information_schema` | 🤖 | ✅ 27 Okt: database lama hilang, skema disusun dari README + query workflow (+ `products.updated_at`, `humi_chat_memory.created_at`), sudah diterapkan ke database |
| 1.2 | Seed data `products` (tanpa data sensitif) ke `postgres/init/02_seed_products.sql` | 🤖 | ✅ 27 Okt: 28 SKU parfum dari sheet, stok dummy realistis (`N pcs` / `Sold out`), sudah dimasukkan ke database |
| 1.3 | Simpan system prompt Customer Agent dan Admin ke `prompts/` (salin dari node n8n, tanpa credential) | 🤖 + 👤 | ✅ 27 Okt: `prompts/customer-agent.md` (Admin Console tidak memakai AI, jadi tidak ada prompt admin). Prompt di workflow dibangun dari file ini + blok konteks |
| 1.4 | Export ulang 3 workflow n8n terbaru ke `n8n/workflows/` (cek tidak ada credential/ID rahasia di JSON) | 👤 + 🤖 | ✅ JSON di repo = versi yang diimpor ke n8n (diubah di repo lalu `n8n import:workflow`); hanya referensi credential (id + nama), tanpa pinData; ID non-rahasia: guild, channel, Google Sheet |
| 1.5 | `README` bagian "Cara menjalankan" + `env.example` lengkap | 🤖 | ✅ 27 Okt: README ditulis ulang dalam bahasa Inggris (arsitektur terbaru, Getting started, credential, ID yang perlu diganti, limit gratis); `env.example` berisi semua variabel |
| 1.6 | Tes dari nol: `docker compose down -v` → `docker compose up -d` → import workflow → HUMI menjawab di Discord tanpa langkah manual lain | 👤 + 🤖 | ⬜ |

## Tahap 2 — Bug dan inkonsistensi

| # | Pekerjaan | Siapa | Status |
|---|---|---|---|
| 2.1 | Cek ulang `!stock` (catatan lama: "update stock masih gagal", README: teruji). Tes dari Discord, periksa output node sebelum node Discord, perbaiki bila perlu | 🤖 + 👤 | ✅ 27 Okt: penyebab = IF admin selalu false + skema tanpa `updated_at`; diperbaiki, format `N pcs`/`Sold out`, pesan SKU tidak ditemukan; teruji dari Discord |
| 2.2 | Kolom `created_at timestamptz default now()` di `humi_chat_memory`; `!log` jadi statistik harian/mingguan | 🤖 🔒 | ✅ kolom + index ada; `!log` hari ini / 7 hari / total, teruji dari Discord |
| 2.3 | Lengkapi `products` dengan seluruh 28 SKU parfum dari katalog resmi HMNS | 🤖 + 👤 | ✅ 27 Okt: sheet sudah 28 SKU, `products` 28 baris |

## Tahap 3 — Fitur lanjutan (urutan bisa diubah)

| # | Pekerjaan | Siapa | Status |
|---|---|---|---|
| 3a | Sinkronisasi `products` ↔ Google Sheets + re-index Qdrant otomatis setelah perubahan | 🤖 | ✅ 27 Okt: cek sheet tiap 5 menit + dipicu `!stock`/`!harga`, upsert `products`, vector baru dulu lalu hapus yang lebih tua (tanpa duplikat), berhenti tanpa memanggil Gemini kalau sheet tidak berubah; teruji |
| 3b | Eskalasi ke admin manusia: `!takeover`, `!release`, `!flagged`, deteksi pertanyaan status pesanan/komplain | 🤖 | 🔄 deteksi + notifikasi ke #admin-hmns teruji (27 Okt); `!takeover`/`!release`/`!flagged` belum |
| 3c | Slash command Discord (`/rekomendasi`, `/cekstok`) | 🤖 | ⬜ |
| 3d | Dashboard analitik sederhana (tren pertanyaan, eskalasi) | 🤖 | ⬜ |
| 3e | `!resetmemory` untuk admin | 🤖 | ⬜ |
| 3f | Pengalaman customer: channel #tanya-humi + DM + mention, persona Gen Z ringan, sapaan chat pertama, indikator mengetik, batas spam, sambutan member baru | 🤖 + 👤 | 🔄 semua dibangun dan teruji kecuali sapaan chat pertama (perlu akun baru) dan sambutan member (perlu Server Members Intent) |
| 3g | Model chat gratis yang cukup untuk demo: Groq `gpt-oss-120b` + cadangan `gpt-oss-20b`, diet token, penanganan limit | 🤖 | ✅ 27 Okt: ±7K token/pertanyaan, ±2 pertanyaan/menit, ±55/hari; customer dapat pesan "HUMI lagi rame" saat limit |

## Tahap 4 — Bukti kualitas (portfolio)

| # | Pekerjaan | Siapa | Status |
|---|---|---|---|
| 4.1 | Eval set ± 30 pertanyaan di `evals/questions.yaml`: rekomendasi (produk yang diharapkan), anti-halusinasi (BPOM/halal/medis/status pesanan → harus menolak), kejujuran stok | 🤖 | ⬜ |
| 4.2 | Script eval: kirim pertanyaan ke webhook n8n, nilai jawaban (aturan + cek produk), tulis skor ke `evals/results/` | 🤖 | ⬜ |
| 4.3 | Skor eval di README (mis. "28/30 lulus") | 🤖 | ⬜ |
| 4.4 | Panduan admin untuk non-teknis `docs/ADMIN_GUIDE.md` (command, contoh, apa yang dilakukan bila error) | 🤖 | ⬜ |
| 4.5 | Screenshot baru + video demo 1–2 menit | 👤 | ⬜ |

## Tahap 5 — Deploy & publikasi

| # | Pekerjaan | Siapa | Status |
|---|---|---|---|
| 5.1 | Pilih hosting 24 jam dan rencana biaya | 👤 + 🤖 | ✅ Oracle Cloud Always Free (VM ARM), Rp0/bulan (diputuskan 27 Okt) |
| 5.2 | Daftar Oracle Cloud (verifikasi kartu, **jangan** upgrade ke Pay As You Go), buat VM ARM Always Free | 👤 | ⬜ |
| 5.3 | Deploy stack (Docker Compose) ke VM, HTTPS lewat Cloudflare Tunnel, editor n8n tidak dibuka ke publik, backup volume Postgres/Qdrant | 🤖 🔒 | ⬜ |
| 5.4 | Widget chat publik (n8n Chat Trigger + `@n8n/chat`) di halaman HUMI portfolio, dengan batas pesan per pengunjung agar kuota Groq gratis aman | 🤖 + 👤 | ⬜ |
| 5.5 | Commit + push ke GitHub (repo publik: tanpa secret, tanpa data pribadi) | 🤖 🔒 | 🔄 27 Okt: push pertama pekerjaan hari ini (disetujui user); ulangi setelah deploy |
| 5.6 | Update halaman HUMI di portfolio: status selesai, case study, skor eval, video, link widget + undangan Discord | 👤 | ⬜ |

## Riwayat

| Tanggal | Catatan |
|---|---|
| 27 Okt 2026 | File progress + prompt dibuat |
| 27 Okt 2026 | Tahap 0 mulai. Scan riwayat git untuk pola token Discord, Google API key, OAuth client/secret/token, private key, dan isian `.env`: 0 temuan. Credential di n8n: `Discord Bot account` (relay pakai `DISCORD_BOT_TOKEN` di `.env` juga), `Google Gemini(PaLM) Api account`, `Google Sheets account` (OAuth2). `GEMINI_API_KEY` di `.env` tidak diteruskan ke container mana pun. JSON workflow berisi ID non-rahasia (instanceId, credential ID, Google Sheet documentId, channel ID): tinjau di 1.4. Repo di-opt-in ke codebase-memory MCP (aturan di `CLAUDE.md`). |
| 27 Okt 2026 | Docker Desktop dinyalakan: **tidak ada container/volume HUMI lama** di engine ini. `docker compose up -d` membuat volume baru (kosong) dan pull `n8n:latest` (2.44.7). n8n: 0 workflow, 0 credential; Postgres tanpa tabel aplikasi; Qdrant kosong. Token Discord lama masih valid (relay berhasil login) → rotasi 0.1 tetap perlu. Tahap 1 (skema SQL, import workflow) jadi prasyarat agar HUMI menjawab lagi. |
| 27 Okt 2026 | Target deploy diputuskan: Oracle Cloud Always Free + Cloudflare Tunnel + widget chat publik (tahap 5 disusun ulang). Temuan: skema `products` di README tidak punya `updated_at`, padahal query `!stock`/`!harga` mengisinya → kandidat penyebab bug 2.1. Draf `postgres/init/01_schema.sql` dibuat, menunggu persetujuan. |
| 27 Okt 2026 | 5 credential dibuat di n8n baru (Discord, Gemini, Google Sheets OAuth, Postgres, Qdrant). Token Discord yang sempat tertempel di chat sudah di-reset (lama → 401). 3 workflow diimpor via `n8n import:workflow` dengan ID workflow asli (Customer Agent memanggil Admin Console lewat ID) dan ID credential dipetakan ulang; semua masih nonaktif menunggu skema. |
| 27 Okt 2026 | Skema diterapkan. Knowledge Feeder jalan: Qdrant `hmns_parfum` 28 + `hmns_home` 11 vector (3072 dim). Stok dummy realistis dibuat (format seragam `N pcs` / `Sold out`) untuk sheet + `products`. Aturan prompt Customer Agent no. 5 yang meng-hardcode "semua produk Sold out" diganti: pakai nilai Stok dari tool, sebut menipis bila < 10, jangan janji restock. Workflow diimpor ulang. Catatan 2.1: `!stock` menulis angka polos, perlu diformat jadi `N pcs` / `Sold out`. |
| 27 Okt 2026 | Stok dummy ditempel ke sheet (39 baris, 0 selisih dibanding rencana). Qdrant dikosongkan (disetujui) lalu Knowledge Feeder dijalankan ulang: 28 + 11 vector, teks `Stok:` memakai nilai baru. |
| 27 Okt 2026 | Upgrade pengalaman customer (keputusan user: channel #tanya-humi + DM + mention, Gen Z ringan). Relay: filter channel, indikator mengetik, batas 6 pesan/menit per user, sambutan member baru (`ENABLE_WELCOME`, butuh Server Members Intent). Customer Agent: prompt baru dari `prompts/customer-agent.md`, deteksi chat pertama (node Cek Riwayat Chat), konteks nama/tempat/waktu, penanda `[[ESKALASI|...]]` → notifikasi ke #admin-hmns. Admin Console: `!help`, validasi `!stock`/`!harga`, `!log` harian/mingguan. Diimpor; menunggu Publish + tes Discord. |
| 27 Okt 2026 | Hasil tes Discord: routing, admin command, eskalasi, penolakan promo/prompt injection sesuai. Temuan: 1 jawaban tanpa memanggil tool → harga/stok tercampur (The Perfection). Perbaikan: aturan prompt wajib panggil tool ulang + salin angka dari blok produk yang sama + patuh budget, model `gemini-2.5-flash` eksplisit dengan temperature 0.3, topK 8/6. Nama produk kosong di balasan `!stock` diperbaiki. Otomasi penuh katalog (3a) dibangun; `!harga` sekarang juga update sheet. |
| 27 Okt 2026 | Otomasi katalog terbukti: edit sheet (Alpha 25→30 pcs) tersinkron di jadwal 12:00, `!stock` memicu sinkron, jadwal 12:05 tanpa perubahan berhenti tanpa memanggil Gemini. Refactor English (keputusan user): header sheet (Name, Type, Size, Fragrance_Family, Description, Price, Web_Stock, Web_URL, Marketplace_URL, Source), nama node/kode/field ketiga workflow, kolom `products` → `name`/`price`/`web_stock` (RENAME COLUMN, disetujui), tool `search_hmns_perfumes`/`search_home_of_humans`, penanda `[[ESCALATE|...]]`, komentar/log relay. Jawaban customer, pesan admin, isi prompt, PROGRESS tetap Indonesia; collection Qdrant tetap `hmns_parfum`/`hmns_home`. |
| 27 Okt 2026 | Duplikat vector (2 run manual dengan versi sama) diperbaiki: tiap run memberi tanda `synced_at`, pembersihan menghapus semua vector yang lebih tua (dry-run count dulu), hasil 28 + 11. Kata "menipis" dilarang di prompt atas permintaan user. **Kuota tier gratis `gemini-2.5-flash` cuma 20 request/hari** (habis saat tes, error 429, HUMI diam). Ditambah jalur cadangan: AI Agent gagal → balasan maaf ke customer + peringatan ke #admin-hmns maks. 1x/jam. Keputusan model/provider untuk demo publik masih terbuka. |
| 27 Okt 2026 | Model chat pindah ke Groq (pilihan user). Akun Groq tidak punya llama-3.3-70b; limit asli per model: 30 RPM, 1K RPD, **8K token/menit, 200K token/hari**. Konfigurasi: `openai/gpt-oss-120b` utama + `openai/gpt-oss-20b` cadangan (kuota terpisah), Gemini hanya untuk embedding. Diet token: prompt 8.966 → 5.405 karakter, topK 4/3, memori 4 pesan, link marketplace pindah dari dokumen produk ke prompt. Credential `Groq account` + `GROQ_API_KEY` di `.env`. |
| 27 Okt 2026 | Tes Groq: 1 pertanyaan ≈ 7K token (2 panggilan: ~2,5–4,1K masuk, 50–460 keluar). Kapasitas gratis ≈ 1 pertanyaan/menit/model (±2/menit dengan cadangan) dan ±55 pertanyaan/hari. 5 pesan dalam 75 detik → kedua model kena limit 8K TPM. Perbaikan: error "too many requests" dikenali sebagai limit (pesan "HUMI lagi rame"), AI Agent retry 3x jeda 5 detik, relay menjawab command `!` di luar #admin-hmns tanpa memanggil AI. |
| 27 Okt 2026 | Dokumentasi diperbarui: README ditulis ulang dalam bahasa Inggris (arsitektur, Getting started, limit gratis, pelajaran), tabel status dan "Kondisi sekarang" di file ini, `CLAUDE.md` (stack + prompt). Scan secret file kerja: 0 temuan. Commit + push atas permintaan user. |

---

## Prompt siap tempel

Tempel di sesi Claude Code yang dibuka dari folder `D:\AL FITRA\GITHUB\hmns-humi-concierge`. Setiap prompt meminta Claude membaca `CLAUDE.md` dan file ini, jadi tidak perlu menjelaskan ulang.

### Mulai / lanjut kapan saja

```text
Baca CLAUDE.md dan docs/PROGRESS.md. Ringkas status tiap tahap, cek git status dan apakah container Docker HUMI sedang jalan (docker compose ps), lalu lanjutkan langkah berikutnya yang belum selesai. Jangan tampilkan nilai secret apa pun.
```

### Tahap 0: keamanan

```text
Baca CLAUDE.md dan docs/PROGRESS.md, lalu pandu saya mengerjakan tahap 0 langkah demi langkah: regenerate token Discord, buat Gemini API key baru, rotate OAuth client Google untuk Google Sheets, dan perbarui credential di n8n. Saya yang menempel nilai baru ke .env; kamu hanya menyebut nama variabelnya dan tidak boleh membaca atau menampilkan nilainya. Setelah itu restart stack, cek HUMI masih menjawab di Discord, scan riwayat git untuk memastikan tidak ada secret yang pernah ter-commit, lalu update tabel status.
```

### Tahap 1: bisa dibangun ulang dari nol

```text
Kerjakan tahap 1 di docs/PROGRESS.md:
1. Ambil struktur tabel asli dari Postgres di container (information_schema, pg_dump --schema-only untuk tabel aplikasi saja, bukan tabel internal n8n) lalu simpan ke postgres/init/01_schema.sql, dan data awal products ke 02_seed_products.sql.
2. Bantu saya menyalin system prompt dari node AI Agent di n8n ke prompts/ (customer-agent.md, admin-console.md).
3. Setelah saya export ulang 3 workflow ke n8n/workflows/, periksa JSON-nya: tidak boleh ada credential, token, atau data pribadi.
4. Lengkapi env.example dan bagian "Cara menjalankan" di README.
5. Pandu tes dari nol (docker compose down -v lalu up) dan catat hasilnya. Minta izin saya sebelum menjalankan perintah yang menghapus volume. Update tabel status.
```

### Tahap 2: bug dan inkonsistensi

```text
Kerjakan tahap 2 di docs/PROGRESS.md:
1. Bantu debug !stock: saya kirim command dari Discord, kamu periksa eksekusi terakhir workflow Admin Console di n8n (lewat API n8n atau output yang saya tempel) dan temukan node yang gagal; perbaiki workflow-nya.
2. Siapkan perubahan humi_chat_memory (kolom created_at) dan query !log harian/mingguan; minta izin sebelum mengubah tabel.
3. Lengkapi products dengan 28 SKU dari katalog resmi (saya berikan sumbernya), lalu jalankan Knowledge Feeder ulang dan cek jumlah vector di Qdrant.
Update tabel status.
```

### Tahap 3: fitur lanjutan

```text
Kerjakan tahap 3 di docs/PROGRESS.md mulai dari item yang saya sebut (default 3a lalu 3b). Rancang dulu alurnya (node n8n, tabel, prompt) dan tunjukkan ke saya sebelum membuat perubahan. Setelah dibangun, tes lewat jalur asli dari Discord, simpan workflow dan SQL terbaru ke repo, update README dan tabel status.
```

### Tahap 4: bukti kualitas

```text
Kerjakan tahap 4 di docs/PROGRESS.md: buat evals/questions.yaml (± 30 pertanyaan: rekomendasi dengan produk yang diharapkan, pertanyaan yang wajib ditolak seperti BPOM/halal/efek medis/status pesanan, dan kejujuran stok), script eval yang memanggil webhook n8n dan menilai jawaban, jalankan, simpan hasil ke evals/results/, tulis skornya di README. Lalu buat docs/ADMIN_GUIDE.md dalam bahasa sederhana untuk admin non-teknis. Update tabel status.
```

### Tahap 5: deploy dan publikasi

```text
Kerjakan tahap 5 di docs/PROGRESS.md: pandu saya membuat VM ARM Oracle Cloud Always Free, lalu siapkan deploy Docker Compose ke VM itu dengan Cloudflare Tunnel (editor n8n tidak dibuka ke publik) dan backup volume Postgres/Qdrant. Setelah itu buat widget chat publik untuk halaman HUMI di portfolio dengan batas pesan per pengunjung (kuota Groq gratis ±55 pertanyaan/hari). Jangan deploy, commit, atau push sebelum saya setuju. Setelah live, bantu saya menyusun teks case study HUMI untuk portfolio (tanpa data rahasia). Update tabel status.
```
