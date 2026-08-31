/*
 XI TKJ 1 — Backend Google Drive + Google Sheets
 Website tetap di GitHub Pages. Apps Script hanya menerima data absensi.
*/
const FOLDER_ID = '1Flcbrukb1Ln2x-uhDhUyWUc0eHp8EZoQ';
const SPREADSHEET_ID = '1cNhhSqJkimc2cwoT2djXZzoCZX1bl2gtcmVtcNH-yew';
const MANUAL_SHEET = 'ABSENSI';
const FACE_SHEET = 'Absensi Foto Muka';

function folder_(){
  try {
    return DriveApp.getFolderById(FOLDER_ID);
  } catch (err) {
    throw new Error('Google Drive belum berizin atau FOLDER_ID tidak dapat diakses. Jalankan setup() sekali dari editor Apps Script dengan akun pemilik folder. Detail: ' + err.message);
  }
}
function ss_(){
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    try { ss.setSpreadsheetTimeZone('Asia/Jakarta'); } catch (_) {}
    return ss;
  } catch (err) {
    throw new Error('Google Sheets belum berizin. Jalankan fungsi setup() sekali dari editor Apps Script dengan akun pemilik Spreadsheet, izinkan akses Google Sheets dan Drive, lalu Deploy ulang sebagai Web App dengan Execute as: Me. Detail: ' + err.message);
  }
}
function clean_(s){ return String(s||'').replace(/[\\/:*?"<>|#%{}~&]/g,'_').slice(0,120); }
function sheet_(name, headers){
  const ss=ss_(); let sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function jsonp_(obj,cb){
  if(cb && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) return ContentService.createTextOutput(cb+'('+JSON.stringify(obj)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return json_(obj);
}

function setup(){
  // Jalankan SEKALI dari editor Apps Script untuk memicu authorization.
  const ss = ss_();
  const folder = folder_();
  const manual = sheet_(MANUAL_SHEET,['Tanggal','NISN','Nama Siswa','Kelas','Keterangan','Waktu','Metode']);
  const face = sheet_(FACE_SHEET,['Timestamp','Tanggal','Waktu','NISN','Nama','Latitude','Longitude','Akurasi (meter)','Google Maps','Lokasi Alamat','File Drive']);
  return {ok:true, spreadsheet:ss.getName(), spreadsheetId:ss.getId(), folder:folder.getName(), folderId:folder.getId(), manualSheet:manual.getName(), faceSheet:face.getName()};
}

function testConnection_(){
  try {
    const ss = ss_();
    const folder = folder_();
    const manual = sheet_(MANUAL_SHEET,['Tanggal','NISN','Nama Siswa','Kelas','Keterangan','Waktu','Metode']);
    return {ok:true,message:'Koneksi Google Sheets dan Drive berhasil',spreadsheet:ss.getName(),spreadsheetId:ss.getId(),folder:folder.getName(),manualSheet:manual.getName()};
  } catch(err) {
    return {ok:false,error:String(err && err.message ? err.message : err)};
  }
}

function doPost(e){
  try{
    const p=e.parameter||{}, action=p.action||'';
    if(action==='uploadFaceAttendance') return saveFace_(p);
    if(action==='saveManualAttendance') return json_(saveManual_(p));
    if(action==='saveBarcodeAttendance') return json_(saveBarcodeAttendance_(p));
    if(action==='saveManualAttendanceBatch') return json_(saveManualBatch_(p));
    if(action==='deleteManualAttendance') return json_(deleteManual_(p));
    if(action==='testConnection') return json_(testConnection_());
    return json_({ok:false,error:'Unknown action'});
  }catch(err){ return json_({ok:false,error:String(err)}); }
}

function normalizeDate_(value){
  if(value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value,'Asia/Jakarta','yyyy-MM-dd');
  const str=String(value||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m=str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return str;
}



function saveBarcodeAttendance_(p){
  const nisn=clean_(p.nisn);
  const date=clean_(p.date) || Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd');
  if(!nisn) return {ok:false,error:'NISN barcode kosong.'};

  const ss=ss_();
  const siswa=ss.getSheetByName('SISWA');
  if(!siswa) return {ok:false,error:'Sheet SISWA tidak ditemukan.'};
  if(siswa.getLastRow()<2) return {ok:false,error:'Sheet SISWA belum berisi data siswa.'};

  const values=siswa.getRange(2,1,siswa.getLastRow()-1,3).getDisplayValues();
  let student=null;
  for(let i=0;i<values.length;i++){
    if(String(values[i][0]).trim()===nisn){
      student={nisn:String(values[i][0]).trim(),name:String(values[i][1]).trim(),kelas:String(values[i][2]).trim()||'XI TKJ 1'};
      break;
    }
  }
  if(!student) return {ok:false,error:'NISN '+nisn+' tidak ditemukan di sheet SISWA.'};

  const result=saveManual_({
    date:date,
    nisn:student.nisn,
    name:student.name,
    kelas:student.kelas,
    status:'H',
    metode:'BARCODE'
  });
  if(!result.ok) return result;

  return {ok:true,message:'Absensi barcode berhasil disimpan.',date:date,nisn:student.nisn,name:student.name,kelas:student.kelas,status:'H',metode:'BARCODE'};
}

function saveManual_(p){
  const date=clean_(p.date), nisn=clean_(p.nisn), name=clean_(p.name), status=clean_(p.status).toUpperCase();
  if(!date||!nisn||!name||!status) return {ok:false,error:'Data absensi manual tidak lengkap.'};
  if(['H','I','A'].indexOf(status)===-1) return {ok:false,error:'Status absensi harus H, I, atau A.'};

  const lock=LockService.getScriptLock();
  lock.tryLock(8000);
  try{
    const sh=sheet_(MANUAL_SHEET,['Tanggal','NISN','Nama Siswa','Kelas','Keterangan','Waktu','Metode']);
    const now=new Date();
    const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,7).getValues():[];
    let foundRow=0;
    for(let i=rows.length-1;i>=0;i--){
      if(normalizeDate_(rows[i][0])===date && String(rows[i][1]).trim()===nisn){foundRow=i+2;break;}
    }
    const row=[date,nisn,name,clean_(p.kelas)||'XI TKJ 1',status,Utilities.formatDate(now,'Asia/Jakarta','HH:mm:ss'),clean_(p.metode)||'MANUAL'];
    if(foundRow) sh.getRange(foundRow,1,1,7).setValues([row]);
    else sh.appendRow(row);
    SpreadsheetApp.flush();
    return {ok:true,date,nisn,name,status,timestamp:now.toISOString()};
  }finally{
    try{lock.releaseLock()}catch(_){}
  }
}

function deleteManual_(p){
  const date=clean_(p.date), nisn=clean_(p.nisn);
  if(!date||!nisn)return {ok:false,error:'Tanggal atau NISN tidak lengkap.'};
  const sh=ss_().getSheetByName(MANUAL_SHEET);
  if(!sh||sh.getLastRow()<2)return {ok:true,deleted:0};
  const rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues();
  let deleted=0;
  for(let i=rows.length-1;i>=0;i--){
    if(normalizeDate_(rows[i][0])===date&&String(rows[i][1]).trim()===nisn){sh.deleteRow(i+2);deleted++;}
  }
  SpreadsheetApp.flush();
  return {ok:true,deleted};
}

function saveManualBatch_(p){
  let list=[];
  try{list=JSON.parse(p.records||'[]')}catch(e){return {ok:false,error:'Format records tidak valid.'}}
  if(!Array.isArray(list)||!list.length)return {ok:false,error:'Tidak ada data absensi.'};
  const results=[];
  list.forEach(r=>results.push(saveManual_(r)));
  const failed=results.filter(r=>!r.ok);
  return {ok:failed.length===0,count:results.length,failed};
}

function saveFace_(p){
  const date=clean_(p.date), nisn=clean_(p.nisn), name=clean_(p.name), time=clean_(p.time);
  if(!date||!nisn||!p.imageData) return json_({ok:false,error:'Data foto tidak lengkap.'});
  const fldr=folder_(), files=fldr.getFiles();
  let file=null;
  while(files.hasNext()){
    const f=files.next(), d=f.getDescription()||'';
    try{ const m=JSON.parse(d); if(m.type==='face-attendance'&&m.date===date&&m.nisn===nisn){ file=f; break; } }catch(_){}
  }
  if(!file){
    const bytes=Utilities.base64Decode(String(p.imageData).replace(/^data:image\/\w+;base64,/,'')); 
    file=fldr.createFile(Utilities.newBlob(bytes,'image/jpeg','XI_TKJ1_FACE_'+date+'_'+time+'_'+clean_(name||'Siswa')+'.jpg'));
  }
  const meta={type:'face-attendance',date,nisn,name,time,latitude:String(p.latitude||''),longitude:String(p.longitude||''),accuracy:String(p.accuracy||''),mapsUrl:String(p.mapsUrl||''),locationText:String(p.locationText||p.address||'')};
  file.setDescription(JSON.stringify(meta));

  const sh=sheet_(FACE_SHEET,['Timestamp','Tanggal','Waktu','NISN','Nama','Latitude','Longitude','Akurasi (meter)','Google Maps','Lokasi Alamat','File Drive']);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,11).getValues():[];
  const row=[new Date(),date,time,nisn,name,meta.latitude,meta.longitude,meta.accuracy,meta.mapsUrl,meta.locationText,file.getUrl()];
  let updated=false;
  rows.forEach((r,i)=>{ if(String(r[1])===date&&String(r[3])===nisn){ sh.getRange(i+2,1,1,11).setValues([row]); updated=true; }});
  if(!updated) sh.appendRow(row);
  return json_({ok:true,id:file.getId(),url:file.getUrl()});
}


function attendanceStatus_(p){
  const date=clean_(p.date), nisn=clean_(p.nisn);
  let manualStatus='', faceDone=false, record=null;
  if(date&&nisn){
    const ss=ss_();
    const msh=ss.getSheetByName(MANUAL_SHEET);
    if(msh&&msh.getLastRow()>1){
      const rows=msh.getRange(2,1,msh.getLastRow()-1,7).getValues();
      for(let i=rows.length-1;i>=0;i--){
        if(normalizeDate_(rows[i][0])===date&&String(rows[i][1]).trim()===nisn){manualStatus=String(rows[i][4]||'');break;}
      }
    }
    const fsh=ss.getSheetByName(FACE_SHEET);
    if(fsh&&fsh.getLastRow()>1){
      const rows=fsh.getRange(2,1,fsh.getLastRow()-1,11).getValues();
      for(let i=rows.length-1;i>=0;i--){
        if(normalizeDate_(rows[i][1])===date&&String(rows[i][3]).trim()===nisn){
          faceDone=true;
          record={date:String(rows[i][1]||''),time:String(rows[i][2]||''),nisn:String(rows[i][3]||''),name:String(rows[i][4]||''),latitude:String(rows[i][5]||''),longitude:String(rows[i][6]||''),accuracy:String(rows[i][7]||''),mapsUrl:String(rows[i][8]||''),locationText:String(rows[i][9]||''),url:String(rows[i][10]||'')};
          break;
        }
      }
    }
  }
  const obj={ok:true,date,nisn,manualStatus,faceDone,locked:manualStatus==='H'||faceDone,record};
  const cb=p.callback;
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) return ContentService.createTextOutput(cb+'('+JSON.stringify(obj)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return json_(obj);
}

function attendanceSummary_(p){
  const date=clean_(p.date);
  if(!date) return json_({ok:false,error:'Tanggal tidak ada.'});
  const ss=ss_();
  const manualSheet=sheet_(MANUAL_SHEET,['Tanggal','NISN','Nama Siswa','Kelas','Keterangan','Waktu','Metode']);
  const faceSheet=sheet_(FACE_SHEET,['Timestamp','Tanggal','Waktu','NISN','Nama','Latitude','Longitude','Akurasi (meter)','Google Maps','Lokasi Alamat','File Drive']);
  const manual={};
  if(manualSheet.getLastRow()>1){
    const rows=manualSheet.getRange(2,1,manualSheet.getLastRow()-1,7).getValues();
    rows.forEach(r=>{if(normalizeDate_(r[0])===date&&r[1]) manual[String(r[1])]={date:String(r[0]),nisn:String(r[1]),name:String(r[2]||''),status:String(r[4]||''),keterangan:String(r[4]||''),timestamp:String(r[5]||''),time:String(r[5]||'')};});
  }
  const face=[];
  if(faceSheet.getLastRow()>1){
    const rows=faceSheet.getRange(2,1,faceSheet.getLastRow()-1,11).getValues();
    rows.forEach(r=>{if(normalizeDate_(r[1])===date&&r[3]) face.push({date:String(r[1]),time:String(r[2]||''),nisn:String(r[3]),name:String(r[4]||''),latitude:String(r[5]||''),longitude:String(r[6]||''),accuracy:String(r[7]||''),mapsUrl:String(r[8]||''),locationText:String(r[9]||''),url:String(r[10]||'')});});
  }
  const obj={ok:true,date,manual,face};
  const cb=p.callback;
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) return ContentService.createTextOutput(cb+'('+JSON.stringify(obj)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return json_(obj);
}

function doGet(e){
  const p=e.parameter||{};
  if(p.action==='saveManualAttendance') return jsonp_(saveManual_(p),p.callback);
  if(p.action==='saveBarcodeAttendance') return jsonp_(saveBarcodeAttendance_(p),p.callback);
  if(p.action==='saveManualAttendanceBatch') return jsonp_(saveManualBatch_(p),p.callback);
  if(p.action==='deleteManualAttendance') return jsonp_(deleteManual_(p),p.callback);
  if(p.action==='attendanceSummary') return attendanceSummary_(p);
  if(p.action==='attendanceStatus') return attendanceStatus_(p);
  if(p.action==='testConnection') return jsonp_(testConnection_(),p.callback);
  if(p.action==='listFaceAttendance'){
    const date=clean_(p.date), records=[], files=folder_().getFiles();
    while(files.hasNext()){
      const f=files.next(), d=f.getDescription()||'';
      try{const m=JSON.parse(d);if(m.type==='face-attendance'&&(!date||m.date===date)) records.push({nisn:m.nisn,name:m.name,time:m.time,date:m.date,latitude:m.latitude||'',longitude:m.longitude||'',accuracy:m.accuracy||'',mapsUrl:m.mapsUrl||'',locationText:m.locationText||'',id:f.getId(),url:f.getUrl(),thumbnail:'https://drive.google.com/thumbnail?id='+encodeURIComponent(f.getId())+'&sz=w700'});}catch(_){}
    }
    records.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const obj={ok:true,records}, cb=p.callback;
    if(cb&&/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) return ContentService.createTextOutput(cb+'('+JSON.stringify(obj)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return json_(obj);
  }
  return json_({ok:true,message:'XI TKJ 1 attendance backend running'});
}
