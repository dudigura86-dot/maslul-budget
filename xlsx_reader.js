/* Maslul XLSX import: reads OOXML locally; never sends the selected document to a server. */
'use strict';
window.MaslulXlsx = (() => {
  const decoder = new TextDecoder('utf-8');
  const MAX_ENTRY = 12 * 1024 * 1024;
  const MAX_ROWS = 3000;
  const ns = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  function fail(message) { throw new Error(message); }
  function children(node, name) { return Array.from(node?.children || []).filter(n => n.localName === name); }
  function first(node, name) { return children(node, name)[0] || null; }
  function all(node, name) { return Array.from(node?.getElementsByTagNameNS('*', name) || []); }
  function parseXml(text) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) fail('מבנה ה־Excel אינו תקין.');
    return xml;
  }
  function path(name) {
    const output = [];
    for (const segment of name.replaceAll('\\', '/').split('/')) {
      if (segment === '..') output.pop();
      else if (segment && segment !== '.') output.push(segment);
    }
    return output.join('/');
  }
  async function archive(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer), view = new DataView(arrayBuffer);
    const u16 = o => view.getUint16(o, true), u32 = o => view.getUint32(o, true);
    let eocd = -1;
    for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
      if (u32(p) === 0x06054b50) { eocd = p; break; }
    }
    if (eocd < 0) fail('קובץ Excel אינו תקין או שהוא פגום.');
    const count = u16(eocd + 10), offset = u32(eocd + 16);
    if (count > 2000 || offset >= bytes.length) fail('קובץ Excel גדול או מורכב מדי.');
    const files = new Map();
    let pointer = offset;
    for (let i = 0; i < count; i++) {
      if (pointer + 46 > bytes.length || u32(pointer) !== 0x02014b50) fail('מבנה קובץ Excel פגום.');
      const flags = u16(pointer + 8), method = u16(pointer + 10);
      const compressed = u32(pointer + 20), uncompressed = u32(pointer + 24);
      const nameLen = u16(pointer + 28), extra = u16(pointer + 30), comment = u16(pointer + 32);
      const local = u32(pointer + 42);
      if (pointer + 46 + nameLen + extra + comment > bytes.length) fail('מבנה קובץ Excel פגום.');
      const filename = path(decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLen)));
      if (filename.startsWith('xl/') && !filename.endsWith('/')) {
        if ((flags & 1) || ![0, 8].includes(method)) fail('קובץ Excel מוצפן או מסוג דחיסה שאינו נתמך.');
        if (uncompressed > MAX_ENTRY || compressed > MAX_ENTRY) fail('רכיב Excel גדול מדי.');
        if (local + 30 > bytes.length || u32(local) !== 0x04034b50) fail('מבנה קובץ Excel פגום.');
        const start = local + 30 + u16(local + 26) + u16(local + 28);
        if (start + compressed > bytes.length) fail('מבנה קובץ Excel פגום.');
        files.set(filename, {start, compressed, uncompressed, method});
      }
      pointer += 46 + nameLen + extra + comment;
    }
    async function read(filename) {
      const entry = files.get(path(filename));
      if (!entry) return null;
      const data = bytes.subarray(entry.start, entry.start + entry.compressed);
      let contents;
      if (entry.method === 0) contents = data;
      else {
        if (!globalThis.DecompressionStream) fail('הדפדפן אינו תומך בפתיחת Excel מקומית. נסה לעדכן את Chrome.');
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        contents = new Uint8Array(await new Response(stream).arrayBuffer());
      }
      if (contents.length !== entry.uncompressed || contents.length > MAX_ENTRY) fail('רכיב Excel אינו תקין.');
      return decoder.decode(contents);
    }
    return {read};
  }
  function colIndex(ref) {
    const letters = /^([A-Z]+)/i.exec(ref)?.[1] || '';
    let result = 0;
    for (const letter of letters.toUpperCase()) result = result * 26 + letter.charCodeAt(0) - 64;
    return result - 1;
  }
  function excelDay(value, date1904) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 1 || number > 2958465) return value;
    const date = new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + Math.floor(number) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  function sheetRows(xml, strings, date1904) {
    const output = [];
    const root = first(xml.documentElement, 'sheetData') || all(xml, 'sheetData')[0];
    if (!root) return output;
    const rows = children(root, 'row');
    if (rows.length > MAX_ROWS + 25) fail('בגיליון Excel יש יותר מדי שורות.');
    for (const row of rows) {
      const cells = [];
      for (const cell of children(row, 'c')) {
        const index = colIndex(cell.getAttribute('r') || '');
        if (index < 0 || index >= 60) continue;
        const kind = cell.getAttribute('t');
        const v = first(cell, 'v')?.textContent || '';
        let value = kind === 'inlineStr' ? all(first(cell, 'is'), 't').map(n => n.textContent).join('')
          : kind === 's' ? (strings[Number(v)] || '')
          : kind === 'str' ? v
          : kind === 'b' ? (v === '1' ? 'TRUE' : 'FALSE')
          : v !== '' && Number.isFinite(Number(v)) ? Number(v) : v;
        cells[index] = value;
      }
      if (cells.some(v => v !== undefined && String(v).trim())) output.push(cells);
    }
    return output;
  }
  function normalizeHeader(value) { return String(value || '').replace(/[\s\u200e\u200f"']/g, '').toLowerCase(); }
  function headerIndex(rows) {
    return rows.slice(0, 20).findIndex(r => {
      const names = r.map(normalizeHeader);
      return names.some(n => /תאריך|date/.test(n)) && names.some(n => /סכום|amount|debit|credit/.test(n)) && names.some(n => /עסק|תיאור|merchant|description|details|payee/.test(n));
    });
  }
  async function readWorkbook(file) {
    if (!/\.xlsx$/i.test(file.name)) fail('ייבוא Excel תומך בקובצי .xlsx בלבד.');
    if (file.size > MAX_ENTRY) fail('קובץ Excel גדול מ־12MB.');
    const zip = await archive(await file.arrayBuffer());
    const workbookRaw = await zip.read('xl/workbook.xml');
    const relationshipsRaw = await zip.read('xl/_rels/workbook.xml.rels');
    if (!workbookRaw || !relationshipsRaw) fail('קובץ Excel חסר פרטי גיליונות.');
    const wb = parseXml(workbookRaw), rels = parseXml(relationshipsRaw);
    const date1904 = all(wb, 'workbookPr')[0]?.getAttribute('date1904') === '1';
    const relationPaths = new Map(all(rels, 'Relationship').map(r => {
      const t = r.getAttribute('Target') || '';
      return [r.getAttribute('Id'), path(t.startsWith('/') ? t : 'xl/' + t)];
    }));
    const sharedRaw = await zip.read('xl/sharedStrings.xml');
    const strings = sharedRaw ? all(parseXml(sharedRaw), 'si').map(si => all(si, 't').map(t => t.textContent).join('')) : [];
    let combined = [], headers = [], sheetsRead = 0, summaries = 0;
    for (const sheet of all(wb, 'sheet')) {
      const relationship = sheet.getAttributeNS(ns, 'id') || sheet.getAttribute('r:id');
      const filename = relationPaths.get(relationship);
      if (!filename || !filename.startsWith('xl/worksheets/')) continue;
      const raw = await zip.read(filename);
      if (!raw) continue;
      const rows = sheetRows(parseXml(raw), strings, date1904);
      const header = headerIndex(rows);
      if (header < 0) continue;
      const currentHeaders = rows[header].map(v => String(v ?? '').trim());
      if (!headers.length) headers = currentHeaders;
      const positions = headers.map(h => currentHeaders.findIndex(other => normalizeHeader(other) === normalizeHeader(h)));
      const dateColumn = headers.findIndex(h => /תאריך.*עסק|^תאריך$|transactiondate|^date$/.test(normalizeHeader(h)));
      const amountColumn = headers.findIndex(h => /סכום.*חיוב|^סכום$|amount|debit|credit/.test(normalizeHeader(h)));
      for (const sourceRow of rows.slice(header + 1)) {
        if (combined.length >= MAX_ROWS) fail('הקובץ מכיל מעל 3,000 עסקאות. יש לפצל אותו.');
        const row = positions.map((idx, col) => {
          const value = idx < 0 ? '' : sourceRow[idx];
          return col === dateColumn && typeof value === 'number' ? excelDay(value, date1904) : (value ?? '');
        });
        const date = String(row[dateColumn] ?? '').trim();
        const amount = String(row[amountColumn] ?? '').trim();
        if (!amount && !/^(?:\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d\d-\d\d)$/.test(date)) { summaries++; continue; }
        if (!/\d/.test(date) && /^(?:סה.?כ|סך|סיכום|total)/i.test(date)) { summaries++; continue; }
        combined.push(row);
      }
      sheetsRead++;
    }
    if (!headers.length || !combined.length) fail('לא נמצאה טבלת עסקאות בקובץ ה־Excel.');
    return {rows: [headers, ...combined], warnings: [
      'נקראו ' + sheetsRead + ' גיליונות Excel מקומית, ללא שליחת הקובץ לשרת.',
      ...(summaries ? ['דולגו ' + summaries + ' שורות ריקות או שורות סיכום.'] : [])
    ]};
  }
  return {readWorkbook};
})();