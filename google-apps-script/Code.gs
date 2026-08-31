/*
 * XI TKJ 1 — BACKEND ABSENSI
 * Google Sheets + Google Drive
 * MANUAL + FOTO MUKA + BARCODE
 *
 * Spreadsheet:
 *   ABSENSI
 *   Absensi Foto Muka
 *
 * Sheet SISWA:
 *   A = NISN
 *   B = Nama
 *   C = Kelas
 */

const FOLDER_ID = '1Flcbrukb1Ln2x-uhDhUyWUc0eHp8EZoQ';
const SPREADSHEET_ID = '1cNhhSqJkimc2cwoT2djXZzoCZX1bl2gtcmVtcNH-yew';

const MANUAL_SHEET = 'ABSENSI';
const FACE_SHEET = 'Absensi Foto Muka';

const BACKEND_VERSION = 'XI-TKJ1-BARCODE-FACE-FIX-2026-08-31';
const TZ = 'Asia/Jakarta';


/* =====================================================
   GOOGLE DRIVE
   ===================================================== */

function folder_() {
  try {
    return DriveApp.getFolderById(FOLDER_ID);
  } catch (err) {
    throw new Error(
      'Google Drive tidak bisa diakses. ' +
      'Jalankan setup() terlebih dahulu dan izinkan akses Drive. Detail: ' +
      err.message
    );
  }
}


/* =====================================================
   GOOGLE SHEETS
   ===================================================== */

function ss_() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    try {
      ss.setSpreadsheetTimeZone(TZ);
    } catch (_) {}

    return ss;

  } catch (err) {
    throw new Error(
      'Google Sheets tidak bisa diakses. ' +
      'Jalankan setup() terlebih dahulu dan izinkan akses Spreadsheet. Detail: ' +
      err.message
    );
  }
}


/* =====================================================
   UTILITAS
   ===================================================== */

function clean_(value) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
    .slice(0, 120);
}


function normalizeDate_(value) {

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(
      value,
      TZ,
      'yyyy-MM-dd'
    );
  }

  const str = String(value == null ? '' : value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const m = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  );

  if (m) {
    return (
      m[3] +
      '-' +
      ('0' + m[2]).slice(-2) +
      '-' +
      ('0' + m[1]).slice(-2)
    );
  }

  return str;
}


function today_() {
  return Utilities.formatDate(
    new Date(),
    TZ,
    'yyyy-MM-dd'
  );
}


function nowTime_() {
  return Utilities.formatDate(
    new Date(),
    TZ,
    'HH:mm:ss'
  );
}


/* =====================================================
   SHEET HELPER
   ===================================================== */

function sheet_(name, headers) {

  const ss = ss_();

  let sh = ss.getSheetByName(name);

  if (!sh) {

    sh = ss.insertSheet(name);

    sh
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    sh.setFrozenRows(1);
  }

  return sh;
}


/* =====================================================
   JSON
   ===================================================== */

