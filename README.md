# ShieldSupport AI: AI Agent Customer Support dengan PII Guardrail

Proyek ini adalah implementasi **AI Agent Customer Support** yang dilengkapi dengan **PII (Personally Identifiable Information) Guardrail** menggunakan model **Gemini 2.5 Flash** (melalui **Google Gen AI SDK / ADK**) dan **Named Entity Recognition (NER) Service** kustom berbasis Python Flask.

Sistem ini dirancang untuk menyensor data pribadi sensitif (NIK, Email, Nomor Telepon, Nama Orang, dan Alamat) secara real-time sebelum dikirimkan ke Large Language Model (Gemini), guna mencegah kebocoran data pribadi (PII).

* **Repository GitHub:** [https://github.com/Alfi-99/nerguardianAI.git](https://github.com/Alfi-99/nerguardianAI.git)

---

## 1. Arsitektur Sistem

Sistem ini terdiri dari dua layanan utama yang berjalan secara bersamaan:

```
┌─────────────────────────────────────────────────────────┐
│                     USER (Browser)                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP
┌─────────────────────▼───────────────────────────────────┐
│           Next.js App  (Port 3000)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  UI Chat Interface  (pages/index.jsx)            │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼───────────────────────────┐   │
│  │  API Route: /api/chat  (pages/api/chat.js)       │   │
│  │                                                  │   │
│  │  1. Terima input dari user                       │   │
│  │  2. Jalankan Regex Guardrail (redaksi NIK,       │   │
│  │     email, nomor telepon)                        │   │
│  │  3. HTTP call ke NER Service → dapatkan          │   │
│  │     entitas NAMA & ALAMAT                        │   │
│  │  4. Redaksi NAMA & ALAMAT di Node.js             │   │
│  │  5. Kirim teks aman via Google Gen AI SDK (ADK)  │   │
│  │  6. Return response + debug log ke user          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (localhost:5000/predict)
┌─────────────────────▼───────────────────────────────────┐
│           NER Service  (Python Flask, Port 5000)        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  POST /predict                                   │   │
│  │  - Terima { text }                               │   │
│  │  - Analisis Entitas (PERSON & ADDRESS)           │   │
│  │  - Return { entities: [{text, label}] }          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Penjelasan Guardrail PII

Sistem perlindungan PII berjalan dalam **dua tahap (Step-by-step Guardrail)** sebelum prompt masuk ke LLM:

### A. Stage 1: Regex-Based Guardrail (Node.js)
Menyaring data terstruktur dengan pola pasti:
* **NIK (Nomor Induk Kependudukan)**: Mendeteksi 16 digit angka berurutan (`\b[0-9]{16}\b`). Direduksi menjadi `[REDACT_NIK]`.
* **Email**: Mendeteksi pola email standar menggunakan regex penilai domain. Direduksi menjadi `[REDACT_EMAIL]`.
* **Nomor Telepon Indonesia**: Menggunakan regex dinamis `/(?:\+62|62|0)[\s-]*8[0-9]{1,2}(?:[\s-]*[0-9]){5,11}\b/g` yang mendeteksi nomor pendek (seperti `08212121` untuk testing) maupun nomor standar (10-13 digit), lengkap dengan penanganan spasi atau tanda hubung. Direduksi menjadi `[REDACT_PHONE]`.

### B. Stage 2: NER-Based Guardrail (Python Service)
Menyaring data tidak terstruktur (Nama & Alamat) menggunakan model Named Entity Recognition kustom:
* **Entitas Nama (`PERSON`)**: Mendeteksi nama berdasarkan kamus kosakata hasil training ditambah aturan deteksi berbasis pemicu perkenalan (*introductions triggers*) seperti kata `"saya adalah"`, `"nama saya"`, `"panggil saya"`, `"bapak/ibu"`, dsb. Direduksi menjadi `[REDACT_NAMA]`.
* **Entitas Alamat (`ADDRESS`)**: Mendeteksi alamat menggunakan kata kunci awal (*Jalan*, *Jl.*, *Gang*, *Komplek*, *Perumahan*) serta deteksi lokasi kapital setelah kata pemicu alamat (*"alamat saya di"*, *"tinggal di"*, *"berdomisili di"*). Direduksi menjadi `[REDACT_ADDRESS]`.
* **Resolusi Duplikasi**: Jika sebuah kata terdeteksi sebagai nama sekaligus alamat, sistem secara otomatis mengutamakan label `ADDRESS` demi akurasi.

---

## 3. Contoh Input - Output

### Kasus Uji Gabungan (NIK, Nama, Alamat, Email, Telepon)

* **Input User:**
  > *"halo saya adalah Budi Hidayat, alamat saya di Jalan Raya LPMP Yogyakarta, dengan Email trsvalfi@gmail.com dan nomor 0812192723223"*

* **Hasil Sensor Regex (Step 1):**
  > *"halo saya adalah Budi Hidayat, alamat saya di Jalan Raya LPMP Yogyakarta, dengan Email `[REDACT_EMAIL]` dan nomor `[REDACT_PHONE]`"*

* **Hasil Sensor NER (Step 2 - Prompt Akhir ke Gemini):**
  > *"halo saya adalah `[REDACT_NAMA]`, alamat saya di `[REDACT_ADDRESS]`, dengan Email `[REDACT_EMAIL]` dan nomor `[REDACT_PHONE]`"*

* **Respons Asli Gemini 2.5 Flash (Bebas Kebocoran PII):**
  > *"Halo `[REDACT_NAMA]`! Selamat datang. Terima kasih atas informasinya. Saya siap membantu Anda. Ada yang bisa saya bantu hari ini? ..."*
* **Gambar Screenshot: **
  <img width="1479" height="796" alt="WhatsApp Image 2026-05-26 at 08 05 02" src="https://github.com/user-attachments/assets/69931c37-8279-4eb3-8c8a-c9465f9cc9a0" />

---

## 4. Cara Menjalankan Project

### Prasyarat
* Node.js versi 18 atau lebih baru.
* Python versi 3.10 atau lebih baru (kompatibel dengan Python 3.14.3).

### Langkah 1: Setup & Menjalankan Python NER Service (Terminal 1)
1. Buka folder `ner-service`:
   ```bash
   cd ner-service
   ```
2. Buat dan aktifkan Virtual Environment:
   ```bash
   python -m venv venv
   # Di Windows:
   venv\Scripts\activate
   # Di macOS/Linux:
   source venv/bin/activate
   ```
3. Instal dependensi:
   ```bash
   pip install -r requirements.txt
   ```
4. Jalankan script pelatihan model NER (sekali saja saat setup pertama):
   ```bash
   python train_ner.py
   ```
5. Jalankan Flask Server:
   ```bash
   python app.py
   ```
   *Layanan ini akan aktif di [http://localhost:5000](http://localhost:5000).*

### Langkah 2: Setup & Menjalankan Next.js App (Terminal 2)
1. Buka folder `nextjs-app`:
   ```bash
   cd nextjs-app
   ```
2. Salin file `.env.local` dan masukkan kunci API Gemini Anda:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   NER_SERVICE_URL=http://localhost:5000
   ```
3. Instal dependensi npm:
   ```bash
   npm install
   ```
4. Jalankan Next.js Development Server:
   ```bash
   npm run dev
   ```
    *Frontend akan aktif di [http://localhost:3000](http://localhost:3000).*
