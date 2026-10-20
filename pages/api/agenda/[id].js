import { notion } from "../../../lib/notion";
import { agendaEntryToProps } from "../agenda";
export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === "PUT") {
    try { await notion.pages.update({ page_id: id, properties: agendaEntryToProps(req.body) }); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  } else if (req.method === "DELETE") {
    try { await notion.pages.update({ page_id: id, archived: true }); res.status(200).json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  } else { res.status(405).end(); }
}
