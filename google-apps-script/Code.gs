/*
 XI TKJ 1 — Backend Google Drive + Google Sheets
 Website tetap di GitHub Pages. Apps Script hanya menerima data absensi.
*/
const FOLDER_ID = '1Flcbrukb1Ln2x-uhDhUyWUc0eHp8EZoQ';
const SPREADSHEET_ID = '1tgPeu6Acxi0r6z3SyYQ4cbUaMq5sg_eDCA8SIKvu6FA';
const MANUAL_SHEET = 'Absensi Manual';
const FACE_SHEET = 'Absensi Foto Muka';

function folder_(){ return DriveApp.getFolderById(FOLDER_ID); }
function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function clean_(s){ return String(s||'').replace(/[\\/:*?"<>|#%{}~&]/g,'_').slice(0,120); }
function sheet_(name, headers){
  const ss=ss_(); let sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e){
  try{
    const p=e.parameter||{}, action=p.action||'';
    if(action==='uploadFaceAttendance') return saveFace_(p);
    if(action==='saveManualAttendance') return saveManual_(p);
    if(action==='saveManualAttendanceBatch') return saveManualBatch_(p);
    return json_({ok:false,error:'Unknown action'});
  }catch(err){ return json_({ok:false,error:String(err)}); }
}

function saveManual_(p){
  const date=clean_(p.date), nisn=clean_(p.nisn), name=clean_(p.name), status=clean_(p.status);
  if(!date||!nisn||!name||!status) return json_({ok:false,error:'Data absensi manual tidak lengkap.'});
  const sh=sheet_(MANUAL_SHEET,['Timestamp','Tanggal','NISN','Nama','Kelas','Status','Keterangan']);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,7).getValues():[];
  let found=false;
  rows.forEach((r,i)=>{
    if(String(r[1])===date && String(r[2])===nisn){
      sh.getRange(i+2,1,1,7).setValues([[new Date(),date,nisn,name,'XI TKJ 1',status,clean_(p.keterangan)]]);
      found=true;
    }
  });
  if(!found) sh.appendRow([new Date(),date,nisn,name,'XI TKJ 1',status,clean_(p.keterangan)]);
  return json_({ok:true});
}

function saveManualBatch_(p){
  const list=JSON.parse(p.records||'[]');
  list.forEach(r=>saveManual_({date:r.date,nisn:r.nisn,name:r.name,status:r.status,keterangan:r.keterangan||''}));
  return json_({ok:true,count:list.length});
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

function doGet(e){
  const p=e.parameter||{};
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