function json_(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


function jsonp_(obj, callback) {

  if (
    callback &&
    /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)
  ) {

    return ContentService
      .createTextOutput(
        callback +
        '(' +
        JSON.stringify(obj) +
        ');'
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return json_(obj);
}


/* =====================================================
   PAYLOAD HELPER
   Bisa menerima:
   - form-urlencoded
   - JSON body
   ===================================================== */

function payload_(e) {

  if (e && e.parameter) {
    const p = {};

    Object.keys(e.parameter).forEach(function(key) {
      p[key] = e.parameter[key];
    });

    /*
     * Kalau ada JSON body, coba gabungkan.
     * Form parameter tetap diprioritaskan.
     */
    try {

      if (
        e.postData &&
        e.postData.contents &&
        String(e.postData.type || '')
          .toLowerCase()
          .indexOf('application/json') !== -1
      ) {

        const body =
          JSON.parse(
            e.postData.contents
          );

        Object.keys(body).forEach(function(key) {
          if (
            p[key] === undefined ||
            p[key] === ''
          ) {
            p[key] = body[key];
          }
        });
      }

    } catch (_) {}

    return p;
  }


  /*
   * JSON body tanpa parameter
   */
  try {

    if (
      e &&
      e.postData &&
      e.postData.contents
    ) {

      const body =
        JSON.parse(
          e.postData.contents
        );

      if (
        body &&
        typeof body === 'object'
      ) {
        return body;
      }
    }

  } catch (_) {}

  return {};
}


/* =====================================================
   SETUP
   Jalankan SEKALI dari Apps Script editor
   ===================================================== */

function setup() {

  const ss = ss_();
  const folder = folder_();

  const manual = sheet_(
    MANUAL_SHEET,
    [
      'Tanggal',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Keterangan',
      'Waktu',
      'Metode'
    ]
  );

  const face = sheet_(
    FACE_SHEET,
    [
      'Timestamp',
      'Tanggal',
      'Waktu',
      'NISN',
      'Nama',
      'Latitude',
      'Longitude',
      'Akurasi (meter)',
      'Google Maps',
      'Lokasi Alamat',
      'File Drive'
    ]
  );

  return {
    ok: true,
    message: 'Setup berhasil.',
    version: BACKEND_VERSION,
    spreadsheet: ss.getName(),
    spreadsheetId: ss.getId(),
    folder: folder.getName(),
    folderId: folder.getId(),
    manualSheet: manual.getName(),
    faceSheet: face.getName()
  };
}


/* =====================================================
   TEST CONNECTION
   ===================================================== */

function TEST() {

  try {

    const ss = ss_();
    const folder = folder_();

    return {
      ok: true,
      message: 'Apps Script aktif.',
      spreadsheet: ss.getName(),
      spreadsheetId: ss.getId(),
      folder: folder.getName(),
      folderId: folder.getId(),
      version: BACKEND_VERSION
    };

  } catch (err) {

    return {
      ok: false,
      error: err.message || String(err),
      version: BACKEND_VERSION
    };
  }
}


function testConnection_() {
  return TEST();
}


/* =====================================================
   CARI SISWA BERDASARKAN NISN
   ===================================================== */

function findStudent_(nisn) {

  nisn = clean_(nisn);

  if (!nisn) {
    return null;
  }

  const ss = ss_();
  const siswa = ss.getSheetByName('SISWA');

  if (!siswa) {
    throw new Error(
      'Sheet SISWA tidak ditemukan.'
    );
  }

  if (siswa.getLastRow() < 2) {
    return null;
  }

  const values =
    siswa
      .getRange(
        2,
        1,
        siswa.getLastRow() - 1,
        3
      )
      .getDisplayValues();

  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const rowNisn =
      String(values[i][0] || '').trim();

    if (rowNisn === nisn) {

      return {
        nisn: rowNisn,
        name:
          String(values[i][1] || '').trim(),
        kelas:
          String(values[i][2] || '').trim() ||
          'XI TKJ 1'
      };
    }
  }

  return null;
}


/* =====================================================
   BARCODE ATTENDANCE
   Barcode berisi NISN.
   Barcode hanya dipanggil dari endpoint barcode.
   ===================================================== */

function saveBarcodeAttendance_(p) {

  const nisn =
    clean_(p.nisn);

  const date =
    clean_(p.date) || today_();

  if (!nisn) {

    return {
      ok: false,
      error: 'NISN barcode kosong.'
    };
  }


  let student;

  try {

    student =
      findStudent_(nisn);

  } catch (err) {

    return {
      ok: false,
      error: err.message || String(err)
    };
  }


  if (!student) {

    return {
      ok: false,
      error:
        'NISN ' +
        nisn +
        ' tidak ditemukan di sheet SISWA.'
    };
  }


  /*
   * BARCODE = HADIR
   * Disimpan ke sheet ABSENSI yang sama
   * dengan absensi manual.
   */

  const result =
    saveManual_({
      date: date,
      nisn: student.nisn,
      name: student.name,
      kelas: student.kelas,
      status: 'H',
      metode: 'BARCODE'
    });


  if (!result.ok) {
    return result;
  }


  return {

    ok: true,

    message:
      'Terima kasih, ' +
      student.name +
      ' sudah absen hari ini.',

    date: date,

    nisn:
      student.nisn,

    name:
      student.name,

    kelas:
      student.kelas,

    status:
      'H',

    metode:
      'BARCODE',

    waktu:
      result.waktu || nowTime_()
  };
}


/* =====================================================
   ABSENSI MANUAL
   ===================================================== */

function saveManual_(p) {

  const date =
    clean_(p.date) || today_();

  const nisn =
    clean_(p.nisn);

  const name =
    clean_(p.name);

  const kelas =
    clean_(p.kelas) ||
    'XI TKJ 1';

  const status =
    clean_(p.status)
      .toUpperCase();

  const metode =
    clean_(p.metode) ||
    'MANUAL';


  if (
    !date ||
    !nisn ||
    !name ||
    !status
  ) {

    return {
      ok: false,
      error:
        'Data absensi manual tidak lengkap.'
    };
  }


  if (
    ['H', 'I', 'A'].indexOf(status) === -1
  ) {

    return {
      ok: false,
      error:
        'Status absensi harus H, I, atau A.'
    };
  }


  const lock =
    LockService.getScriptLock();

  lock.waitLock(8000);

  try {

    const sh =
      sheet_(
        MANUAL_SHEET,
        [
          'Tanggal',
          'NISN',
          'Nama Siswa',
          'Kelas',
          'Keterangan',
          'Waktu',
          'Metode'
        ]
      );


    const now =
      new Date();

    const waktu =
      Utilities.formatDate(
        now,
        TZ,
        'HH:mm:ss'
      );


    const rows =
      sh.getLastRow() > 1
        ? sh
            .getRange(
              2,
              1,
              sh.getLastRow() - 1,
              7
            )
            .getValues()
        : [];


    let foundRow = 0;


    /*
     * Satu NISN hanya satu record per tanggal.
     * Kalau sudah ada, update.
     */

    for (
      let i = rows.length - 1;
      i >= 0;
      i--
    ) {

      if (
        normalizeDate_(rows[i][0]) === date &&
        String(rows[i][1]).trim() === nisn
      ) {

        foundRow =
          i + 2;

        break;
      }
    }


    const row = [

      date,

      nisn,

      name,

      kelas,

      status,

      waktu,

      metode

    ];


    if (foundRow) {

      sh
        .getRange(
          foundRow,
          1,
          1,
          7
        )
        .setValues([row]);

    } else {

      sh.appendRow(row);
    }


    SpreadsheetApp.flush();


    return {

      ok: true,

      date: date,

      nisn: nisn,

      name: name,

      kelas: kelas,

      status: status,

      metode: metode,

      waktu: waktu,

      timestamp:
        now.toISOString()
    };


  } finally {

    try {
      lock.releaseLock();
    } catch (_) {}
  }
}


/* =====================================================
   FOTO MUKA
   Foto tetap bisa dikirim walaupun lokasi kosong.
   Lokasi hanya metadata tambahan.
   ===================================================== */

function saveFace_(p) {
  /*
   * Upload foto absensi yang lebih tahan terhadap:
   * - data URL (data:image/jpeg;base64,...)
   * - base64 polos
   * - base64 URL-safe
   * - lokasi GPS kosong / belum tersedia
   * - waktu dari HP yang tidak akurat
   *
   * Waktu absensi ditentukan SERVER Apps Script (Asia/Jakarta),
   * sedangkan lokasi tetap memakai GPS dari frontend.
   */
  const date = clean_(p.date) || today_();
  const nisn = clean_(p.nisn);
  const name = clean_(p.name) || 'Siswa';

  // Jangan percaya waktu dari browser untuk timestamp utama.
  const serverNow = new Date();
  const time = Utilities.formatDate(serverNow, TZ, 'HH:mm:ss');

  if (!date || !nisn) {
    return json_({
      ok: false,
      error: 'Tanggal atau NISN foto tidak lengkap.'
    });
  }

  if (p.imageData === undefined || p.imageData === null || String(p.imageData).trim() === '') {
    return json_({
      ok: false,
      error: 'Foto tidak diterima server. imageData kosong.'
    });
  }

  let fldr;
  try {
    fldr = folder_();
  } catch (err) {
    return json_({
      ok: false,
      error: err.message || String(err)
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    /* -----------------------------------------------------
       1. Ambil GPS sebagai metadata. GPS TIDAK boleh
          menggagalkan upload foto.
       ----------------------------------------------------- */
    const latitude = String(p.latitude ?? '').trim();
    const longitude = String(p.longitude ?? '').trim();
    const accuracy = String(p.accuracy ?? '').trim();

    let mapsUrl = String(p.mapsUrl ?? '').trim();
    if (!mapsUrl && latitude && longitude) {
      mapsUrl = 'https://www.google.com/maps?q=' +
        encodeURIComponent(latitude + ',' + longitude);
    }

    const locationText = String(
      p.locationText ?? p.address ?? ''
    ).trim();

    /* -----------------------------------------------------
       2. Decode foto dengan aman.
       ----------------------------------------------------- */
    let raw = String(p.imageData).trim();
    let mimeType = 'image/jpeg';
    let extension = 'jpg';

    // Tangani data URL, termasuk png/webp.
    const dataUrlMatch = raw.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/is);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1].toLowerCase();
      raw = dataUrlMatch[2];

      if (mimeType === 'image/png') extension = 'png';
      else if (mimeType === 'image/webp') extension = 'webp';
      else if (mimeType === 'image/gif') extension = 'gif';
      else {
        mimeType = 'image/jpeg';
        extension = 'jpg';
      }
    }

    raw = raw.replace(/\s/g, '');

    if (!raw) {
      return json_({
        ok: false,
        error: 'Data foto kosong setelah diproses.'
      });
    }

    let bytes;
    try {
      // Coba base64 standar terlebih dahulu.
      try {
        bytes = Utilities.base64Decode(raw, Utilities.Charset.UTF_8);
      } catch (_) {
        // Fallback untuk base64 URL-safe (- dan _).
        bytes = Utilities.base64DecodeWebSafe(raw, Utilities.Charset.UTF_8);
      }
    } catch (err) {
      return json_({
        ok: false,
        error: 'Format foto/base64 tidak valid: ' + (err.message || String(err))
      });
    }

    if (!bytes || !bytes.length) {
      return json_({
        ok: false,
        error: 'Foto berhasil dibaca tetapi isinya kosong.'
      });
    }

    /* -----------------------------------------------------
       3. Cari file absensi siswa pada tanggal yang sama.
          Jika ada, hapus file lama agar foto terbaru benar-benar
          masuk ke Drive. Ini memperbaiki kasus foto lama tetap muncul.
       ----------------------------------------------------- */
    const files = fldr.getFiles();
    let oldFile = null;

    while (files.hasNext()) {
      const f = files.next();
      const description = f.getDescription() || '';

      try {
        const meta = JSON.parse(description);
        if (
          meta.type === 'face-attendance' &&
          meta.date === date &&
          meta.nisn === nisn
        ) {
          oldFile = f;
          break;
        }
      } catch (_) {}
    }

    if (oldFile) {
      try {
        oldFile.setTrashed(true);
      } catch (_) {
        // Kalau file lama gagal dihapus, upload tetap diteruskan.
      }
    }

    /* -----------------------------------------------------
       4. Buat file foto baru di folder Drive.
       ----------------------------------------------------- */
    const safeName = clean_(name) || 'Siswa';
    const stamp = Utilities.formatDate(serverNow, TZ, 'yyyyMMdd_HHmmss');

    const blob = Utilities.newBlob(
      bytes,
      mimeType,
      'XI_TKJ1_FACE_' + date + '_' + stamp + '_' + safeName + '.' + extension
    );

    const file = fldr.createFile(blob);

    /* -----------------------------------------------------
       5. Tempel informasi lokasi + waktu sebagai METADATA Drive.
          Informasi ini juga masuk ke Sheet.
       ----------------------------------------------------- */
    const meta = {
      type: 'face-attendance',
      version: BACKEND_VERSION,
      date: date,
      nisn: nisn,
      name: name,
      time: time,
      timestamp: serverNow.toISOString(),
      timezone: TZ,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
      mapsUrl: mapsUrl,
      locationText: locationText
    };

    file.setDescription(JSON.stringify(meta));

    /* -----------------------------------------------------
       6. Simpan / update record pada Sheet FOTO MUKA.
       ----------------------------------------------------- */
    const sh = sheet_(FACE_SHEET, [
      'Timestamp',
      'Tanggal',
      'Waktu',
      'NISN',
      'Nama',
      'Latitude',
      'Longitude',
      'Akurasi (meter)',
      'Google Maps',
      'Lokasi Alamat',
      'File Drive'
    ]);

    const rows = sh.getLastRow() > 1
      ? sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues()
      : [];

    const row = [
      serverNow,
      date,
      time,
      nisn,
      name,
      latitude,
      longitude,
      accuracy,
      mapsUrl,
      locationText,
      file.getUrl()
    ];

    let updated = false;

    for (let i = rows.length - 1; i >= 0; i--) {
      if (
        normalizeDate_(rows[i][1]) === date &&
        String(rows[i][3] || '').trim() === nisn
      ) {
        sh.getRange(i + 2, 1, 1, 11).setValues([row]);
        updated = true;
        break;
      }
    }

    if (!updated) {
      sh.appendRow(row);
    }

    /* -----------------------------------------------------
       7. Masukkan foto muka sebagai HADIR di ABSENSI.
       ----------------------------------------------------- */
    let student = null;
    try {
      student = findStudent_(nisn);
    } catch (_) {}

    const finalName = student && student.name ? student.name : name;
    const finalKelas = student && student.kelas
      ? student.kelas
      : clean_(p.kelas) || 'XI TKJ 1';

    const manualResult = saveManual_({
      date: date,
      nisn: nisn,
      name: finalName,
      kelas: finalKelas,
      status: 'H',
      metode: 'FOTO MUKA'
    });

    if (!manualResult.ok) {
      return json_({
        ok: false,
        error: 'Foto sudah masuk Drive, tetapi status H gagal disimpan: ' + manualResult.error,
        fileId: file.getId(),
        fileUrl: file.getUrl()
      });
    }

    SpreadsheetApp.flush();

    return json_({
      ok: true,
      message: 'Foto absensi berhasil disimpan.',
      id: file.getId(),
      url: file.getUrl(),
      date: date,
      time: time,
      timestamp: serverNow.toISOString(),
      timezone: TZ,
      nisn: nisn,
      name: finalName,
      kelas: finalKelas,
      status: 'H',
      metode: 'FOTO MUKA',
      locationSaved: !!(latitude && longitude),
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
      mapsUrl: mapsUrl,
      locationText: locationText
    });

  } catch (err) {
    return json_({
      ok: false,
      error: err.message || String(err)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

/* =====================================================
   STATUS ABSENSI
   ===================================================== */

function attendanceStatus_(p) {

  const date =
    clean_(p.date) || today_();

  const nisn =
    clean_(p.nisn);


  let manualStatus = '';

  let faceDone = false;

  let record = null;


  if (date && nisn) {

    const ss =
      ss_();


    /*
     * CEK SHEET ABSENSI
     */

    const msh =
      ss.getSheetByName(
        MANUAL_SHEET
      );


    if (
      msh &&
      msh.getLastRow() > 1
    ) {

      const rows =
        msh
          .getRange(
            2,
            1,
            msh.getLastRow() - 1,
            7
          )
          .getValues();


      for (
        let i = rows.length - 1;
        i >= 0;
        i--
      ) {

        if (
          normalizeDate_(rows[i][0]) === date &&
          String(rows[i][1]).trim() === nisn
        ) {

          manualStatus =
            String(
              rows[i][4] || ''
            ).trim().toUpperCase();


          record = {

            date:
              normalizeDate_(
                rows[i][0]
              ),

            nisn:
              String(
                rows[i][1] || ''
              ),

            name:
              String(
                rows[i][2] || ''
              ),

            kelas:
              String(
                rows[i][3] || ''
              ),

            status:
              manualStatus,

            time:
              String(
                rows[i][5] || ''
              ),

            metode:
              String(
                rows[i][6] || ''
              )
          };

          break;
        }
      }
    }


    /*
     * CEK FOTO MUKA
     */

    const fsh =
      ss.getSheetByName(
        FACE_SHEET
      );


    if (
      fsh &&
      fsh.getLastRow() > 1
    ) {

      const rows =
        fsh
          .getRange(
            2,
            1,
            fsh.getLastRow() - 1,
            11
          )
          .getValues();


      for (
        let i = rows.length - 1;
        i >= 0;
        i--
      ) {

        if (
          normalizeDate_(rows[i][1]) === date &&
          String(rows[i][3]).trim() === nisn
        ) {

          faceDone = true;

          break;
        }
      }
    }
  }


  return {

    ok:
      true,

    date:
      date,

    nisn:
      nisn,

    manualStatus:
      manualStatus,

    faceDone:
      faceDone,

    locked:
      manualStatus === 'H' ||
      faceDone,

    record:
      record
  };
}


/* =====================================================
   RINGKASAN ABSENSI ADMIN
   ===================================================== */

function attendanceSummary_(p) {

  const date =
    clean_(p.date) || today_();


  if (!date) {

    return json_({
      ok: false,
      error:
        'Tanggal tidak ada.'
    });
  }


  const manualSheet =
    sheet_(
      MANUAL_SHEET,
      [
        'Tanggal',
        'NISN',
        'Nama Siswa',
        'Kelas',
        'Keterangan',
        'Waktu',
        'Metode'
      ]
    );


  const faceSheet =
    sheet_(
      FACE_SHEET,
      [
        'Timestamp',
        'Tanggal',
        'Waktu',
        'NISN',
        'Nama',
        'Latitude',
        'Longitude',
        'Akurasi (meter)',
        'Google Maps',
        'Lokasi Alamat',
        'File Drive'
      ]
    );


  const manual = {};


  if (
    manualSheet.getLastRow() > 1
  ) {

    const rows =
      manualSheet
        .getRange(
          2,
          1,
          manualSheet.getLastRow() - 1,
          7
        )
        .getValues();


    rows.forEach(function(r) {

      if (
        normalizeDate_(r[0]) === date &&
        r[1]
      ) {

        manual[
          String(r[1])
        ] = {

          date:
            normalizeDate_(r[0]),

          nisn:
            String(r[1]),

          name:
            String(r[2] || ''),

          kelas:
            String(r[3] || ''),

          status:
            String(r[4] || ''),

          keterangan:
            String(r[4] || ''),

          timestamp:
            String(r[5] || ''),

          time:
            String(r[5] || ''),

          metode:
            String(r[6] || '')
        };
      }
    });
  }


  const face = [];


  if (
    faceSheet.getLastRow() > 1
  ) {

    const rows =
      faceSheet
        .getRange(
          2,
          1,
          faceSheet.getLastRow() - 1,
          11
        )
        .getValues();


    rows.forEach(function(r) {

      if (
        normalizeDate_(r[1]) === date &&
        r[3]
      ) {

        face.push({

          date:
            normalizeDate_(r[1]),

          time:
            String(r[2] || ''),

          nisn:
            String(r[3]),

          name:
            String(r[4] || ''),

          latitude:
            String(r[5] || ''),

          longitude:
            String(r[6] || ''),

          accuracy:
            String(r[7] || ''),

          mapsUrl:
            String(r[8] || ''),

          locationText:
            String(r[9] || ''),

          url:
            String(r[10] || '')
        });
      }
    });
  }


  return json_({

    ok:
      true,

    date:
      date,

    manual:
      manual,

    face:
      face

  });
}


/* =====================================================
   HAPUS ABSENSI MANUAL
   ===================================================== */

function deleteManual_(p) {

  const date =
    clean_(p.date);

  const nisn =
    clean_(p.nisn);


  if (!date || !nisn) {

    return {
      ok: false,
      error:
        'Tanggal atau NISN tidak lengkap.'
    };
  }


  const sh =
    ss_().getSheetByName(
      MANUAL_SHEET
    );


  if (
    !sh ||
    sh.getLastRow() < 2
  ) {

    return {
      ok: true,
      deleted: 0
    };
  }


  const rows =
    sh
      .getRange(
        2,
        1,
        sh.getLastRow() - 1,
        7
      )
      .getValues();


  let deleted = 0;


  for (
    let i = rows.length - 1;
    i >= 0;
    i--
  ) {

    if (
      normalizeDate_(rows[i][0]) === date &&
      String(rows[i][1]).trim() === nisn
    ) {

      sh.deleteRow(
        i + 2
      );

      deleted++;
    }
  }


  SpreadsheetApp.flush();


  return {

    ok:
      true,

    deleted:
      deleted

  };
}


/* =====================================================
   BATCH MANUAL
   ===================================================== */

function saveManualBatch_(p) {

  let list = [];


  try {

    list =
      JSON.parse(
        p.records || '[]'
      );

  } catch (e) {

    return {
      ok: false,
      error:
        'Format records tidak valid.'
    };
  }


  if (
    !Array.isArray(list) ||
    !list.length
  ) {

    return {
      ok: false,
      error:
        'Tidak ada data absensi.'
    };
  }


  const results = [];


  list.forEach(function(r) {

    results.push(
      saveManual_(r)
    );

  });


  const failed =
    results.filter(
      function(r) {
        return !r.ok;
      }
    );


  return {

    ok:
      failed.length === 0,

    count:
      results.length,

    failed:
      failed

  };
}


/* =====================================================
   DAFTAR FOTO MUKA
   ===================================================== */

function listFaceAttendance_(p) {

  const date =
    clean_(p.date);

  const records = [];

  const files =
    folder_().getFiles();


  while (
    files.hasNext()
  ) {

    const f =
      files.next();

    const d =
      f.getDescription() || '';


    try {

      const m =
        JSON.parse(d);


      if (
        m.type ===
          'face-attendance' &&

        (!date ||
          m.date === date)
      ) {

        records.push({

          nisn:
            m.nisn || '',

          name:
            m.name || '',

          time:
            m.time || '',

          date:
            m.date || '',

          latitude:
            m.latitude || '',

          longitude:
            m.longitude || '',

          accuracy:
            m.accuracy || '',

          mapsUrl:
            m.mapsUrl || '',

          locationText:
            m.locationText || '',

          id:
            f.getId(),

          url:
            f.getUrl(),

          thumbnail:
            'https://drive.google.com/thumbnail?id=' +
            encodeURIComponent(
              f.getId()
            ) +
            '&sz=w700'
        });
      }

    } catch (_) {}
  }


  records.sort(
    function(a, b) {
      return (
        (a.time || '')
          .localeCompare(
            b.time || ''
          )
      );
    }
  );


  return {

    ok:
      true,

    records:
      records

  };
}


/* =====================================================
   DO GET
   ===================================================== */

function doGet(e) {

  try {

    const p =
      payload_(e);

    const action =
      String(
        p.action || ''
      ).trim();


    /*
     * TEST
     */

    if (
      action === 'test' ||
      action === 'ping'
    ) {

      return jsonp_({

        ok:
          true,

        message:
          'ABSENSI XI TKJ 1 API aktif',

        version:
          BACKEND_VERSION

      }, p.callback);
    }


    /*
     * TEST CONNECTION
     */

    if (
      action ===
      'testConnection'
    ) {

      return jsonp_(
        testConnection_(),
        p.callback
      );
    }


    /*
     * BARCODE
     */

    if (
      action ===
        'saveBarcodeAttendance' ||
      action ===
        'barcode'
    ) {

      return jsonp_(
        saveBarcodeAttendance_(p),
        p.callback
      );
    }


    /*
     * MANUAL
     */

    if (
      action ===
        'saveManualAttendance'
    ) {

      return jsonp_(
        saveManual_(p),
        p.callback
      );
    }


    /*
     * MANUAL BATCH
     */

    if (
      action ===
        'saveManualAttendanceBatch' ||
      action ===
        'saveManualBatch'
    ) {

      return jsonp_(
        saveManualBatch_(p),
        p.callback
      );
    }


    /*
     * DELETE
     */

    if (
      action ===
        'deleteManualAttendance'
    ) {

      return jsonp_(
        deleteManual_(p),
        p.callback
      );
    }


    /*
     * STATUS
     */

    if (
      action ===
        'attendanceStatus'
    ) {

      return jsonp_(
        attendanceStatus_(p),
        p.callback
      );
    }


    /*
     * SUMMARY
     */

    if (
      action ===
        'attendanceSummary'
    ) {

      return attendanceSummary_(p);
    }


    /*
     * VERSION
     */

    if (
      action ===
        'version'
    ) {

      return jsonp_({

        ok:
          true,

        version:
          BACKEND_VERSION

      }, p.callback);
    }


    /*
     * LIST FOTO
     */

    if (
      action ===
        'listFaceAttendance'
    ) {

      return jsonp_(
        listFaceAttendance_(p),
        p.callback
      );
    }


    return jsonp_({

      ok:
        true,

      message:
        'XI TKJ 1 attendance backend running',

      version:
        BACKEND_VERSION

    }, p.callback);


  } catch (err) {

    return jsonp_({

      ok:
        false,

      error:
        err.message ||
        String(err),

      version:
        BACKEND_VERSION

    }, e &&
       e.parameter &&
       e.parameter.callback);
  }
}


/* =====================================================
   DO POST
   ===================================================== */

function doPost(e) {

  try {

    const p =
      payload_(e);

    const action =
      String(
        p.action || ''
      ).trim();


    /*
     * FOTO MUKA
     */

    if (
      action ===
        'uploadFaceAttendance'
    ) {

      return saveFace_(p);
    }


    /*
     * BARCODE
     */

    if (
      action ===
        'saveBarcodeAttendance' ||
      action ===
        'barcode'
    ) {

      return json_(
        saveBarcodeAttendance_(p)
      );
    }


    /*
     * MANUAL
     */

    if (
      action ===
        'saveManualAttendance'
    ) {

      return json_(
        saveManual_(p)
      );
    }


    /*
     * MANUAL BATCH
     */

    if (
      action ===
        'saveManualAttendanceBatch' ||
      action ===
        'saveManualBatch'
    ) {

      return json_(
        saveManualBatch_(p)
      );
    }


    /*
     * DELETE MANUAL
     */

    if (
      action ===
        'deleteManualAttendance'
    ) {

      return json_(
        deleteManual_(p)
      );
    }


    /*
     * STATUS
     */

    if (
      action ===
        'attendanceStatus'
    ) {

      return json_(
        attendanceStatus_(p)
      );
    }


    /*
     * SUMMARY
     */

    if (
      action ===
        'attendanceSummary'
    ) {

      return attendanceSummary_(p);
    }


    /*
     * TEST CONNECTION
     */

    if (
      action ===
        'testConnection'
    ) {

      return json_(
        testConnection_()
      );
    }


    return json_({

      ok:
        false,

      error:
        'Action POST tidak dikenal: ' +
        action

    });


  } catch (err) {

    return json_({

      ok:
        false,

      error:
        err.message ||
        String(err)

    });
  }
}
