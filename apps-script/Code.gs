const CUSTOMER_SHEET = 'Customers';
const TRANSACTION_SHEET = 'Transactions';
const CYLINDER_RENTAL_SHEET = 'CylinderRentals';
const AUDIT_SHEET = 'AuditLog';

function setup() {
  setupSheets();
  const key = Utilities.getUuid() + Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('ACCESS_KEY', key);
  console.log('외상노트 접근 키: ' + key);
  return key;
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let customers = ss.getSheetByName(CUSTOMER_SHEET);
  let transactions = ss.getSheetByName(TRANSACTION_SHEET);
  let cylinderRentals = ss.getSheetByName(CYLINDER_RENTAL_SHEET);
  let auditLog = ss.getSheetByName(AUDIT_SHEET);
  if (!customers) customers = ss.insertSheet(CUSTOMER_SHEET);
  if (!transactions) transactions = ss.insertSheet(TRANSACTION_SHEET);
  if (!cylinderRentals) cylinderRentals = ss.insertSheet(CYLINDER_RENTAL_SHEET);
  if (!auditLog) auditLog = ss.insertSheet(AUDIT_SHEET);
  if (customers.getLastRow() === 0) customers.appendRow(['customer_id', 'name', 'phone', 'memo', 'created_at']);
  if (transactions.getLastRow() === 0) transactions.appendRow(['transaction_id', 'customer_id', 'type', 'amount', 'date', 'memo', 'created_at']);
  if (cylinderRentals.getLastRow() === 0) cylinderRentals.appendRow(['rental_id', 'customer_id', 'type', 'quantity', 'cylinder_type', 'date', 'memo', 'created_at']);
  if (auditLog.getLastRow() === 0) auditLog.appendRow(['log_id', 'entity', 'action', 'record_id', 'customer_id', 'snapshot', 'created_at']);
  customers.setFrozenRows(1); transactions.setFrozenRows(1); cylinderRentals.setFrozenRows(1); auditLog.setFrozenRows(1);
  customers.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e8efe9');
  transactions.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8efe9');
  cylinderRentals.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#fff1d6');
  auditLog.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8e7f7');
}

function doGet(e) {
  try {
    authorize(e.parameter.key);
    setupSheets();
    return jsonOutput({ ok: true, ...getSummary() });
  } catch (error) { return jsonOutput({ ok: false, error: error.message }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    authorize(body.key);
    lock.waitLock(10000);
    setupSheets();
    let actionResult = null;
    if (body.action === 'addCustomer') actionResult = addCustomer(body);
    else if (body.action === 'addTransaction') actionResult = addTransaction(body);
    else if (body.action === 'addCylinderRental') actionResult = addCylinderRental(body);
    else if (body.action === 'deleteTransaction') deleteRecord(TRANSACTION_SHEET, 'transaction_id', clean(body.id), 'transaction');
    else if (body.action === 'deleteCylinderRental') deleteCylinderRental(clean(body.id));
    else throw new Error('지원하지 않는 요청입니다.');
    SpreadsheetApp.flush();
    return jsonOutput({ ok: true, actionResult, ...getSummary() });
  } catch (error) { return jsonOutput({ ok: false, error: error.message }); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}

function authorize(candidate) {
  const expected = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
  if (!expected || !candidate || String(candidate) !== expected) throw new Error('접근 권한이 없습니다.');
}

function addCustomer(data) {
  const name = clean(data.name);
  if (!name) throw new Error('고객명을 입력해 주세요.');
  const record = { id: makeId('C'), name, phone: clean(data.phone), memo: clean(data.memo), created_at: createdAtSeoulDate() };
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CUSTOMER_SHEET).appendRow([record.id, record.name, record.phone, record.memo, record.created_at]);
  return record;
}

function addTransaction(data) {
  const customerId = clean(data.customerId);
  const type = data.type === 'payment' ? 'payment' : 'credit';
  const amount = Number(data.amount);
  const date = clean(data.date);
  if (!customerId || !Number.isFinite(amount) || amount <= 0 || !date) throw new Error('고객, 금액, 거래일을 확인해 주세요.');
  if (!readRows(CUSTOMER_SHEET).some(row => String(row.customer_id) === customerId)) throw new Error('고객을 찾을 수 없습니다.');
  const record = { transaction_id: makeId('T'), customer_id: customerId, type, amount, date, memo: clean(data.memo), created_at: createdAtSeoulDate() };
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSACTION_SHEET).appendRow([record.transaction_id, record.customer_id, record.type, record.amount, record.date, record.memo, record.created_at]);
  writeAudit('transaction', 'create', record.transaction_id, customerId, record);
  return record;
}

function addCylinderRental(data) {
  const customerId = clean(data.customerId);
  const type = data.type === 'return' ? 'return' : 'rental';
  const quantity = Number(data.quantity);
  const cylinderType = clean(data.cylinderType);
  const date = clean(data.date);
  if (!customerId || !Number.isInteger(quantity) || quantity <= 0 || !cylinderType || !date) throw new Error('고객, 가스통 규격, 수량, 날짜를 확인해 주세요.');
  if (!readRows(CUSTOMER_SHEET).some(row => String(row.customer_id) === customerId)) throw new Error('고객을 찾을 수 없습니다.');
  if (type === 'return') {
    const rented = readRows(CYLINDER_RENTAL_SHEET).filter(row => String(row.customer_id) === customerId && String(row.cylinder_type) === cylinderType).reduce((sum, row) => sum + (row.type === 'return' ? -Number(row.quantity || 0) : Number(row.quantity || 0)), 0);
    if (quantity > rented) throw new Error('해당 규격의 현재 대여 수량보다 많이 반납할 수 없습니다.');
  }
  const record = { rental_id: makeId('R'), customer_id: customerId, type, quantity, cylinder_type: cylinderType, date, memo: clean(data.memo), created_at: createdAtSeoulDate() };
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CYLINDER_RENTAL_SHEET).appendRow([record.rental_id, record.customer_id, record.type, record.quantity, record.cylinder_type, record.date, record.memo, record.created_at]);
  writeAudit('cylinderRental', 'create', record.rental_id, customerId, record);
  return record;
}

