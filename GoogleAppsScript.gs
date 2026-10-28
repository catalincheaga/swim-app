/* Shared schema: browser + Google Apps Script. Times are integer hundredths. */
var LaneModel = (function () {
  'use strict';
  const CONFIG_HEADERS=['tip','id','nume','prescurtare','culoare','de_la','pana_la','valoare'];
  const MEET_HEADERS=['id','concurs','data','localitate','bazin_m'];
  const RESULT_HEADERS=['id','concurs_id','data','distanta_m','procedeu','bazin_m','timp','loc','club_id','youtube','notite'];
  const DEFAULT_TRANSFER='2024-12-26';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const fail=message=>{throw new Error(message)};
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
  function previousDate(s){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}
  function defaults(transfer){return [{id:'euro',name:'Euro Swimming Club București',short:'EURO SWIMMING CLUB',color:'#b29220',startDate:'',endDate:previousDate(transfer||DEFAULT_TRANSFER)},{id:'atack',name:'Atack Team',short:'ATACK TEAM',color:'#db4432',startDate:transfer||DEFAULT_TRANSFER,endDate:''}]}
  function text(v,max,label,optional){if(typeof v!=='string'||v.length>max||(!optional&&!v.trim()))fail(label+' invalid.');return v.trim()}
  function cleanImportedNotes(value){const lines=value.split(/\r?\n/),generated=/^\s*(?:Diferență în tabelul furnizat|Diferență din tabelul original):\s*[⬇⬆➡↘↗→↑↓\uFE0F\s+−-]*\d+(?:[.,]\d+)?\s*$/u;return lines.some(line=>generated.test(line))?lines.filter(line=>!generated.test(line)).join('\n').trim():value}
  function parseTime(s){const m=String(s).trim().replace(',','.').match(/^(?:(\d{1,3}):)?([0-5]?\d)(?:\.(\d{1,2}))?$/);return m?Number(m[1]||0)*6000+Number(m[2])*100+Number((m[3]||'').padEnd(2,'0')):NaN}
  function formatTime(n){return `${Math.floor(n/6000).toString().padStart(2,'0')}:${String(Math.floor(n/100)%60).padStart(2,'0')}.${String(n%100).padStart(2,'0')}`}
  function youtubePortable(value){if(!value||typeof value!=='string'||value.length>2000)return '';const match=value.match(/^https:\/\/(youtu\.be|(?:www\.|m\.|music\.)?youtube\.com)(\/[^\s#]*)(?:#[^\s]*)?$/i);if(!match)return '';const path=match[2],id=match[1].toLowerCase()==='youtu.be'?path.slice(1).split('?')[0]:(path.match(/^\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]+)(?:&|$)/)||path.match(/^\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]+)(?:\/?(?:\?|$))/))?.[1];return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?value:''}
  function key(m){return [m.name.trim().toLocaleLowerCase(),m.date,m.city.trim().toLocaleLowerCase()].join('|')}
  function teamKey(r,s){if(r.team&&r.team!=='auto')return r.team;return s.clubs.find(c=>(!c.startDate||r.date>=c.startDate)&&(!c.endDate||r.date<=c.endDate))?.id||s.currentClub}
  function normalize(input){
    if(!input||![1,2].includes(input.version)||!Array.isArray(input.results)||input.results.length>10000)fail('Fișier de jurnal invalid.');
    const s=clone(input);s.version=2;s.name=text(s.name,60,'Numele înotătorului');s.demo=!!s.demo;s.demoEraVersion=1;
    s.transferDate=s.transferDate||DEFAULT_TRANSFER;if(!validDate(s.transferDate))fail('Data transferului este invalidă.');
    s.swimmer=s.swimmer||{};s.swimmer={birthDate:s.swimmer.birthDate||'',gender:s.swimmer.gender||'',registrationId:s.swimmer.registrationId||''};
    if(s.swimmer.birthDate&&!validDate(s.swimmer.birthDate))fail('Data nașterii este invalidă.');
    text(s.swimmer.gender,40,'Sex',true);text(s.swimmer.registrationId,80,'Legitimație',true);
    s.clubs=s.clubs||defaults(s.transferDate);if(!Array.isArray(s.clubs)||!s.clubs.length||s.clubs.length>30)fail('Lista cluburilor este invalidă.');
    const clubIds=new Set();s.clubs=s.clubs.map(c=>{if(!c||!/^[a-z][a-z0-9_-]{0,39}$/.test(c.id)||clubIds.has(c.id))fail('ID de club invalid sau duplicat.');clubIds.add(c.id);const club={id:c.id,name:text(c.name,100,'Nume club'),short:text(c.short,50,'Prescurtare club'),color:c.color,startDate:c.startDate||'',endDate:c.endDate||''};if(!/^#[a-fA-F0-9]{6}$/.test(club.color||''))fail('Culoarea clubului trebuie să fie #RRGGBB.');if(club.startDate&&!validDate(club.startDate)||club.endDate&&!validDate(club.endDate)||club.startDate&&club.endDate&&club.startDate>club.endDate)fail('Perioada clubului este invalidă.');return club});
    for(let i=0;i<s.clubs.length;i++)for(let j=i+1;j<s.clubs.length;j++){const a=s.clubs[i],b=s.clubs[j];if((a.startDate||'0000')<=(b.endDate||'9999')&&(b.startDate||'0000')<=(a.endDate||'9999'))fail('Perioadele cluburilor se suprapun.');}
    s.currentClub=s.currentClub||s.clubs.find(c=>!c.endDate)?.id||s.clubs.at(-1).id;if(!clubIds.has(s.currentClub))fail('Clubul actual nu există în configs.');
    s.meets=s.meets||[];if(!Array.isArray(s.meets)||s.meets.length>5000)fail('Lista concursurilor este invalidă.');const meetIds=new Set(),meetKeys=new Set();
    function addMeet(m){if(!m||typeof m.id!=='string'||!m.id||m.id.length>100||meetIds.has(m.id))fail('ID de concurs invalid sau duplicat.');const meet={id:m.id,name:text(m.name,100,'Nume concurs'),date:m.date,city:text(m.city||'',80,'Localitate',true),pool:Number(m.pool)};if(!validDate(meet.date)||![25,50].includes(meet.pool))fail('Data sau bazinul concursului este invalid.');if(meetKeys.has(key(meet)))fail('Același concurs este definit de două ori.');meetKeys.add(key(meet));meetIds.add(meet.id);return meet}
    s.meets=s.meets.map(addMeet);const ids=new Set();s.results=s.results.map((r,index)=>{
      if(!r||typeof r.id!=='string'||!r.id||r.id.length>100||ids.has(r.id))fail('ID de rezultat invalid sau duplicat.');ids.add(r.id);
      if(r.team&&r.team!=='auto'&&!clubIds.has(r.team))fail('Echipa rezultatului nu există în configs.');
      if(!validDate(r.date)||!['Liber','Spate','Bras','Fluture','Mixt','Cu placa','Ștafetă liber','Ștafetă mixt'].includes(r.stroke)||![25,50,100,200,400,800,1500].includes(r.distance)||![25,50].includes(r.pool)||!Number.isInteger(r.time)||r.time<=0||r.time>5999999||!(r.place===''||r.place==null||Number.isInteger(r.place)&&r.place>0&&r.place<10000||typeof r.place==='string'&&/^(Descalificat|[1-9][0-9]{0,3} \/ [1-9][0-9]{0,3})$/.test(r.place)))fail('Un rezultat are date invalide.');
      let meet;if(r.meetId){meet=s.meets.find(m=>m.id===r.meetId);if(!meet)fail('Concursul rezultatului nu există.')}else {const candidate={name:text(r.meet,100,'Nume concurs'),date:r.date,city:text(r.city||'',80,'Localitate',true)};meet=s.meets.find(m=>key(m)===key(candidate));if(!meet){meet=addMeet({id:'legacy-'+r.id,...candidate,pool:r.pool});s.meets.push(meet)}}
      const video=r.youtube||'';if(typeof video!=='string'||video.length>2000||video&&!youtubePortable(video))fail('Link YouTube invalid. Folosește https://youtube.com/watch?v=… sau https://youtu.be/…');
      return {id:r.id,meetId:meet.id,meet:meet.name,city:meet.city,date:r.date,stroke:r.stroke,distance:r.distance,pool:r.pool,time:r.time,place:r.place||'',notes:cleanImportedNotes(text(r.notes||'',500,'Notițe',true)),team:r.team||'auto',youtube:video};
    });if(s.meets.length>5000)fail('Prea multe concursuri.');return s;
  }
  function empty(){return normalize({version:2,name:'Înotător',demo:false,results:[],meets:[]})}
  function tables(input){const s=normalize(input);const configs=[CONFIG_HEADERS.slice(),['inotator','nume','','','','','',s.name],['inotator','data_nasterii','','','','','',s.swimmer.birthDate],['inotator','sex','','','','','',s.swimmer.gender],['inotator','legitimatie','','','','','',s.swimmer.registrationId],['inotator','club_actual','','','','','',s.currentClub],...s.clubs.map(c=>['club',c.id,c.name,c.short,c.color,c.startDate,c.endDate,''])];return {configs,concursuri:[MEET_HEADERS.slice(),...s.meets.map(m=>[m.id,m.name,m.date,m.city,m.pool])],date:[RESULT_HEADERS.slice(),...s.results.map(r=>[r.id,r.meetId,r.date,r.distance,r.stroke,r.pool,formatTime(r.time),r.place,r.team,r.youtube,r.notes])]}}
  function records(rows,headers,label){if(!Array.isArray(rows)||!rows.length||JSON.stringify(rows[0])!==JSON.stringify(headers))fail('Antet invalid în foaia '+label+'.');return rows.slice(1).filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])))}
  function fromTables(t){const cfg=records(t.configs,CONFIG_HEADERS,'configs'),meets=records(t.concursuri,MEET_HEADERS,'concursuri'),races=records(t.date,RESULT_HEADERS,'date');const swimmer={},seen=new Set();cfg.forEach(r=>{const k=r.tip+'|'+r.id;if(seen.has(k))fail('ID duplicat în configs.');seen.add(k);if(r.tip==='inotator'){if(!['nume','data_nasterii','sex','legitimatie','club_actual'].includes(String(r.id)))fail('Câmp de înotător necunoscut în configs.');swimmer[r.id]=String(r.valoare);}else if(r.tip!=='club')fail('Tip necunoscut în configs.');});if(!swimmer.nume||!swimmer.nume.trim()||!swimmer.club_actual)fail('Completează numele și club_actual în configs.');const clubs=cfg.filter(r=>r.tip==='club').map(r=>({id:String(r.id),name:String(r.nume),short:String(r.prescurtare),color:String(r.culoare),startDate:String(r.de_la),endDate:String(r.pana_la)}));return normalize({version:2,demo:false,name:swimmer.nume||'Înotător',currentClub:swimmer.club_actual,transferDate:clubs.find(c=>c.id==='atack')?.startDate||DEFAULT_TRANSFER,swimmer:{birthDate:swimmer.data_nasterii||'',gender:swimmer.sex||'',registrationId:swimmer.legitimatie||''},clubs,meets:meets.map(m=>({id:String(m.id),name:String(m.concurs),date:String(m.data),city:String(m.localitate),pool:Number(m.bazin_m)})),results:races.map(r=>({id:String(r.id),meetId:String(r.concurs_id),date:String(r.data),distance:Number(r.distanta_m),stroke:String(r.procedeu),pool:Number(r.bazin_m),time:parseTime(r.timp),place:r.loc===''?'':/^\d+$/.test(String(r.loc))?Number(r.loc):String(r.loc),team:String(r.club_id)||'auto',youtube:String(r.youtube),notes:String(r.notite)}))})}
  return {CONFIG_HEADERS,MEET_HEADERS,RESULT_HEADERS,DEFAULT_TRANSFER,defaults,validDate,previousDate,parseTime,formatTime,cleanImportedNotes,youtube:youtubePortable,key,teamKey,normalize,empty,tables,fromTables};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LaneModel;
/** LANE Sheets API. Bundled with data-model.js into GoogleAppsScript.gs.
 * Bound to the dedicated Google Sheet. Set Script Property LANE_TOKEN.
 * Deploy as Web App: Execute as Me, Anyone. Never publish the Sheet itself.
 */
function reply_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function authorized_(token) { const expected = PropertiesService.getScriptProperties().getProperty('LANE_TOKEN'); return !!expected && token === expected; }
function book_() { const id = PropertiesService.getScriptProperties().getProperty('LANE_SHEET_ID'); if (!id) throw new Error('Rulează setupLane din editorul Apps Script al documentului.'); return SpreadsheetApp.openById(id); }
function digest_(value) { return 'v2:' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join(''); }
function rows_(ss, name, width) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || !sheet.getLastRow()) return [];
  if (sheet.getLastRow() > 15001) throw new Error('Foaia ' + name + ' are prea multe rânduri.');
  return sheet.getRange(1, 1, sheet.getLastRow(), width).getValues().map(row => row.map(v => v instanceof Date ? Utilities.formatDate(v, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd') : v));
}
function read_(ss) {
  ss = ss || book_();
  const tables = {configs: rows_(ss, 'configs', 8), concursuri: rows_(ss, 'concursuri', 5), date: rows_(ss, 'date', 11)};
  if (Object.values(tables).some(rows => rows.length)) return {data: LaneModel.fromTables(tables), revision: digest_(tables)};
  const legacy = ss.getSheetByName('_LANE');
  if (legacy && legacy.getLastRow() > 1) {
    const snapshot = JSON.parse(legacy.getRange(2, 1, legacy.getLastRow() - 1, 1).getValues().map(r => r[0]).join(''));
    return {data: LaneModel.normalize(snapshot.data), revision: digest_({legacy: snapshot}), legacy: true};
  }
  return {data: null, revision: digest_(tables)};
}
function doGet(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!authorized_(e && e.parameter && e.parameter.token)) throw new Error('Cheie de acces incorectă.');
    lock.waitLock(15000);
    return reply_(Object.assign({ok: true, schema: 2}, read_()));
  } catch (err) { return reply_({ok: false, error: err.message}); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
function safeText_(value) { const s = String(value == null ? '' : value); return /^[=+@-]/.test(s) ? "'" + s : s; }
function put_(ss, name, rows) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const width = rows[0].length;
  if (sheet.getMaxRows() < rows.length) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length - sheet.getMaxRows());
  if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  // Plain-text columns preserve ISO dates, swim times and IDs as entered.
  sheet.getRange(1, 1, sheet.getMaxRows(), width).setNumberFormat('@');
  if (sheet.getLastRow()) sheet.getRange(1, 1, sheet.getLastRow(), width).clearContent();
  sheet.getRange(1, 1, rows.length, width).setValues(rows.map(row => row.map(safeText_)));
  sheet.getRange(1, 1, 1, width).setBackground('#242527').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, width, 140);
  if (name === 'configs') { sheet.setColumnWidth(3, 260); sheet.setColumnWidth(8, 210); }
  if (name === 'concursuri') sheet.setColumnWidth(2, 260);
  if (name === 'date') { sheet.setColumnWidth(10, 300); sheet.setColumnWidth(11, 260); }
}
function write_(ss, tables) {
  const names = ['configs', 'concursuri', 'date'];
  const previous = names.map(name => ({name: name, existed: !!ss.getSheetByName(name), rows: rows_(ss, name, tables[name][0].length)}));
  try {
    names.forEach(name => put_(ss, name, tables[name]));
    SpreadsheetApp.flush();
  } catch (err) {
    // Restore data if a multi-tab write fails. Do not erase legacy tabs.
    let restored = true;
    previous.forEach(saved => { try {
      const sheet = ss.getSheetByName(saved.name);
      if (!sheet) return;
      if (!saved.existed) ss.deleteSheet(sheet);
      else { if (sheet.getLastRow()) sheet.getRange(1, 1, sheet.getLastRow(), tables[saved.name][0].length).clearContent(); if (saved.rows.length) sheet.getRange(1, 1, saved.rows.length, saved.rows[0].length).setValues(saved.rows.map(row => row.map(safeText_))); }
    } catch (restoreErr) { restored = false; } });
    SpreadsheetApp.flush();
    throw new Error(restored ? 'Salvarea a eșuat; datele anterioare au fost restaurate. ' + err.message : 'Salvare incompletă. Verifică istoricul versiunilor Google Sheets înainte să continui.');
  }
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || e.postData.contents.length > 5000000) throw new Error('Cerere invalidă sau prea mare.');
    const request = JSON.parse(e.postData.contents);
    if (!authorized_(request.token)) throw new Error('Cheie de acces incorectă.');
    const data = LaneModel.normalize(request.data);
    if (data.demo) throw new Error('Datele demonstrative nu pot fi trimise în Sheet.');
    lock.waitLock(15000);
    const ss = book_(), before = read_(ss);
    if (request.revision !== before.revision) throw new Error('Sheet-ul a fost modificat între timp. Exportă jurnalul local, apoi descarcă versiunea din Sheet.');
    write_(ss, LaneModel.tables(data));
    return reply_({ok: true, schema: 2, revision: read_(ss).revision});
  } catch (err) { return reply_({ok: false, error: err.message}); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
/** Run once from the Apps Script editor. Existing data is preserved.
 * A previous _LANE journal is migrated, with original tabs retained.
 */
function setupLane() {
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties.getProperty('LANE_SHEET_ID')) { const bound = SpreadsheetApp.getActiveSpreadsheet(); if (!bound) throw new Error('Deschide Apps Script din Extensii în documentul Google Sheets.'); properties.setProperty('LANE_SHEET_ID', bound.getId()); }
    const ss = book_(), before = read_(ss);
    if (before.data && !before.legacy) return 'Foile sunt deja configurate. Nu s-a modificat nimic.';
    write_(ss, LaneModel.tables(before.data || LaneModel.empty()));
    return before.legacy ? 'Jurnal migrat în configs / concursuri / date. Foile vechi au fost păstrate.' : 'Au fost create configs, concursuri și date. Completează numele în configs.';
  } finally { lock.releaseLock(); }
}
