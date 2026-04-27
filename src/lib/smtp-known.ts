// Conocidos: dominio → config SMTP oficial. Los más comunes para evitar latencia de DNS.
export type KnownProvider = { host: string; port: number; secure: boolean; hint?: string };

const KNOWN: Record<string, KnownProvider> = {
  "gmail.com":       { host: "smtp.gmail.com", port: 465, secure: true, hint: "Necesita contraseña de aplicación" },
  "googlemail.com":  { host: "smtp.gmail.com", port: 465, secure: true },
  "outlook.com":     { host: "smtp-mail.outlook.com", port: 587, secure: false },
  "hotmail.com":     { host: "smtp-mail.outlook.com", port: 587, secure: false },
  "live.com":        { host: "smtp-mail.outlook.com", port: 587, secure: false },
  "msn.com":         { host: "smtp-mail.outlook.com", port: 587, secure: false },
  "office365.com":   { host: "smtp.office365.com", port: 587, secure: false },
  "yahoo.com":       { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  "yahoo.es":        { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  "yahoo.com.mx":    { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  "ymail.com":       { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  "icloud.com":      { host: "smtp.mail.me.com", port: 587, secure: false },
  "me.com":          { host: "smtp.mail.me.com", port: 587, secure: false },
  "mac.com":         { host: "smtp.mail.me.com", port: 587, secure: false },
  "aol.com":         { host: "smtp.aol.com", port: 465, secure: true },
  "zoho.com":        { host: "smtp.zoho.com", port: 465, secure: true },
  "zohomail.com":    { host: "smtp.zoho.com", port: 465, secure: true },
  "protonmail.com":  { host: "smtp.protonmail.ch", port: 587, secure: false, hint: "Requiere ProtonMail Bridge" },
  "proton.me":       { host: "smtp.protonmail.ch", port: 587, secure: false },
  "gmx.com":         { host: "mail.gmx.com", port: 587, secure: false },
  "gmx.es":          { host: "mail.gmx.com", port: 587, secure: false },
  "gmx.net":         { host: "mail.gmx.net", port: 587, secure: false },
  "mail.com":        { host: "smtp.mail.com", port: 587, secure: false },
  "yandex.com":      { host: "smtp.yandex.com", port: 465, secure: true },
  "yandex.ru":       { host: "smtp.yandex.ru", port: 465, secure: true },
  "fastmail.com":    { host: "smtp.fastmail.com", port: 465, secure: true },
  "fastmail.fm":     { host: "smtp.fastmail.com", port: 465, secure: true },
  "tutanota.com":    { host: "mail.tutanota.com", port: 465, secure: true },
  "qq.com":          { host: "smtp.qq.com", port: 465, secure: true },
  "163.com":         { host: "smtp.163.com", port: 465, secure: true },
  "126.com":         { host: "smtp.126.com", port: 465, secure: true },
  "naver.com":       { host: "smtp.naver.com", port: 465, secure: true },
  "daum.net":        { host: "smtp.daum.net", port: 465, secure: true },
  "sina.com":        { host: "smtp.sina.com", port: 465, secure: true },
  "rediffmail.com":  { host: "smtp.rediffmail.com", port: 465, secure: true },
  "sendgrid.net":    { host: "smtp.sendgrid.net", port: 587, secure: false },
};

export function knownProviderForDomain(domain: string): KnownProvider | null {
  return KNOWN[domain.toLowerCase()] ?? null;
}

export function commonHostCandidates(domain: string): string[] {
  return [
    `smtp.${domain}`,
    `mail.${domain}`,
    `smtpout.${domain}`,
    `smtp.mail.${domain}`,
    `smtp-mail.${domain}`,
    `send.${domain}`,
    `outgoing.${domain}`,
    `mx.${domain}`,
    `mailserver.${domain}`,
    `correo.${domain}`,
    `relay.${domain}`,
    `post.${domain}`,
    `mailout.${domain}`,
    `smtp1.${domain}`,
    `smtp2.${domain}`,
    domain,
  ];
}

export const PORT_COMBOS: Array<{ port: number; secure: boolean; label: string }> = [
  { port: 587, secure: false, label: "STARTTLS" },
  { port: 465, secure: true,  label: "SSL/TLS" },
  { port: 2525, secure: false, label: "STARTTLS (alt)" },
  { port: 25,  secure: false, label: "plain/STARTTLS" },
];
