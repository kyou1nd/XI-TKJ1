# XI TKJ 1 — GitHub + Absensi Lokasi + Google Sheets

Website tetap di-host di GitHub Pages.

## Backend Apps Script
Gunakan file `google-apps-script/Code.gs` yang sudah diperbarui. Kode ini:
- menyimpan absensi manual H/I/A ke Google Spreadsheet ID yang sudah diatur;
- menyimpan foto absensi ke Google Drive;
- menyimpan catatan foto + koordinat lokasi + link Google Maps ke Spreadsheet;
- memakai endpoint Apps Script yang sama.

Deploy Apps Script sebagai Web App, lalu pastikan URL `/exec` sama dengan `DRIVE_UPLOAD_URL` di `drive-config.js`.

## Lokasi foto muka
Saat tombol Kirim Absensi ditekan, browser meminta izin lokasi. Lokasi dikirim bersama foto. Siswa harus mengizinkan lokasi dan GPS/layanan lokasi perlu aktif agar absensi foto selesai.

Catatan: browser memberi lokasi perangkat saat itu, dengan nilai akurasi yang ikut disimpan. Ini bukan jaminan anti-pemalsuan.