function deleteRecord(sheetName, idColumn, id, entity) {
  if (!id) throw new Error('삭제할 기록 ID가 없습니다.');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const rows = readRowsWithNumbers(sheetName);
  const target = rows.find(item => String(item.data[idColumn]) === id);
  if (!target) throw new Error('삭제할 기록을 찾을 수 없습니다.');
  sheet.deleteRow(target.rowNumber);
  writeAudit(entity, 'delete', id, String(target.data.customer_id || ''), target.data);
}

function deleteCylinderRental(id) {
  const rows = readRowsWithNumbers(CYLINDER_RENTAL_SHEET);
  const target = rows.find(item => String(item.data.rental_id) === id);
  if (!target) throw new Error('삭제할 가스통 기록을 찾을 수 없습니다.');
  const remaining = rows.filter(item => item !== target && String(item.data.customer_id) === String(target.data.customer_id) && String(item.data.cylinder_type) === String(target.data.cylinder_type)).reduce((sum, item) => sum + (item.data.type === 'return' ? -Number(item.data.quantity || 0) : Number(item.data.quantity || 0)), 0);
  if (remaining < 0) throw new Error('이 대여 기록을 삭제하면 반납 수량이 대여 수량보다 많아집니다. 관련 반납 기록을 먼저 삭제해 주세요.');
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CYLINDER_RENTAL_SHEET).deleteRow(target.rowNumber);
  writeAudit('cylinderRental', 'delete', id, String(target.data.customer_id || ''), target.data);
}

function writeAudit(entity, action, recordId, customerId, snapshot) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUDIT_SHEET).appendRow([makeId('L'), entity, action, recordId, customerId, JSON.stringify(snapshot), createdAtSeoulDate()]);
}

// 기존 created_at 값도 서울 날짜(YYYY-MM-DD)로 일괄 변환할 때 한 번 실행합니다.
function normalizeCreatedAtDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [CUSTOMER_SHEET, TRANSACTION_SHEET, CYLINDER_RENTAL_SHEET, AUDIT_SHEET].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const column = headers.indexOf('created_at') + 1;
    if (!column) return;
    const range = sheet.getRange(2, column, sheet.getLastRow() - 1, 1);
    const converted = range.getValues().map(([value]) => {
      if (!value) return [''];
      const date = value instanceof Date ? value : new Date(value);
      return [Number.isNaN(date.getTime()) ? String(value) : Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd')];
    });
    range.setNumberFormat('@').setValues(converted);
  });
  SpreadsheetApp.flush();
}

function getSummary() {
  const customerMap = {};
  readRows(CUSTOMER_SHEET).forEach(row => customerMap[row.customer_id] = { id: String(row.customer_id), name: String(row.name), phone: String(row.phone || ''), memo: String(row.memo || ''), balance: 0, oldestDate: null, cylinderCount: 0 });
  const transactions = readRows(TRANSACTION_SHEET).map(row => {
    const customer = customerMap[row.customer_id];
    const amount = Number(row.amount) || 0;
    const date = normalizeDate(row.date);
    if (customer) {
      customer.balance += row.type === 'payment' ? -amount : amount;
      if (row.type === 'credit' && (!customer.oldestDate || date < customer.oldestDate)) customer.oldestDate = date;
    }
    return { id: String(row.transaction_id), customerId: String(row.customer_id), customerName: customer ? customer.name : '삭제된 고객', type: row.type, amount, date, memo: String(row.memo || '') };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const cylinderRentals = readRows(CYLINDER_RENTAL_SHEET).map(row => {
    const customer = customerMap[row.customer_id];
    const quantity = Number(row.quantity) || 0;
    const type = row.type === 'return' ? 'return' : 'rental';
    if (customer) customer.cylinderCount += type === 'return' ? -quantity : quantity;
    return { id: String(row.rental_id), customerId: String(row.customer_id), customerName: customer ? customer.name : '삭제된 고객', type, quantity, cylinderType: String(row.cylinder_type || ''), date: normalizeDate(row.date), memo: String(row.memo || '') };
  }).sort((a, b) => b.date.localeCompare(a.date));
  const customers = Object.values(customerMap).map(customer => ({ ...customer, balance: Math.max(0, customer.balance), oldestDate: customer.balance > 0 ? customer.oldestDate : null }));
  return { customers, transactions, cylinderRentals };
}

function readRows(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(row => row.some(cell => cell !== '')).map(row => headers.reduce((obj, key, index) => { obj[key] = row[index]; return obj; }, {}));
}

function readRowsWithNumbers(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map((row, index) => ({ rowNumber: index + 2, data: headers.reduce((obj, key, column) => { obj[key] = row[column]; return obj; }, {}) })).filter(item => Object.values(item.data).some(value => value !== ''));
}

function clean(value) { return String(value == null ? '' : value).trim().slice(0, 500); }
function makeId(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function createdAtSeoulDate() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function normalizeDate(value) { return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function jsonOutput(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
