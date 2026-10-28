const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map;const node=()=>({close(){},showModal(){},textContent:'',innerHTML:'',classList:{toggle(){},add(){},remove(){}},style:{},elements:{youtube:{value:''}},value:''});
const context=vm.createContext({console,crypto:require('node:crypto').webcrypto,localStorage:{getItem(){return null},setItem(){}},document:{querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(){return []}},setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(__dirname+'/data-model.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('state.results.length'),0);
assert.equal(run('state.demo'),false);
vm.runInContext("function demo(){const races=[['2024-02-14','Cupa de Iarn\u0103','Bra\u0219ov',50,'Liber',25,4286,6],['2024-03-21','Cupa Prim\u0103verii','Pite\u0219ti',50,'Liber',25,4132,5],['2024-05-09','Memorialul Micilor Campioni','Bra\u0219ov',50,'Liber',25,4021,4],['2026-06-13','Cupa de Var\u0103','Bucure\u0219ti',50,'Liber',25,3956,3],['2026-09-19','Cupa de Toamn\u0103','Bra\u0219ov',50,'Liber',25,3891,2],['2026-10-24','Cupa Aqua Junior','Otopeni',50,'Liber',25,3742,2],['2026-10-24','Cupa Aqua Junior','Otopeni',100,'Liber',25,8245,3],['2026-09-19','Cupa de Toamn\u0103','Bra\u0219ov',100,'Liber',25,8562,4],['2026-10-24','Cupa Aqua Junior','Otopeni',50,'Spate',25,4538,1],['2026-06-13','Cupa de Var\u0103','Bucure\u0219ti',50,'Spate',25,4782,3],['2026-10-24','Cupa Aqua Junior','Otopeni',50,'Bras',25,5126,4],['2024-05-09','Memorialul Micilor Campioni','Bra\u0219ov',50,'Bras',25,5451,6]];return {version:1,demo:true,name:'Alex',transferDate:DEFAULT_TRANSFER,results:races.map(([date,meet,city,distance,stroke,pool,time,place])=>({id:uid(),date,meet,city,distance,stroke,pool,time,place,notes:''}))}}",context);
run('state=LaneModel.normalize(demo())');
assert.equal(run("parseTime('1:02.35')"),6235);
assert.equal(run("parseTime('38,4')"),3840);
assert.equal(run("fmt(6235)"),'01:02.35');
assert.ok(Number.isNaN(run("parseTime('1:75.00')")));
assert.equal(run('state.results.length'),12);
assert.equal(run('bests().length'),4);
assert.equal(run('Math.min(...state.results.filter(r=>r.stroke==="Liber"&&r.distance===50).map(r=>r.time))'),3742);
assert.throws(()=>run('validate({...state,results:[{...state.results[0],time:-1}]})'));
assert.throws(()=>run('validate({...state,results:[state.results[0],state.results[0]]})'));
run('state.results.push({...state.results[0],id:"other-pool",pool:50,time:9999})');
assert.equal(run('bests().length'),5);
assert.equal(run('isPB(state.results.at(-1))'),true);
assert.equal(run('validate(state).results.length'),13);
assert.equal(run("esc('<img onerror=1>')"),'&lt;img onerror=1&gt;');
run('state={version:1,name:"Test",demo:false,results:[]}');
assert.ok(run('overview()').includes('Nicio cursă încă'));
console.log('12 verificări OK: timpi, recorduri, separare bazine, import, escaping și jurnal gol.');
// Team identity follows the transfer boundary and keeps per-race exceptions.
assert.equal(run("teamKey({date:'2024-12-25'})"),'euro');
assert.equal(run("teamKey({date:'2024-12-26'})"),'atack');
assert.equal(run("teamKey({date:'2026-10-28',team:'euro'})"),'euro');
assert.equal(run("teamKey({date:'2023-01-01',team:'atack'})"),'atack');
assert.equal(run("previousDate('2024-12-26')"),'2024-12-25');
assert.equal(run("validate(state).transferDate"),'2024-12-26');
assert.equal(run("validDate('2024-02-30')"),false);
run("state.transferDate='2025-01-01'");
assert.equal(run("teamKey({date:'2024-12-26'})"),'euro');
assert.equal(run("teamKey({date:'2024-12-26',team:'atack'})"),'atack');
assert.equal(run("validate(state).transferDate"),'2025-01-01');
assert.throws(()=>run("validate({...state,transferDate:'not-a-date'})"));
run('state=demo()');
assert.equal(run("state.results.filter(r=>teamKey(r)==='euro').length"),4);
assert.equal(run("state.results.filter(r=>teamKey(r)==='atack').length"),8);
assert.ok(run('chart()').includes('stroke="#b29220"'));
assert.ok(run('chart()').includes('stroke="#db4432"'));
assert.throws(()=>run("validate({...state,results:[{...state.results[0],team:'unknown'}]})"));
run("teamFilter='euro'");
assert.ok(run('results()').includes('4 rezultate'));
assert.ok(!run('results()').includes('data-edit="'+run("state.results.find(r=>teamKey(r)==='atack').id")+'"'));
assert.equal(run("validate({...state,results:[{...state.results[0],team:'atack'}]}).results[0].team"),'atack');
console.log('19 verificări echipe OK: data transferului, excepții, compatibilitate backup, filtre și culori grafic.');

// Form integration: save a meet before any result, then reuse it for several races.
context.FormData=class{constructor(form){this.values=form.inputs}get(key){return this.values[key]??''}};
run('state=LaneModel.empty()');
const submit=(selector,inputs)=>nodes.get(selector).onsubmit({preventDefault(){},target:{inputs}});
submit('#meet-form',{name:'Concurs test',date:'2026-10-28',city:'București',pool:'50'});
assert.equal(run('state.meets.length'),1);assert.equal(run('state.results.length'),0);
const meetId=run('state.meets[0].id');
// The saved meet supplies its location/date/pool, hiding new-meet fields.
run("testMeetForm={elements:Object.fromEntries(['meet','city','date','pool'].map(k=>[k,{value:''}]))};populateMeetFields(testMeetForm,state.meets[0].id)");
assert.equal(run('testMeetForm.elements.city.value'),'București');
assert.equal(run('testMeetForm.elements.pool.value'),50);
assert.equal(run('testMeetForm.elements.date.value'),'2026-10-28');
assert.equal(nodes.get('#new-meet-city').style.display,'none');
assert.equal(nodes.get('#new-meet-name').style.display,'none');
assert.ok(nodes.get('#meet-choice-hint').textContent.includes('București'));
run("populateMeetFields(testMeetForm,'')");
assert.equal(nodes.get('#new-meet-city').style.display,'');
assert.equal(run('testMeetForm.elements.city.readOnly'),false);
run("state.meets[0].city='';populateMeetFields(testMeetForm,state.meets[0].id)");
assert.equal(nodes.get('#new-meet-city').style.display,'none');
assert.ok(nodes.get('#meet-choice-hint').textContent.includes('nespecificată'));
run("state.meets[0].city='București'");

submit('#result-form',{existingMeet:meetId,date:'2026-10-28',stroke:'Liber',distance:'50',pool:'50',time:'00:38.42',youtube:'https://youtu.be/aqz-KE-bpKQ?t=37'});
assert.equal(run('state.results.length'),1);assert.equal(run('state.results[0].meetId'),meetId);assert.equal(run('state.results[0].city'),'București');assert.equal(run('state.meets.length'),1);
submit('#result-form',{existingMeet:meetId,date:'2026-10-28',stroke:'Spate',distance:'50',pool:'50',time:'00:45.10'});
assert.equal(run('state.results.length'),2);assert.equal(run('state.meets.length'),1);
assert.ok(run('row(state.results[0])').includes('Vezi cursa pe YouTube'));
assert.ok(run('row(state.results[0])').includes('rel="noopener noreferrer"'));
assert.ok(!run('row(state.results[0])').includes('</a></button>'));
assert.ok(!run('row(state.results[1])').includes('race-video'));
submit('#result-form',{existingMeet:meetId,date:'2026-10-28',stroke:'Spate',distance:'50',pool:'50',time:'00:45.10',youtube:'https://evil.test/clip'});
assert.equal(run('state.results.length'),2);assert.ok(nodes.get('#form-error').textContent.includes('YouTube'));
console.log('Formulare OK: concurs independent, reutilizare, link separat și validare YouTube.');

// Opening results is read-only; videos and sharing have independent actions.
context.URL=URL;
const beforeDetails=run('JSON.stringify(state)');
run('showResult(state.results[0].id)');
const details=nodes.get('#result-details-content').innerHTML;
assert.ok(details.includes('Distribuie rezultatul'));
assert.ok(details.includes('Înregistrarea cursei'));
assert.ok(!/<(?:input|select|textarea|form)\b/.test(details));
assert.ok(!details.includes('Salvează rezultatul'));
assert.ok(!details.includes('<iframe'),'YouTube loads only after pressing play.');
assert.equal(run('JSON.stringify(state)'),beforeDetails);
assert.ok(run('row(state.results[0])').includes('data-view='));
assert.ok(!run('row(state.results[0])').includes('data-edit='));
assert.equal(run('videoEmbed(state.results[0].youtube)'),'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&start=37');
assert.equal(run("videoEmbed('https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=1m12s')"),'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&start=72');
assert.equal(run("videoEmbed('javascript:alert(1)')"),'');
const beforeHistorical=run('JSON.stringify(state)'),beforeSelected=run('selected');
// A faster disqualified swim remains visible but cannot set a record or enter a progress curve.
run(`state=LaneModel.normalize({version:2,name:'Test',results:[
{id:'valid',meet:'Test',date:'2024-01-01',distance:50,stroke:'Liber',pool:50,time:5000,place:2},
{id:'dq',meet:'Test',date:'2024-01-01',distance:50,stroke:'Liber',pool:50,time:4000,place:'Descalificat'}]});selected='50|Liber|50'`);
assert.equal(run('bests()[0].id'),'valid');
assert.equal(run('isPB(state.results[1])'),false);
assert.ok(!run('chart()').includes('00:40.00'));
assert.ok(run('row(state.results[1])').includes('Descalificat'));
assert.ok(!run('row(state.results[1])').includes('Locul Descalificat'));
console.log('Descalificări OK: vizibile în rezultate, excluse din recorduri și evoluție.');
run('state='+beforeHistorical);run('selected='+JSON.stringify(beforeSelected));
// Previous-competition comparison uses chronology and the exact event/pool, not PB.
const beforeComparison=run('JSON.stringify(state)');
run(`state=LaneModel.normalize({version:2,name:'Test',meets:[{id:'current-meet',name:'Concurs pe două zile',date:'2025-03-31',city:'',pool:50}],results:[
{id:'best-ever',date:'2024-12-01',meet:'Decembrie',stroke:'Liber',distance:50,pool:50,time:3500,place:1},
{id:'january',date:'2025-01-01',meet:'Ianuarie',stroke:'Liber',distance:50,pool:50,time:4000,place:2},
{id:'short-pool',date:'2025-02-01',meet:'Februarie scurt',stroke:'Liber',distance:50,pool:25,time:3000,place:1},
{id:'dq',date:'2025-02-02',meet:'Februarie',stroke:'Liber',distance:50,pool:50,time:2900,place:'Descalificat'},
{id:'march',date:'2025-03-01',meet:'Martie',stroke:'Liber',distance:50,pool:50,time:3800,place:1},
{id:'same-meet',meetId:'current-meet',date:'2025-03-31',stroke:'Liber',distance:50,pool:50,time:2000,place:1},
{id:'same-day',date:'2025-04-01',meet:'Alt concurs în aceeași zi',stroke:'Liber',distance:50,pool:50,time:1000,place:1},
{id:'current',meetId:'current-meet',date:'2025-04-01',stroke:'Liber',distance:50,pool:50,time:3900,place:1},
{id:'future',date:'2025-05-01',meet:'Mai',stroke:'Liber',distance:50,pool:50,time:1000,place:1}]})`);
assert.equal(run("raceComparison(state.results.find(r=>r.id==='current')).previous.id"),'march');
assert.equal(run("raceComparison(state.results.find(r=>r.id==='current')).delta"),100);
assert.equal(run("comparisonText(raceComparison(state.results.find(r=>r.id==='current')))"),'+1 sec mai lent');
assert.equal(run("raceComparison(state.results.find(r=>r.id==='best-ever'))"),null);
assert.equal(run("raceComparison(state.results.find(r=>r.id==='dq'))"),null);
assert.equal(run("raceComparison({...state.results.find(r=>r.id==='current'),date:'2025-02-15'}).previous.id"),'january');
assert.equal(run("comparisonText({delta:0})"),'Același timp');
assert.equal(run("comparisonText({delta:-141})"),'−1.41 sec mai rapid');
run('state='+beforeComparison);
console.log('Comparații OK: concurs anterior după dată, bazin separat, DQ, aceeași zi, același concurs și diferență semnată.');

// Chart endpoints reflect actual race times, without invented padding; records never mix pools.
{
 const saved=run('JSON.stringify(state)'),choice=run('selected'),pool=run('recordPool');
 run("state=LaneModel.normalize({...LaneModel.empty(),results:[{id:'axis-first',meet:'First',date:'2023-10-14',distance:50,stroke:'Liber',pool:50,time:6002},{id:'axis-last',meet:'Last',date:'2025-10-25',distance:50,stroke:'Liber',pool:50,time:3513},{id:'short-pool',meet:'Short',date:'2024-10-26',distance:50,stroke:'Liber',pool:25,time:4079}]});selected='50|Liber|50';recordPool=50");
 const graph=run('chart()');
 assert.ok(graph.includes('>1m 00s</text>'));
 assert.ok(graph.includes('>35s</text>'));
 assert.ok(!graph.includes('07.5 sec'));
 assert.ok(run('personalRecords()').includes('00:35.13'));
 assert.ok(!run('personalRecords()').includes('00:40.79'));
 run('recordPool=25');
 assert.ok(run('personalRecords()').includes('00:40.79'));
 assert.ok(!run('personalRecords()').includes('00:35.13'));
 assert.ok(!run('personalRecords()').includes('<span>↗</span>'));
 run('state='+saved);run('selected='+JSON.stringify(choice));run('recordPool='+pool);
}
let sharedText='';context.navigator={clipboard:{async writeText(text){sharedText=text}}};
(async()=>{await run('shareResult(state.results[0].id)');assert.ok(sharedText.includes('00:38.42'));assert.ok(sharedText.includes('https://youtu.be/aqz-KE-bpKQ?t=37'));assert.ok(!sharedText.includes('localhost'));let nativeShare;context.navigator.share=async payload=>{nativeShare=payload};await run('shareResult(state.results[0].id)');assert.ok(nativeShare.text.includes('Concurs test'));context.navigator.share=async()=>{const error=new Error('cancel');error.name='AbortError';throw error};await run('shareResult(state.results[0].id)');assert.equal(run('JSON.stringify(state)'),beforeDetails);console.log('Detalii + share OK: fără formular, video la cerere, timestamp, share nativ și copiere.');})().catch(error=>{console.error(error);process.exitCode=1});
assert.equal(run('chartTime(9000)'), '1m 30s');
assert.equal(run('chartTime(6200)'), '1m 02s');
assert.equal(run('chartTime(6000)'), '1m 00s');
assert.equal(run('chartTime(5999,2)'), '1m 00s');
assert.equal(run('chartTime(6207,2)'), '1m 02s');
assert.equal(run('chartTime(180000,2)'), '30m 00s');
console.log('Chart labels OK: minutes, padded seconds, exact-minute boundaries and hundredths.');
