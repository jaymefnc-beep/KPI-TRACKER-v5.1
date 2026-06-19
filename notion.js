import { Client } from "@notionhq/client";
export const notion = new Client({ auth: process.env.NOTION_TOKEN });
export const DATABASE_ID = process.env.NOTION_DATABASE_ID;
export function pageToActivity(page) {
  const p = page.properties;
  const get = (key, type) => {
    const prop = p[key];
    if (!prop) return "";
    if (type === "title") return prop.title?.[0]?.plain_text || "";
    if (type === "select") return prop.select?.name || "";
    if (type === "rich_text") return prop.rich_text?.[0]?.plain_text || "";
    if (type === "number") return prop.number ?? "";
    if (type === "date") return prop.date?.start || "";
    return "";
  };
  return {
    id: page.id,
    Atividade: get("Atividade", "title"),
    Categoria: get("Categoria", "select"),
    Etapa: get("Etapa", "select"),
    Status: get("Status", "select"),
    "Cliente Final": get("Cliente Final", "rich_text"),
    Integrador: get("Integrador", "rich_text"),
    Quarter: get("Quarter", "select"),
    "Valor (R$)": get("Valor (R$)", "number"),
    "Meta Quarter (R$)": get("Meta Quarter (R$)", "number"),
    Data: get("Data", "date"),
    Observações: get("Observações", "rich_text"),
  };
}
export function activityToProperties(data) {
  const props = {};
  if (data.Atividade !== undefined) props["Atividade"] = { title: [{ text: { content: data.Atividade || "" } }] };
  if (data.Categoria) props["Categoria"] = { select: { name: data.Categoria } };
  if (data.Etapa) props["Etapa"] = { select: { name: data.Etapa } };
  else props["Etapa"] = { select: null };
  if (data.Status) props["Status"] = { select: { name: data.Status } };
  if (data["Cliente Final"] !== undefined) props["Cliente Final"] = { rich_text: [{ text: { content: data["Cliente Final"] || "" } }] };
  if (data.Integrador !== undefined) props["Integrador"] = { rich_text: [{ text: { content: data.Integrador || "" } }] };
  if (data.Quarter) props["Quarter"] = { select: { name: data.Quarter } };
  if (data["Valor (R$)"] !== undefined && data["Valor (R$)"] !== "") props["Valor (R$)"] = { number: parseFloat(data["Valor (R$)"]) || null };
  if (data["Meta Quarter (R$)"] !== undefined && data["Meta Quarter (R$)"] !== "") props["Meta Quarter (R$)"] = { number: parseFloat(data["Meta Quarter (R$)"]) || null };
  if (data.Data) props["Data"] = { date: { start: data.Data } };
  if (data.Observações !== undefined) props["Observações"] = { rich_text: [{ text: { content: data.Observações || "" } }] };
  return props;
}
