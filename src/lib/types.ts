export type SmtpStatus = "unknown" | "checking" | "ok" | "error";

export interface SmtpAccount {
  id: string;
  label: string;
  provider: "office365" | "gmail" | "outlook" | "yahoo" | "sendgrid" | "mailgun" | "custom";
  host: string;
  port: number;
  secure: boolean; // SSL/TLS
  username: string;
  password: string;
  fromName?: string;
  fromEmail: string;
  status: SmtpStatus;
  lastChecked?: number;
  lastError?: string;
  createdAt: number;
}

export interface Contact {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  extra?: Record<string, string>;
}

export interface ContactList {
  id: string;
  name: string;
  contacts: Contact[];
  createdAt: number;
}

export interface Campaign {
  id: string;
  name: string;
  smtpId: string;
  listId: string;
  subject: string;
  body: string;
  createdAt: number;
  status: "draft" | "sending" | "sent";
  sent: number;
  failed: number;
}
