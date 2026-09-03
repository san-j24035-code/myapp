/**
 * Google スプレッドシートに紐づけた Apps Script に貼り付けて使います。
 * 1. スプレッドシートで [拡張機能] > [Apps Script] を開く
 * 2. このファイルの内容を貼り付けて保存する
 * 3. [デプロイ] > [新しいデプロイ] > 種類: ウェブアプリ
 * 4. アクセスできるユーザーを用途に合わせて設定し、/exec URL をAKI MENUに貼り付ける
 */
const SPREADSHEET_ID = '1xhZnX-xbgID6jj2cA2Xff_qtnToJyYJYHxCK75UpHyo';
const SHEET_NAME = '提案履歴';

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['記録日時', '料理名', '食材', '食事', '調理時間', '希望時間', '手順']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.date || new Date().toISOString(),
    data.dish || '',
    data.ingredients || '',
    data.meal || '',
    data.cookingTime || '',
    data.requestedTime || '',
    data.steps || '',
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
