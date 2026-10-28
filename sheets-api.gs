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
