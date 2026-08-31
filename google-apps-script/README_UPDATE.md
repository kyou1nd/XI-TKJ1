# Perbaikan Sambungan Absen Manual ke Google Sheets

Versi ini memperbaiki sinkronisasi **Absen Manual H/I/A**.

## Yang diperbaiki
- H/I/A dikirim ke sheet `Absensi Manual`.
- Status hanya menerima `H`, `I`, atau `A`.
- Tombol **Hadir Semua** tidak lagi mengirim 36 data dalam satu URL GET yang bisa terlalu panjang; data dikirim satu per satu agar lebih stabil.
- Klik ulang status yang sama tetap bisa membatalkan dan menghapus barisnya dari Sheet.
- Endpoint `testConnection` tersedia untuk mengecek Web App.

## Wajib deploy ulang Apps Script
1. Buka project Google Apps Script yang terhubung ke Spreadsheet.
2. Ganti isi `Code.gs` dengan file `google-apps-script/Code.gs` ini.
3. **Deploy → Manage deployments → Edit**.
4. Type: **Web app**.
5. Execute as: **Me**.
6. Who has access: **Anyone**.
7. Deploy.
8. Pastikan URL `/exec` sama dengan `DRIVE_UPLOAD_URL` di `drive-config.js`.

## Cek koneksi
Buka URL Web App dengan parameter `?action=testConnection&callback=test`. Jika benar, respons akan diawali `test({` dan berisi `"ok":true`.

Setelah itu buka website, masuk **Admin → Absensi Kelas**, lalu pilih H/I/A. Data akan dibuat/diperbarui di sheet **Absensi Manual** dengan kolom:

`Timestamp | Tanggal | NISN | Nama | Kelas | Status | Keterangan`
