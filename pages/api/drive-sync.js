import { notion, DATABASE_ID, pageToActivity } from "../../lib/notion";
import { google } from "googleapis";
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SHEET_NAME = "KPI Tracker — Atividades";
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") },
    scopes: ["https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/spreadsheets"],
  });
}
export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({ database_id: DATABASE_ID, sorts: [{ property: "Data", direction: "descending" }], page_size: 100 });
    const activities = response.results.map(pageToActivity);
    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });
    const list = await drive.files.list({ q: `'${FOLDER_ID}' in parents and name='${SHEET_NAME}' and trashed=false`, fields: "files(id)" });
    for (const f of list.data.files) await drive.files.delete({ fileId: f.id });
    const file = await drive.files.create({ requestBody: { name: SHEET_NAME, mimeType: "application/vnd.google-apps.spreadsheet", parents: [FOLDER_ID] }, fields: "id" });
    const sheetId = file.data.id;
    const headers = ["ID","Atividade","Categoria","Etapa","Status","Cliente Final","Integrador","Quarter","Valor (R$)","Meta Quarter (R$)","Data","Observações"];
    const rows = activities.map(a => [a.id||"",a.Atividade||"",a.Categoria||"",a.Etapa||"",a.Status||"",a["Cliente Final"]||"",a.Integrador||"",a.Quarter||"",a["Valor (R$)"]||"",a["Meta Quarter (R$)"]||"",a.Data||"",a.Observações||""]);
    await sheets.spreadsheets.values.update({ spreadsheetId: sheetId, range: "A1", valueInputOption: "RAW", requestBody: { values: [headers, ...rows] } });
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests: [{ repeatCell: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.07, green: 0.09, blue: 0.15 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } }, fields: "userEnteredFormat(backgroundColor,textFormat)" } }, { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 12 } } }] } });
    res.status(200).json({ ok: true, total: activities.length, sheetId, message: `${activities.length} atividades sincronizadas` });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
