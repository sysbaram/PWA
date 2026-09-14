const CUSTOMER_SHEET = 'Customers';
const TRANSACTION_SHEET = 'Transactions';

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
  if (!customers) customers = ss.insertSheet(CUSTOMER_SHEET);
  if (!transactions) transactions = ss.insertSheet(TRANSACTION_SHEET);
  if (customers.getLastRow() === 0) customers.appendRow(['customer_id', 'name', 'phone', 'memo', 'created_at']);
  if (transactions.getLastRow() === 0) transactions.appendRow(['transaction_id', 'customer_id', 'type', 'amount', 'date', 'memo', 'created_at']);
  customers.setFrozenRows(1); transactions.setFrozenRows(1);
  customers.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e8efe9');
  transactions.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8efe9');
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
    if (body.action === 'addCustomer') addCustomer(body);
    else if (body.action === 'addTransaction') addTransaction(body);
    else throw new Error('지원하지 않는 요청입니다.');
    SpreadsheetApp.flush();
    return jsonOutput({ ok: true });
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
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CUSTOMER_SHEET).appendRow([makeId('C'), name, clean(data.phone), clean(data.memo), new Date().toISOString()]);
}

function addTransaction(data) {
  const customerId = clean(data.customerId);
  const type = data.type === 'payment' ? 'payment' : 'credit';
  const amount = Number(data.amount);
  const date = clean(data.date);
  if (!customerId || !Number.isFinite(amount) || amount <= 0 || !date) throw new Error('고객, 금액, 거래일을 확인해 주세요.');
  if (!readRows(CUSTOMER_SHEET).some(row => String(row.customer_id) === customerId)) throw new Error('고객을 찾을 수 없습니다.');
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSACTION_SHEET).appendRow([makeId('T'), customerId, type, amount, date, clean(data.memo), new Date().toISOString()]);
}

function getSummary() {
  const customerMap = {};
  readRows(CUSTOMER_SHEET).forEach(row => customerMap[row.customer_id] = { id: String(row.customer_id), name: String(row.name), phone: String(row.phone || ''), balance: 0, oldestDate: null });
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
  const customers = Object.values(customerMap).map(customer => ({ ...customer, balance: Math.max(0, customer.balance), oldestDate: customer.balance > 0 ? customer.oldestDate : null }));
  return { customers, transactions };
}

function readRows(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(row => row.some(cell => cell !== '')).map(row => headers.reduce((obj, key, index) => { obj[key] = row[index]; return obj; }, {}));
}

function clean(value) { return String(value == null ? '' : value).trim().slice(0, 500); }
function makeId(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function normalizeDate(value) { return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function jsonOutput(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
