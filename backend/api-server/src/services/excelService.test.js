import assert from 'node:assert/strict';
import test from 'node:test';
import xlsx from 'xlsx';

import ExcelService from './excelService.js';

function buildWorkbook(rows, sheetName = 'Holidays') {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

test('generateHolidayExport writes the production export layout', () => {
  const service = new ExcelService();
  const buffer = service.generateHolidayExport([
    { date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'government' },
  ], 2026);

  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  assert.deepEqual(rows[0], ['ลำดับ', 'วันที่ (Date)', 'ชื่อวันหยุด (Holiday Name)', 'ประเภท (Type)']);
  assert.equal(rows[1][0], 1);
  assert.equal(rows[1][2], 'วันขึ้นปีใหม่');
  assert.equal(rows[1][3], 'วันหยุดราชการ');
  assert.match(String(rows[1][1]), /2569/);
});

test('parseHolidayFile reads exported holiday files from prod back into canonical data', () => {
  const service = new ExcelService();
  const buffer = service.generateHolidayExport([
    { date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'government' },
    { date: '2026-04-13', name: 'วันสงกรานต์', type: 'government' },
  ], 2026);

  const parsed = service.parseHolidayFile(buffer);

  assert.deepEqual(parsed, [
    {
      date: '2026-01-01',
      name: 'วันขึ้นปีใหม่',
      type: 'government',
      description: null,
    },
    {
      date: '2026-04-13',
      name: 'วันสงกรานต์',
      type: 'government',
      description: null,
    },
  ]);
});

test('parseHolidayFile keeps the template import format working', () => {
  const service = new ExcelService();
  const buffer = buildWorkbook([
    ['Date (DD/MM/YYYY)', 'Name', 'Type', 'Description'],
    ['01/01/2026', 'วันขึ้นปีใหม่', 'government', "New Year's Day"],
    ['13/04/2569', 'วันสงกรานต์', 'company', 'Songkran company holiday'],
  ]);

  const parsed = service.parseHolidayFile(buffer);

  assert.deepEqual(parsed, [
    {
      date: '2026-01-01',
      name: 'วันขึ้นปีใหม่',
      type: 'government',
      description: "New Year's Day",
    },
    {
      date: '2026-04-13',
      name: 'วันสงกรานต์',
      type: 'company',
      description: 'Songkran company holiday',
    },
  ]);
});
