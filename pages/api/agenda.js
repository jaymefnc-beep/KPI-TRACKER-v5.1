import { notion } from "../../lib/notion";
const AGENDA_DB = process.env.AGENDA_DATABASE_ID;

export function agendaPageToEntry(p) {
  const g = (k, t) => {
    const pr = p.properties[k];
    if (!pr) return "";
    if (t === "title") return pr.title?.[0]?.plain_text || "";
    if (t === "rich_text") return pr.rich_text?.[0]?.plain_text || "";
    if (t === "select") return pr.select?.name || "";
    if (t === "date") return pr.date?.start || "";
    return "";
  };
  return {
    id: p.id,
    Atividade: g("Atividade", "title"),
    Data: g("Data", "date"),
    Tipo: g("Tipo", "select"),
    Local: g("Local", "rich_text"),
    Descricao: g("Descrição", "rich_text"),
  };
}
export function agendaEntryToProps(d) {
  const pr = {};
  if (d.Atividade !== undefined) pr["Atividade"] = { title: [{ text: { content: d.Atividade || "" } }] };
  if (d.Data) pr["Data"] = { date: { start: d.Data } };
  if (d.Tipo) pr["Tipo"] = { select: { name: d.Tipo } };
  if (d.Local !== undefined) pr["Local"] = { rich_text: [{ text: { content: d.Local || "" } }] };
  if (d.Descricao !== undefined) pr["Descrição"] = { rich_text: [{ text: { content: d.Descricao || "" } }] };
  return pr;
}

export default async function handler(req, res) {
  if (!AGENDA_DB) {
    if (req.method === "GET") return res.status(200).json([]);
    return res.status(400).json({ error: "AGENDA_DATABASE_ID nao configurado no Vercel" });
  }
  if (req.method === "GET") {
    try {
      let all = [], hasMore = true, cursor = undefined;
      while (hasMore) {
        const r = await notion.databases.query({
          database_id: AGENDA_DB,
          sorts: [{ property: "Data", direction: "ascending" }],
          page_size: 100, start_cursor: cursor,
        });
        all = all.concat(r.results); hasMore = r.has_more; cursor = r.next_cursor;
      }
      res.status(200).json(all.map(agendaPageToEntry));
    } catch (e) { res.status(500).json({ error: e.message }); }
  } else if (req.method === "POST") {
    try {
      const page = await notion.pages.create({ parent: { database_id: AGENDA_DB }, properties: agendaEntryToProps(req.body) });
      res.status(200).json(agendaPageToEntry(page));
    } catch (e) { res.status(500).json({ error: e.message }); }
  } else { res.status(405).end(); }
}
