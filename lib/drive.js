import { google } from "googleapis";
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SHEET_NAME = "KPI Tracker — Atividades";
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/spreadsheets"],
  });
}
async function getOrCreateSheet() {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });
  const list = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id,name)",
  });
  if (list.data.files.length > 0) return list.data.files[0].id;
  const file = await drive.files.create({
    requestBody: { name: SHEET_NAME, mimeType: "application/vnd.google-apps.spreadsheet", parents: [FOLDER_ID] },
    fields: "id",
  });
  const sheetId = file.data.id;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: "A1:L1", valueInputOption: "RAW",
    requestBody: { values: [["ID","Atividade","Categoria","Etapa","Status","Cliente Final","Integrador","Quarter","Valor (R$)","Meta Quarter (R$)","Data","Observações"]] },
  });
  return sheetId;
}
function toRow(a) {
  return [a.id||"",a.Atividade||"",a.Categoria||"",a.Etapa||"",a.Status||"",a["Cliente Final"]||"",a.Integrador||"",a.Quarter||"",a["Valor (R$)"]||"",a["Meta Quarter (R$)"]||"",a.Data||"",a.Observações||""];
}
export async function driveCreate(activity) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = await getOrCreateSheet();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId, range: "A:L", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: [toRow(activity)] },
    });
  } catch(e) { console.error("driveCreate error:", e.message); }
}
export async function driveUpdate(activity) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = await getOrCreateSheet();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "A2:A" });
    const rows = res.data.values || [];
    const idx = rows.findIndex(r => r[0] === activity.id);
    if (idx === -1) { await driveCreate(activity); return; }
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: `A${idx+2}:L${idx+2}`, valueInputOption: "RAW",
      requestBody: { values: [toRow(activity)] },
    });
  } catch(e) { console.error("driveUpdate error:", e.message); }
}
export async function driveDelete(id) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = await getOrCreateSheet();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "A2:A" });
    const rows = res.data.values || [];
    const idx = rows.findIndex(r => r[0] === id);
    if (idx === -1) return;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: `E${idx+2}`, valueInputOption: "RAW",
      requestBody: { values: [["EXCLUÍDO"]] },
    });
  } catch(e) { console.error("driveDelete error:", e.message); }
}
