import { notion, DATABASE_ID, pageToActivity } from "../../lib/notion";
import { google } from "googleapis";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SHEET_NAME = "KPI Tracker — Atividades";

function getPrivateKey() {
  let key = process.env.GOOGLE_PRIVATE_KEY || "";
  // Remove surrounding quotes if present
  key = key.replace(/^["']|["']$/g, "");
  // Replace literal \n with real newlines
  key = key.replace(/\\n/g, "\n");
  // Ensure proper header/footer spacing
  key = key.replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n");
  key = key.replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----\n");
  // Remove duplicate newlines
  key = key.replace(/\n{3,}/g, "\n\n");
  return key.trim() + "\n";
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: getPrivateKey(),
    },
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

export default async function handler(req, res) {
  try {
    // Debug info
    const keyPreview = getPrivateKey().substring(0, 50) + "...";
    
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: "Data", direction: "descending" }],
      page_size: 100,
    });
    const activities = response.results.map(pageToActivity);
    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const list = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and name='${SHEET_NAME}' and trashed=false`,
      fields: "files(id)",
    });
    for (const f of list.data.files) await drive.files.delete({ fileId: f.id });

    const file = await drive.files.create({
      requestBody: {
        name: SHEET_NAME,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [FOLDER_ID],
      },
      fields: "id",
    });
    const sheetId = file.data.id;

    const headers = ["ID","Atividade","Categoria","Etapa","Status","Cliente Final","Integrador","Quarter","Valor (R$)","Meta Quarter (R$)","Data","Observações"];
    const rows = activities.map(a => [
      a.id||"",a.Atividade||"",a.Categoria||"",a.Etapa||"",a.Status||"",
      a["Cliente Final"]||"",a.Integrador||"",a.Quarter||"",
      a["Valor (R$)"]||"",a["Meta Quarter (R$)"]||"",a.Data||"",a.Observações||""
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId, range: "A1",
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...rows] },
    });

    res.status(200).json({
      ok: true,
      total: activities.length,
      sheetId,
      keyPreview,
      message: `${activities.length} atividades sincronizadas`,
    });
  } catch(e) {
    res.status(500).json({ error: e.message, code: e.code });
  }
}
