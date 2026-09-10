const SPREADSHEET_ID = '1xhZnX-xbgID6jj2cA2Xff_qtnToJyYJYHxCK75UpHyo';
const PRE_USERS_HEADERS = ['email', 'auth_code', 'initial_password', 'is_delete', 'created_at'];
const USERS_HEADERS = ['email', 'password', 'created_at'];

function getOrCreateSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse_(data, callback) {
  const json = JSON.stringify(data);
  const output = callback && /^[A-Za-z_$][\w$]*$/.test(callback)
    ? `${callback}(${json});`
    : json;
  return ContentService.createTextOutput(output).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function createAuthCode_() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function createInitialPassword_() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const required = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789'];
  const password = required.map((group) => group.charAt(Math.floor(Math.random() * group.length)));
  while (password.length < 15) password.push(characters.charAt(Math.floor(Math.random() * characters.length)));
  return password.sort(() => Math.random() - 0.5).join('');
}

function findEmailRow_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const emails = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = emails.findIndex((row) => normalizeEmail_(row[0]) === email);
  return rowIndex < 0 ? 0 : rowIndex + 2;
}

function requestRegistration_(spreadsheet, email) {
  const users = getOrCreateSheet_(spreadsheet, 'users', USERS_HEADERS);
  if (findEmailRow_(users, email)) return { ok: false, error: 'このメールアドレスはすでに登録されています。' };

  const preUsers = getOrCreateSheet_(spreadsheet, 'pre-users', PRE_USERS_HEADERS);
  const authCode = createAuthCode_();
  const initialPassword = createInitialPassword_();
  const existingRow = findEmailRow_(preUsers, email);
  const values = [email, authCode, initialPassword, false, new Date().toISOString()];
  if (existingRow) preUsers.getRange(existingRow, 1, 1, values.length).setValues([values]);
  else preUsers.appendRow(values);

  MailApp.sendEmail({
    to: email,
    subject: 'AKI MENU 認証コード',
    body: `AKI MENUの新規登録を受け付けました。\n\n認証コード：${authCode}\n\n認証画面でこのコードを入力してください。`
  });
  return { ok: true, message: '認証コードをメールで送信しました。' };
}

function verifyRegistration_(spreadsheet, email, authCode) {
  const preUsers = getOrCreateSheet_(spreadsheet, 'pre-users', PRE_USERS_HEADERS);
  const row = findEmailRow_(preUsers, email);
  if (!row) return { ok: false, error: 'メールアドレスまたは認証コードが違います。' };
  const record = preUsers.getRange(row, 1, 1, PRE_USERS_HEADERS.length).getValues()[0];
  if (String(record[1]) !== String(authCode).trim() || record[3] === true || String(record[3]).toLowerCase() === 'true') {
    return { ok: false, error: 'メールアドレスまたは認証コードが違います。' };
  }

  const users = getOrCreateSheet_(spreadsheet, 'users', USERS_HEADERS);
  if (findEmailRow_(users, email)) return { ok: false, error: 'このメールアドレスはすでに登録されています。' };
  users.appendRow([email, record[2], new Date().toISOString()]);
  preUsers.getRange(row, 4).setValue(true);
  return { ok: true, password: record[2], message: '登録に成功しました。' };
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const mode = params.mode || '';
  const email = normalizeEmail_(params.email);
  const callback = params.callback || '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return jsonResponse_({ ok: false, error: '有効なメールアドレスを入力してください。' }, callback);

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let result;
  if (mode === 'request') result = requestRegistration_(spreadsheet, email);
  else if (mode === 'verify') result = verifyRegistration_(spreadsheet, email, params.code || '');
  else result = { ok: false, error: 'modeはrequestまたはverifyを指定してください。' };
  return jsonResponse_(result, callback);
}

function doPost(e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string') {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'doPostはWebアプリへのPOSTリクエストから実行してください。エディタの「実行」ではリクエストデータが渡されません。' })).setMimeType(ContentService.MimeType.JSON);
  }

  let data;
  try {
    data = JSON.parse(e.postData.contents || '{}');
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'リクエストのJSONを解析できません。' })).setMimeType(ContentService.MimeType.JSON);
  }
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (data.event) {
    const sheet = getOrCreateSheet_(spreadsheet, 'ログイン履歴', ['日時', 'イベント', 'ユーザー名', 'メールアドレス']);
    sheet.appendRow([data.date || new Date().toISOString(), data.event, data.username || '', data.email || '']);
  } else {
    const sheet = getOrCreateSheet_(spreadsheet, '提案履歴', ['記録日時', '料理名', '食材', '食事', '調理時間', '希望時間', '手順']);
    sheet.appendRow([data.date || new Date().toISOString(), data.dish || '', data.ingredients || '', data.meal || '', data.cookingTime || '', data.requestedTime || '', data.steps || '']);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
