export default function handler(req, res) {
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.status(200).send("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR");
}
