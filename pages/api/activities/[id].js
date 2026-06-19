import { notion, pageToActivity, activityToProperties } from "../../../lib/notion";
import { driveUpdate, driveDelete } from "../../../lib/drive";
export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === "PUT") {
    try {
      const page = await notion.pages.update({ page_id: id, properties: activityToProperties(req.body) });
      const activity = pageToActivity(page);
      driveUpdate({ ...req.body, id }).catch(e => console.error("Drive:", e.message));
      res.status(200).json(activity);
    } catch(e) { res.status(500).json({ error: e.message }); }
  } else if (req.method === "DELETE") {
    try {
      await notion.pages.update({ page_id: id, archived: true });
      driveDelete(id).catch(e => console.error("Drive:", e.message));
      res.status(200).json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  } else { res.status(405).end(); }
}
