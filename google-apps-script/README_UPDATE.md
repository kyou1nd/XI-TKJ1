# Update Backend Absensi

Setelah memakai ZIP ini, **deploy ulang Google Apps Script sebagai Web App** agar endpoint baru `attendanceSummary` aktif.

1. Buka project Apps Script yang dipakai oleh `DRIVE_UPLOAD_URL`.
2. Ganti isi `Code.gs` dengan file `google-apps-script/Code.gs` dari ZIP ini.
3. Deploy > Manage deployments > Edit deployment.
4. Pilih **Web app**, Execute as **Me**, Who has access **Anyone**.
5. Deploy dan pastikan URL `/exec` tetap sama. Jika URL berubah, update `drive-config.js`.
6. Saat endpoint dipanggil, sheet **Absensi Manual** dan **Absensi Foto Muka** akan otomatis dibuat jika belum ada.

Frontend sekarang menggabungkan:
- H/I/A dari Control Panel Admin
- Foto muka dari Drive/Sheet
- Jika tidak ada foto, tampil teks seperti: `Ines Afina Rahma Hadir 31.08.2026 00:24`
