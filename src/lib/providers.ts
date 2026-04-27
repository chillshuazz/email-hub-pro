import type { SmtpAccount } from "./types";

export const SMTP_PROVIDERS: Array<{
  id: SmtpAccount["provider"];
  name: string;
  host: string;
  port: number;
  secure: boolean;
  hint?: string;
}> = [
  { id: "office365", name: "Office 365 / Outlook 365", host: "smtp.office365.com", port: 587, secure: false, hint: "Requiere STARTTLS y autenticación moderna activada." },
  { id: "gmail", name: "Gmail", host: "smtp.gmail.com", port: 465, secure: true, hint: "Necesita contraseña de aplicación." },
  { id: "outlook", name: "Outlook.com / Hotmail", host: "smtp-mail.outlook.com", port: 587, secure: false },
  { id: "yahoo", name: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 465, secure: true },
  { id: "sendgrid", name: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false, hint: "Usuario: 'apikey', Contraseña: tu API key." },
  { id: "mailgun", name: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
  { id: "custom", name: "Personalizado", host: "", port: 587, secure: false },
];
