# FIX ABSEN MANUAL → GOOGLE SHEETS

Versi ini memperbaiki dua hal penting:

1. `testConnection` sekarang benar-benar membuka Google Sheets + Google Drive, jadi tidak lagi mengatakan “aktif” padahal izin belum ada.
2. Ditambahkan `setup()` dan `appsscript.json` dengan OAuth scope Sheets + Drive untuk memicu authorization dengan benar.

## WAJIB dilakukan sekali

1. Buka Google Apps Script sebagai akun yang **memiliki/ditulisinkan edit** ke Spreadsheet dan folder Drive.
2. Ganti `Code.gs` dengan file ini.
3. Pastikan `appsscript.json` ikut dibuat/diganti.
4. Di editor Apps Script pilih fungsi **`setup`** lalu klik **Run**.
5. Saat muncul “Authorization required”, pilih akun pemilik → **Allow**.
6. Pastikan `setup()` selesai tanpa error.
7. Deploy → Manage deployments → Edit deployment Web App.
8. **Execute as: Me**.
9. **Who has access: Anyone**.
10. Deploy versi terbaru.

## Tes

Buka URL Web App:

`.../exec?action=testConnection&callback=test`

Jika berhasil respons harus berisi:

`"ok":true`

Jika gagal, respons sekarang akan menjelaskan apakah masalahnya izin Spreadsheet atau Drive.

## Sheet

`ABSENSI`:
`Timestamp | Tanggal | NISN | Nama | Kelas | Status | Keterangan`

Status yang diterima: `H`, `I`, `A`.


## Barcode Absensi
Frontend kini menyediakan Barcode/QR NISN per siswa di folder `BARCODE SISWA/`. Scan dilakukan khusus dari Admin Control Panel dan menyimpan status H ke `ABSENSI` melalui action `saveManualAttendance` yang sudah tersedia.


V17 upload foto: foto dikompresi maksimal sekitar 1280px/600KB, dikirim via POST, lalu diverifikasi kembali melalui daftar foto Drive. Jika belum muncul, frontend menampilkan error deployment Apps Script.
