# V19 Face Attendance

- Foto disimpan sebagai JPEG bersih tanpa watermark GPS/waktu.
- GPS, akurasi, Maps URL, dan alamat disimpan di Sheet/metadata Drive.
- Upload memakai form POST tersembunyi agar stabil di Chrome Android.
- Setelah POST, frontend memverifikasi file lewat endpoint GET JSONP.
- Foto lama pada tanggal+NISN yang sama di-trash dan diganti foto baru.

Deploy Code.gs sebagai Web App: Execute as **Me**, Who has access **Anyone**. Jalankan `setup()` sekali.
