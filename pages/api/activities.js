import { notion, DATABASE_ID, pageToActivity, activityToProperties } from "../../lib/notion";
import { driveCreate } from "../../lib/drive";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { quarter } = req.query;
    try {
      const filter = (quarter && quarter !== "Todos" && quarter !== "todos")
        ? { property: "Quarter", select: { equals: quarter } }
        : undefined;

      // Paginate to get ALL results (not just first 100)
      let allResults = [];
      let hasMore = true;
      let startCursor = undefined;

      while (hasMore) {
        const response = await notion.databases.query({
          database_id: DATABASE_ID,
          filter,
          sorts: [{ property: "Data", direction: "descending" }],
          page_size: 100,
          start_cursor: startCursor,
        });
        allResults = [...allResults, ...response.results];
        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }

      res.status(200).json(allResults.map(pageToActivity));
    } catch(e) { res.status(500).json({ error: e.message }); }

  } else if (req.method === "POST") {
    try {
      const page = await notion.pages.create({
        parent: { database_id: DATABASE_ID },
        properties: activityToProperties(req.body),
      });
      const activity = pageToActivity(page);
      driveCreate(activity).catch(e => console.error("Drive:", e.message));
      res.status(200).json(activity);
    } catch(e) { res.status(500).json({ error: e.message }); }

  } else { res.status(405).end(); }
}
