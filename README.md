# SA:MP World

<p align="center">
  <img src="https://raw.githubusercontent.com/derrick0930/SAMP-World/refs/heads/main/assets/logo.png" alt="SA:MP World Logo" width="256">
</p>

Launcher desktop untuk server **SA-MP** yang dibangun menggunakan **ElectronJS** dengan **HTML, CSS, dan Vanilla JavaScript** (tanpa framework frontend seperti React/Vue/Angular, dan tanpa Bootstrap/Tailwind).

Launcher mendukung **multi-server**, di mana pengguna dapat menambah, menghapus, dan memilih server SA-MP sendiri dari daftar. Informasi setiap server didapatkan langsung dari server tujuan menggunakan **UDP socket (`dgram`)** mengikuti SA-MP Query Mechanism, tanpa bergantung pada API endpoint eksternal mana pun.

Untuk daftar lengkap fitur pada setiap versi, silakan lihat halaman [Releases](https://github.com/derrick0930/SAMP-World/releases).

---

## Struktur Project

```
SAMP-World/
│
├── package.json
├── main.js
├── preload.js
├── installer.nsh
├── bin/
│   ├── bin/version/
│   ├── bin/shared/
│   ├── bin/client/
├── renderer/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── assets/
│   ├── icon.ico
│   └── logo.png
└── README.md
```

Saat dijalankan, launcher akan membuat beberapa file konfigurasi/log secara otomatis di folder `userData` Electron (di Windows biasanya `%APPDATA%\SA:MP World\`):

- `config.json` — menyimpan pengaturan launcher.
- `servers.json` — menyimpan daftar server SA-MP yang ditambahkan pengguna.
- `SAMP-World.txt` — file log aplikasi.

---

## Requirement

- Node.js versi 18 LTS atau lebih baru
- npm (sudah termasuk dalam instalasi Node.js)
- Sistem operasi untuk build target Windows: **Debian Linux** (menggunakan Wine untuk proses packaging NSIS)
- Aplikasi Discord Desktop berjalan di background (untuk fitur Discord Rich Presence)
- Koneksi jaringan yang mengizinkan komunikasi **UDP** keluar (digunakan untuk query informasi server) dan **HTTPS** keluar (digunakan untuk pengecekan update)
- Beberapa fitur (penulisan nickname ke Windows Registry, deteksi proses `gta_sa.exe` untuk Discord Rich Presence, DLL injection) hanya aktif di platform **Windows**; di platform lain fitur tersebut otomatis dilewati tanpa error

---

## Install Dependency

Masuk ke folder project, lalu jalankan:

```
npm install
```

Perintah ini akan mengunduh `electron`, `electron-builder`, dan `@xhayper/discord-rpc` sesuai yang sudah didefinisikan di `package.json`. Query informasi server memakai modul bawaan Node.js `dgram`, sehingga tidak ada dependency tambahan yang diperlukan untuk fitur ini.

---

## Menjalankan Launcher (Mode Development)

```
npm start
```

Perintah ini akan membuka window Electron berukuran 900x550 dengan tampilan launcher.

---

## Build ke Windows (SA:MP-World-Setup.exe dan SA:MP-World-Portable.exe)

```
npm run dist
```

Perintah ini akan menghasilkan installer NSIS (`SA:MP-World-Setup.exe`) dan versi portable (`SA:MP-World-Portable.exe`) sekaligus dalam satu kali build, karena target `win` pada `electron-builder` sudah dikonfigurasi dengan dua target: `nsis` dan `portable`.

Hasil build akan berada di folder:

```
dist/
```

Isi folder `dist/` setelah build selesai antara lain:

```
dist/SA:MP-World-Setup.exe
dist/SA:MP-World-Portable.exe
```

---

## Panduan Build di Debian Linux (Lengkap)

Berikut adalah langkah-langkah lengkap untuk melakukan build aplikasi Windows x64 di sistem **Debian Linux** menggunakan **Electron Builder**.

### 1. Update Sistem

```
sudo apt update
sudo apt upgrade -y
```

### 2. Install Node.js dan npm

Debian bawaan biasanya memiliki versi Node.js yang lama, disarankan menggunakan NodeSource repository:

```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Cek versi yang terinstall:

```
node -v
npm -v
```

### 3. Install Build Essential (diperlukan oleh beberapa native dependency)

```
sudo apt install -y build-essential
```

### 4. Install Wine (diperlukan Electron Builder untuk build target Windows dari Linux)

Aktifkan arsitektur 32-bit terlebih dahulu:

```
sudo dpkg --add-architecture i386
sudo apt update
```

Install Wine:

```
sudo apt install -y wine wine32 wine64
```

Cek instalasi Wine:

```
wine --version
```

### 5. Install Dependency Tambahan (mono dan libgnutls, opsional namun direkomendasikan agar proses NSIS berjalan lancar)

```
sudo apt install -y mono-complete
sudo apt install -y libgnutls30
```

### 6. Masuk ke Folder Project

```
cd SAMP-World
```

### 7. Install Dependency Project (Electron dan Electron Builder)

```
npm install
```

### 8. Jalankan Build untuk Windows x64

```
npm run dist
```

Electron Builder akan otomatis:

- Membundle aplikasi menggunakan Electron untuk platform Windows x64.
- Membuat installer NSIS (`SA:MP-World-Setup.exe`).
- Membuat versi portable (`SA:MP-World-Portable.exe`).
- Menggunakan Wine untuk proses signing/packaging resource `.exe` di lingkungan Linux.

### 9. Ambil Hasil Build

Setelah proses build selesai, file hasil build dapat ditemukan di:

```
dist/SA:MP-World-Setup.exe
dist/SA:MP-World-Portable.exe
```

File-file tersebut siap didistribusikan dan dijalankan di Windows x64.

---

## Catatan Penting

- File `samp.exe`/`samp.dll` **tidak disertakan** dalam project ini karena merupakan file resmi dari game client GTA: San Andreas Multiplayer (SA-MP) dan bukan bagian dari source code launcher.
- Informasi server didapat langsung lewat query UDP (`dgram`) ke masing-masing server, **bukan** lewat API endpoint eksternal.
- Semua komunikasi antara proses main dan renderer menggunakan IPC (`ipcMain.handle` / `ipcRenderer.invoke`) yang dijembatani secara aman lewat `preload.js` menggunakan `contextBridge`.
- Window launcher berukuran tetap **900x550**, tidak resizable, dan tidak bisa fullscreen.
- Fitur Discord Rich Presence, penulisan nickname ke registry, pemantauan proses game, dan pengecekan update bersifat opsional/non-blocking dan tidak akan menghentikan jalannya launcher jika tidak tersedia (misalnya di platform non-Windows, Discord tidak aktif, atau tidak ada koneksi internet).

---

## Teknologi yang Digunakan

- [Electron](https://www.electronjs.org/) — framework untuk membangun aplikasi desktop lintas platform menggunakan JavaScript.
- [Electron Builder](https://www.electron.build/) — tool untuk packaging dan build installer aplikasi Electron.
- [@xhayper/discord-rpc](https://www.npmjs.com/package/@xhayper/discord-rpc) — library untuk integrasi Discord Rich Presence.
- `dgram` (modul bawaan Node.js) — untuk query informasi server SA-MP lewat UDP.
- HTML5, CSS3, dan Vanilla JavaScript (ES6+) — tanpa framework frontend tambahan.

---

## Lisensi

MIT License — bebas digunakan dan dimodifikasi.
