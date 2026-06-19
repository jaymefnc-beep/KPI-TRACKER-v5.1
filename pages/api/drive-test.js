import { google } from "googleapis";
export default async function handler(req, res) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });
    const list = await drive.files.list({ q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`, fields: "files(id,name)", pageSize: 10 });
    res.status(200).json({ ok: true, files: list.data.files });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
