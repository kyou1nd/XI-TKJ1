/*
 XI TKJ 1 — Google Drive Face Attendance
 No database is used. Photos are stored directly as files in one Drive folder.
 This Google Apps Script is the small bridge required because a static frontend
 cannot write directly into a user's private Google Drive.
*/
const FOLDER_ID = '1Flcbrukb1Ln2x-uhDhUyWUc0eHp8EZoQ';

function folder_(){
  if(FOLDER_ID === 'PASTE_GOOGLE_DRIVE_FOLDER_ID_HERE') throw new Error('Set FOLDER_ID first.');
  return DriveApp.getFolderById(FOLDER_ID);
}
function clean_(s){ return String(s||'').replace(/[\\/:*?"<>|#%{}~&]/g,'_').slice(0,90); }

function doPost(e){
  try{
    const p=e.parameter||{};
    if(p.action!=='uploadFaceAttendance') return json_({ok:false,error:'Unknown action'});
    const date=clean_(p.date), nisn=clean_(p.nisn), name=clean_(p.name), time=clean_(p.time);
    if(!date||!nisn||!p.imageData) return json_({ok:false,error:'Data foto tidak lengkap.'});
    const filename='XI_TKJ1_FACE_'+date+'_'+nisn+'.jpg';
    const folder=folder_();
    const old=folder.getFilesByName(filename);
    if(old.hasNext()){
      const f=old.next();
      return json_({ok:true,duplicate:true,id:f.getId(),url:f.getUrl()});
    }
    const bytes=Utilities.base64Decode(String(p.imageData).replace(/^data:image\/\w+;base64,/,''));
    const blob=Utilities.newBlob(bytes,'image/jpeg',filename);
    const file=folder.createFile(blob);
    file.setDescription(JSON.stringify({type:'face-attendance',date,nisn,name,time}));
    return json_({ok:true,id:file.getId(),url:file.getUrl()});
  }catch(err){ return json_({ok:false,error:String(err)}); }
}

function doGet(e){
  const p=e.parameter||{}, date=clean_(p.date), callback=p.callback;
  let records=[];
  try{
    const folder=folder_(), files=folder.getFiles();
    while(files.hasNext()){
      const f=files.next();
      const desc=f.getDescription()||'';
      if(!desc) continue;
      try{
        const m=JSON.parse(desc);
        if(m.type==='face-attendance' && (!date || m.date===date)){
          records.push({nisn:m.nisn,name:m.name,time:m.time,date:m.date,id:f.getId(),
            url:f.getUrl(),thumbnail:'https://drive.google.com/thumbnail?id='+encodeURIComponent(f.getId())+'&sz=w700'});
        }
      }catch(_){}
    }
  }catch(err){ return output_({ok:false,error:String(err),records:[]},callback); }
  records.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  return output_({ok:true,records},callback);
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function output_(obj,callback){
  const json=JSON.stringify(obj);
  if(callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)){
    return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
