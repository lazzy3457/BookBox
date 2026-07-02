import nodemailer from "nodemailer";

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]!);
}

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string; html: string }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!host || !port || !user || !pass || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP configuration is incomplete.");
    console.warn("[email] SMTP is not configured; message skipped.");
    return false;
  }
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
  await transport.sendMail({ from, ...input });
  return true;
}
