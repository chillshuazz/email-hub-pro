/**
 * SMTP autodiscovery + verification helpers (server-only).
 * Uses nodemailer for auth tests + native dns/net for low-level sondeo.
 */
import nodemailer from "nodemailer";
import { promises as dns } from "node:dns";
import { knownProviderForDomain, commonHostCandidates, PORT_COMBOS } from "../lib/smtp-known";

export type DetectStep = { ts: number; level: "info" | "ok" | "warn" | "error"; msg: string };
export type DetectResult = {
  found: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  error?: string;
};

export type AutoDetectInput = { email: string; password: string };

const TIMEOUT_MS = 7000;

/** Try to authenticate against a host:port with the given creds. Returns null on success, error msg otherwise. */
export async function tryAuth(host: string, port: number, secure: boolean, user: string, pass: string): Promise<string | null> {
  try {
    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user, pass },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
      tls: { rejectUnauthorized: false, minVersion: "TLSv1" },
    });
    await transporter.verify();
    transporter.close();
    return null;
  } catch (e: any) {
    return e?.message || String(e);
  }
}

/** Resolve A/AAAA — returns true if host has any DNS record. */
async function hostExists(host: string): Promise<boolean> {
  try {
    await dns.lookup(host);
    return true;
  } catch {
    return false;
  }
}

/** Try Mozilla Thunderbird ISPDB autoconfig. */
async function tryISPDB(domain: string): Promise<{ host: string; port: number; secure: boolean } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://autoconfig.thunderbird.net/v1.1/${domain}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const xml = await res.text();
    return parseAutoconfigXml(xml);
  } catch { return null; }
}

/** Try the dominio's own autoconfig endpoints. */
async function tryDomainAutoconfig(domain: string): Promise<{ host: string; port: number; secure: boolean } | null> {
  const urls = [
    `https://autoconfig.${domain}/mail/config-v1.1.xml`,
    `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml`,
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const xml = await res.text();
      const cfg = parseAutoconfigXml(xml);
      if (cfg) return cfg;
    } catch { continue; }
  }
  return null;
}

function parseAutoconfigXml(xml: string): { host: string; port: number; secure: boolean } | null {
  // Regex-based parse (sin DOM en server). Extrae primer outgoingServer SMTP.
  const block = xml.match(/<outgoingServer[^>]*type="smtp"[^>]*>[\s\S]*?<\/outgoingServer>/i);
  if (!block) return null;
  const host = block[0].match(/<hostname>([^<]+)<\/hostname>/i)?.[1];
  const port = parseInt(block[0].match(/<port>(\d+)<\/port>/i)?.[1] ?? "0", 10);
  const sock = block[0].match(/<socketType>([^<]+)<\/socketType>/i)?.[1]?.toLowerCase() ?? "";
  if (!host || !port) return null;
  const secure = sock === "ssl" || port === 465;
  return { host, port, secure };
}

/** DNS SRV: _submission._tcp.{domain} */
async function trySRV(domain: string): Promise<{ host: string; port: number; secure: boolean }[]> {
  const out: { host: string; port: number; secure: boolean }[] = [];
  for (const [name, secure] of [["_submissions._tcp", true], ["_submission._tcp", false]] as const) {
    try {
      const recs = await dns.resolveSrv(`${name}.${domain}`);
      for (const r of recs) {
        if (r.name && r.name !== ".") out.push({ host: r.name.replace(/\.$/, ""), port: r.port, secure });
      }
    } catch { /* no SRV */ }
  }
  return out;
}

/** Use MX records to derive candidate SMTP hosts (mx → smtp.<base>). */
async function tryMXDerive(domain: string): Promise<string[]> {
  try {
    const mx = await dns.resolveMx(domain);
    const hosts = new Set<string>();
    for (const m of mx) {
      const h = m.exchange.replace(/\.$/, "");
      hosts.add(h);
      // Replace mx prefix with smtp
      hosts.add(h.replace(/^mx\d*\./i, "smtp."));
      hosts.add(h.replace(/^mx\d*\./i, "mail."));
      // base domain → smtp.<base>
      const parts = h.split(".");
      if (parts.length >= 2) {
        const base = parts.slice(-2).join(".");
        hosts.add(`smtp.${base}`);
        hosts.add(`mail.${base}`);
      }
    }
    return Array.from(hosts);
  } catch { return []; }
}

/**
 * Main autodetect cascade. `onStep` is called for each progress event so the
 * caller can persist them to DB for live UI streaming.
 */
