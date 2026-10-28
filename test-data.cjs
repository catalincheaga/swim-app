const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const M=require('./data-model.js');
const video='https://youtu.be/aqz-KE-bpKQ?t=37';
const original=M.normalize({version:1,name:'Test',demo:false,results:[{id:'race-1',date:'2024-12-25',meet:'Cupa & Junior',city:'București',stroke:'Liber',distance:50,pool:25,time:3842,place:2,notes:'Start bun',team:'auto',youtube:video}]});
assert.equal(original.version,2);assert.equal(original.meets.length,1);assert.equal(original.results[0].meetId,original.meets[0].id);assert.equal(M.teamKey(original.results[0],original),'euro');
assert.deepEqual(M.fromTables(M.tables(original)),original);
const noRaces=M.normalize({...original,results:[]});assert.equal(M.fromTables(M.tables(noRaces)).meets.length,1,'A saved meet survives deleting its final race.');
const t=M.tables(original);t.configs.find(r=>r[0]==='club'&&r[1]==='euro')[4]='#123456';t.configs.find(r=>r[0]==='inotator'&&r[1]==='nume')[7]='Schimbat în Sheet';t.concursuri[1][1]='Concurs redenumit';t.date[1][6]='01:02.35';
const changed=M.fromTables(t);assert.equal(changed.name,'Schimbat în Sheet');assert.equal(changed.clubs[0].color,'#123456');assert.equal(changed.results[0].meet,'Concurs redenumit');assert.equal(changed.results[0].time,6235);assert.equal(changed.results[0].youtube,video);
for(const bad of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ','https://evil.test/youtube.com/aqz-KE-bpKQ','http://youtu.be/aqz-KE-bpKQ','https://youtube.com@evil.test/watch?v=aqz-KE-bpKQ','https://youtu.be/not-video','https://youtu.be:443/aqz-KE-bpKQ'])assert.equal(M.youtube(bad),'');
for(const good of [video,'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=37s','https://www.youtube.com/shorts/aqz-KE-bpKQ','https://youtube.com/live/aqz-KE-bpKQ?si=abc'])assert.ok(M.youtube(good));
assert.throws(()=>M.normalize({...original,results:[{...original.results[0],youtube:'javascript:alert(1)'}]}));
assert.throws(()=>M.normalize({...original,clubs:original.clubs.map(c=>({...c,color:'red;display:none'}))}));
assert.throws(()=>M.normalize({...original,meets:[...original.meets,{...original.meets[0],id:'duplicate'}]}));
assert.throws(()=>M.normalize({...original,results:[{...original.results[0],meetId:'missing'}]}));
assert.throws(()=>M.normalize({...original,clubs:original.clubs.map(c=>({...c,startDate:'',endDate:''}))}));
const foreign=M.tables(original);foreign.configs[0][0]='Wrong header';assert.throws(()=>M.fromTables(foreign));
// Apps Script and browser use the exact same schema. Test with an in-memory Sheets API.
assert.equal(fs.readFileSync(__dirname+'/GoogleAppsScript.gs','utf8'),fs.readFileSync(__dirname+'/data-model.js','utf8')+fs.readFileSync(__dirname+'/sheets-api.gs','utf8'));
class Range{constructor(sheet,row,col,n=1,w=1){Object.assign(this,{sheet,row,col,n,w})}getValues(){return Array.from({length:this.n},(_,r)=>Array.from({length:this.w},(_,c)=>this.sheet.rows[this.row+r-1]?.[this.col+c-1]??''))}setValues(rows){if(this.sheet.failWrite){this.sheet.failWrite=false;throw Error('Simulated write failure')}rows.forEach((row,r)=>row.forEach((v,c)=>{this.sheet.rows[this.row+r-1]??=[];this.sheet.rows[this.row+r-1][this.col+c-1]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v}));return this}clearContent(){for(let r=this.row-1;r<this.row+this.n-1;r++)for(let c=this.col-1;c<this.col+this.w-1;c++)if(this.sheet.rows[r])this.sheet.rows[r][c]='';return this}setNumberFormat(){return this}setBackground(){return this}setFontColor(){return this}setFontWeight(){return this}}
class Sheet{constructor(name){this.name=name;this.rows=[];this.maxRows=1000;this.maxCols=26}getLastRow(){for(let i=this.rows.length-1;i>=0;i--)if(this.rows[i].some(x=>x!==''&&x!==null))return i+1;return 0}getRange(...args){return new Range(this,...args)}getMaxRows(){return this.maxRows}getMaxColumns(){return this.maxCols}insertRowsAfter(_,n){this.maxRows+=n}insertColumnsAfter(_,n){this.maxCols+=n}setFrozenRows(){}setColumnWidths(){}setColumnWidth(){}}
const book={sheets:{},getSheetByName(name){return this.sheets[name]||null},insertSheet(name){return this.sheets[name]=new Sheet(name)},deleteSheet(sheet){delete this.sheets[sheet.name]},getSpreadsheetTimeZone(){return 'Europe/Bucharest'}};
let acquired=false,token='private-test-token';const ctx=vm.createContext({console,SpreadsheetApp:{openById(){return book},flush(){}},PropertiesService:{getScriptProperties(){return {getProperty(key){return key==='LANE_SHEET_ID'?'test-sheet':token}}}},LockService:{getScriptLock(){return {waitLock(){assert.equal(acquired,false);acquired=true},hasLock(){return acquired},releaseLock(){acquired=false}}}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest(_,text){return [...crypto.createHash('sha256').update(text).digest()]}},ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return {text,setMimeType(){return this}}}}});
vm.runInContext(fs.readFileSync(__dirname+'/GoogleAppsScript.gs','utf8'),ctx);
const exec=s=>vm.runInContext(s,ctx),get=()=>JSON.parse(exec("doGet({parameter:{token:'private-test-token'}}).text"));
assert.equal(get().data,null);assert.equal(get().schema,2);assert.equal(JSON.parse(exec("doGet({parameter:{token:'wrong'}}).text")).ok,false);
exec('setupLane()');assert.deepEqual(Object.keys(book.sheets).sort(),['concursuri','configs','date']);assert.equal(get().data.results.length,0);
const post=(state,revision)=>{ctx.req={postData:{contents:JSON.stringify({token,data:state,revision})}};return JSON.parse(exec('doPost(req).text'))};
let rev=get().revision;assert.equal(post(original,rev).ok,true);assert.equal(get().data.results[0].youtube,video);
assert.equal(post({...original,name:'Overwrite'},rev).ok,false,'Stale revision must fail.');
rev=get().revision;book.sheets.configs.rows.find(r=>r[0]==='club'&&r[1]==='euro')[4]='#345678';assert.notEqual(get().revision,rev);assert.equal(post(original,rev).ok,false,'Manual spreadsheet edits must invalidate the revision.');
rev=get().revision;const before=JSON.stringify(get().data);book.sheets.date.failWrite=true;assert.equal(post({...original,name:'Must rollback'},rev).ok,false);assert.equal(JSON.stringify(get().data),before,'A failed multi-tab save restores previous values.');
assert.equal(post({...original,demo:true},get().revision).ok,false);
// Legacy _LANE migration is non-destructive and validates before creating tabs.
book.sheets={};const legacy=book.insertSheet('_LANE');legacy.rows=[['Legacy'],[JSON.stringify({revision:3,data:{...original,version:1}})]];assert.equal(get().legacy,true);exec('setupLane()');assert.ok(book.sheets._LANE);assert.equal(get().data.results[0].time,3842);assert.equal(get().data.meets.length,1);
// Test the Apps Script URL parser (no URL global) against the common valid forms.
ctx.links=[video,'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=37s','https://www.youtube.com/shorts/aqz-KE-bpKQ'];assert.equal(exec('links.every(s=>LaneModel.youtube(s)===s)'),true);
console.log('Schema + API OK: migrations, meets, YouTube, sheet edits, conflicts, rollback and access key.');
// Historical classifications and special events survive a full Sheets round trip.
for(const [stroke,place] of [['Liber','Descalificat'],['Spate','24 / 58'],['Cu placa',''],['Ștafetă liber',7],['Ștafetă mixt',4]]){
  const historical=M.normalize({...original,results:[{...original.results[0],stroke,place}]});
  assert.deepEqual(M.fromTables(M.tables(historical)),historical);
}
assert.throws(()=>M.normalize({...original,results:[{...original.results[0],place:'<img onerror=1>'}]}));
console.log('Istoric OK: descalificări, clasare / participanți, placă, ștafetă și validare.');
