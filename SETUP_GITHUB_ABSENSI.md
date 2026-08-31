# XI TKJ 1 — GitHub + Absensi Lokasi + Google Sheets

Website tetap di-host di GitHub Pages.

## Backend Apps Script
Gunakan file `google-apps-script/Code.gs` yang sudah diperbarui. Kode ini:
- menyimpan absensi manual H/I/A ke Google Spreadsheet baru yang terhubung di `Code.gs`;
- menyimpan foto absensi ke Google Drive;
- menyimpan catatan foto + koordinat lokasi + link Google Maps ke Spreadsheet;
- memakai endpoint Apps Script yang sama.

Deploy Apps Script sebagai Web App, lalu pastikan URL `/exec` sama dengan `DRIVE_UPLOAD_URL` di `drive-config.js`.

## Lokasi foto muka
Saat tombol Kirim Absensi ditekan, browser meminta izin lokasi. Lokasi dikirim bersama foto. Siswa harus mengizinkan lokasi dan GPS/layanan lokasi perlu aktif agar absensi foto selesai.

Catatan: browser memberi lokasi perangkat saat itu, dengan nilai akurasi yang ikut disimpan. Ini bukan jaminan anti-pemalsuan.


## Barcode Absensi Siswa
Versi ini menambahkan sistem Barcode/QR siswa:
- Setiap akun siswa memiliki gambar barcode di folder `BARCODE SISWA/`.
- Isi barcode adalah **NISN siswa**.
- Setelah login sebagai siswa, menu **Navigasi Kelas → Barcode Saya** muncul tepat di bawah **Absen Foto Muka**.
- Scanner hanya tersedia di **Admin Control Panel → Absensi → Scan Barcode**.
- Setelah barcode valid discan, status siswa otomatis menjadi **H (Hadir)** untuk tanggal hari itu.
- Status H juga dikirim ke sheet `ABSENSI` melalui endpoint Apps Script yang sama.
- Saat siswa membuka **Absen Foto Muka** setelah status H terdeteksi, sistem menampilkan pesan bahwa absensi hari ini sudah selesai sehingga siswa tidak perlu absen foto lagi.

### Cara menggunakan
1. Login sebagai **Admin**.
2. Buka `Control Panel → Absensi`.
3. Tekan `Scan Barcode`.
4. Izinkan akses kamera dan arahkan kamera ke barcode siswa.
5. Setelah berhasil, siswa langsung tercatat **Hadir (H)**.
6. Siswa dapat membuka akun → menu Navigasi Kelas → **Barcode Saya** untuk menampilkan barcode pribadinya.

Catatan: scanner menggunakan `BarcodeDetector` bawaan browser. Chrome/Edge versi terbaru di Android/desktop direkomendasikan. Jika browser tidak mendukung, tersedia opsi **Pilih gambar barcode** di scanner.