export async function autodetectSmtp(
  input: AutoDetectInput,
  onStep: (s: DetectStep) => void | Promise<void>,
): Promise<DetectResult> {
  const { email, password } = input;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return { found: false, error: "Email inválido" };

  const step = (level: DetectStep["level"], msg: string) => onStep({ ts: Date.now(), level, msg });

  await step("info", `Iniciando auto-detección para ${email}`);

  // 1) Known providers
  const known = knownProviderForDomain(domain);
  if (known) {
    await step("info", `Proveedor conocido: ${known.host}:${known.port} (${known.secure ? "SSL" : "STARTTLS"})`);
    const err = await tryAuth(known.host, known.port, known.secure, email, password);
    if (!err) {
      await step("ok", `Autenticación correcta en ${known.host}`);
      return { found: true, host: known.host, port: known.port, secure: known.secure };
    }
    await step("warn", `Auth falló en proveedor conocido: ${err}. Continuando...`);
  } else {
    await step("info", `Dominio ${domain} no está en lista de proveedores conocidos`);
  }

  // 2) ISPDB (Thunderbird)
  await step("info", "Consultando Mozilla ISPDB (Thunderbird autoconfig)...");
  const ispdb = await tryISPDB(domain);
  if (ispdb) {
    await step("info", `ISPDB: ${ispdb.host}:${ispdb.port}`);
    const err = await tryAuth(ispdb.host, ispdb.port, ispdb.secure, email, password);
    if (!err) {
      await step("ok", `Autenticación correcta vía ISPDB en ${ispdb.host}`);
      return { found: true, ...ispdb };
    }
    await step("warn", `Auth falló (ISPDB): ${err}`);
  } else {
    await step("info", "No encontrado en ISPDB");
  }

  // 3) Dominio's own autoconfig
  await step("info", "Buscando autoconfig en el propio dominio...");
  const own = await tryDomainAutoconfig(domain);
  if (own) {
    await step("info", `autoconfig dominio: ${own.host}:${own.port}`);
    const err = await tryAuth(own.host, own.port, own.secure, email, password);
    if (!err) {
      await step("ok", `Autenticación correcta vía autoconfig dominio en ${own.host}`);
      return { found: true, ...own };
    }
    await step("warn", `Auth falló (autoconfig): ${err}`);
  } else {
    await step("info", "Sin autoconfig en el dominio");
  }

  // 4) DNS SRV
  await step("info", "Resolviendo DNS SRV (_submission._tcp / _submissions._tcp)...");
  const srvs = await trySRV(domain);
  if (srvs.length) {
    for (const cfg of srvs) {
      await step("info", `SRV: ${cfg.host}:${cfg.port} (${cfg.secure ? "SSL" : "STARTTLS"})`);
      const err = await tryAuth(cfg.host, cfg.port, cfg.secure, email, password);
      if (!err) {
        await step("ok", `Autenticación correcta vía SRV en ${cfg.host}`);
        return { found: true, ...cfg };
      }
      await step("warn", `Auth falló (SRV ${cfg.host}): ${err}`);
    }
  } else {
    await step("info", "Sin registros SRV");
  }

  // 5) Hosts candidatos (comunes + derivados de MX) × combinaciones de puerto
  await step("info", "Probando hosts SMTP comunes para el dominio...");
  const mxHosts = await tryMXDerive(domain);
  if (mxHosts.length) await step("info", `Derivados de MX: ${mxHosts.join(", ")}`);
  const candidates = Array.from(new Set([...mxHosts, ...commonHostCandidates(domain)]));

  // Filtrar por DNS válido en paralelo
  const dnsChecks = await Promise.all(candidates.map(async (h) => ({ h, ok: await hostExists(h) })));
  const aliveHosts = dnsChecks.filter((x) => x.ok).map((x) => x.h);
  await step("info", `Hosts con DNS válido: ${aliveHosts.length} de ${candidates.length}`);

  if (!aliveHosts.length) {
    await step("error", "Ningún host candidato resuelve DNS. No se pudo detectar.");
    return { found: false, error: "Ningún host SMTP encontrado para este dominio" };
  }

  for (const host of aliveHosts) {
    for (const combo of PORT_COMBOS) {
      await step("info", `Probando ${host}:${combo.port} (${combo.label})...`);
      const err = await tryAuth(host, combo.port, combo.secure, email, password);
      if (!err) {
        await step("ok", `¡Conectado y autenticado en ${host}:${combo.port}!`);
        return { found: true, host, port: combo.port, secure: combo.secure };
      }
      // Si el error es de auth (no de conexión), el host es correcto pero las credenciales no
      const lower = err.toLowerCase();
      if (lower.includes("auth") || lower.includes("535") || lower.includes("credentials") || lower.includes("login") || lower.includes("password")) {
        await step("error", `Servidor encontrado en ${host}:${combo.port} pero credenciales rechazadas: ${err}`);
        return { found: false, error: `Servidor SMTP encontrado en ${host}:${combo.port} pero las credenciales son incorrectas` };
      }
    }
  }

  await step("error", "No se encontró configuración SMTP funcional");
  return { found: false, error: "No se pudo encontrar el servidor SMTP. Configúralo manualmente." };
}
