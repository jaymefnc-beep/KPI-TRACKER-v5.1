import { notion, DATABASE_ID, pageToActivity } from "../../lib/notion";

// Feed .ics dinamico para assinatura no Apple Calendar.
// URL de assinatura: https://<seu-dominio-vercel>/api/cal
export default async function handler(req, res) {
  try {
    // Buscar TODAS as atividades (paginado)
    let all = [];
    let hasMore = true;
    let cursor = undefined;
    while (hasMore) {
      const r = await notion.databases.query({
        database_id: DATABASE_ID,
        page_size: 100,
        start_cursor: cursor,
      });
      all = all.concat(r.results);
      hasMore = r.has_more;
      cursor = r.next_cursor;
    }

    const acts = all.map(pageToActivity).filter(a => a.Deadline);

    // Escape conforme RFC 5545
    const esc = (s = "") =>
      String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//KPI Tracker Hikvision//PT-BR//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:KPI Tracker - Pre-Sales Gov",
      "X-WR-TIMEZONE:America/Sao_Paulo",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
    ];

    acts.forEach(a => {
      const dl = a.Deadline.replace(/-/g, "");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${a.id}@kpi-tracker-hik`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dl}`);
      lines.push(`DTEND;VALUE=DATE:${dl}`);
      lines.push(`SUMMARY:${esc(`[KPI] ${a.Atividade || a.Categoria} - ${a["Cliente Final"] || ""}`)}`);
      lines.push(
        `DESCRIPTION:${esc(
          `Categoria: ${a.Categoria}\nIntegrador: ${a.Integrador}\nStatus: ${a.Status}\nEstado: ${a.Estado}`
        )}`
      );
      lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate");
    res.status(200).send(lines.join("\r\n"));
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}
