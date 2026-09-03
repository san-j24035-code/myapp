const SPREADSHEET_ID = '1xhZnX-xbgID6jj2cA2Xff_qtnToJyYJYHxCK75UpHyo';

function getOrCreateSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
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
