# Plan: MailPilot con auto-detección SMTP

## Lo que pediste (entendido correctamente)
El usuario solo introduce `email@dominio.com` + contraseña. La app:
1. Detecta automáticamente el servidor SMTP correcto.
2. Prueba todas las combinaciones posibles (host, puerto, seguridad).
3. Cuando una funciona, la guarda lista para enviar.

Esto es **autodiscovery SMTP**, exactamente como Thunderbird/Outlook. Totalmente legal — solo se conecta al servidor del propio dominio del usuario con sus propias credenciales.

---

## Parte 1 — Activar Lovable Cloud (necesario)
Sin backend no se puede hablar SMTP desde el navegador. Activamos:
- PostgreSQL para credenciales cifradas, listas grandes, resultados de envíos.
- Server functions de TanStack Start con `nodemailer` y `net`/`tls` nativos.
- Auth email/password con RLS por usuario.

**Tablas:** `smtp_accounts`, `contact_lists`, `contacts`, `campaigns`, `campaign_sends`. Todas con RLS por `auth.uid()`. Roles en tabla `user_roles` separada.

---

## Parte 2 — Auto-detección SMTP (núcleo del trabajo)

Server function `autodetectSmtp({ email, password })` que ejecuta esta cascada:

### Paso 1: Base de datos de proveedores conocidos (instantáneo)
Si el dominio coincide con un proveedor conocido (`gmail.com`, `outlook.com`, `office365.com`, `yahoo.com`, `hotmail.com`, `icloud.com`, `zoho.com`, `protonmail.com`, ~50 más), usa la config oficial directamente. Probamos auth y listo.

### Paso 2: Mozilla ISPDB (autoconfig oficial)
Consulta `https://autoconfig.thunderbird.net/v1.1/{dominio}` — la base de datos pública que usa Thunderbird, con configs oficiales de miles de proveedores. Si responde, parseamos el XML y probamos auth.

### Paso 3: Autodiscover del propio dominio (estándar RFC 6186)
Intenta en orden:
- `https://autoconfig.{dominio}/mail/config-v1.1.xml`
- `https://{dominio}/.well-known/autoconfig/mail/config-v1.1.xml`
- DNS SRV: `_submission._tcp.{dominio}` y `_submissions._tcp.{dominio}`
- DNS MX del dominio → derivar posibles SMTPs

### Paso 4: Brute-force inteligente de hosts
Si nada de lo anterior funciona, probamos hosts comunes contra el dominio:
```
smtp.{dominio}, mail.{dominio}, smtpout.{dominio}, 
smtp.mail.{dominio}, send.{dominio}, outgoing.{dominio},
mx.{dominio}, mailserver.{dominio}, correo.{dominio}, 
relay.{dominio}, post.{dominio}
```

### Paso 5: Combinatoria de puertos y seguridad
Para cada host candidato que resuelva DNS, probamos en paralelo:
- Puerto 587 + STARTTLS
- Puerto 465 + SSL/TLS implícito
- Puerto 25 + STARTTLS
- Puerto 2525 + STARTTLS (alternativo común)

### Paso 6: Prueba de autenticación real
Por cada combinación válida (TCP conecta + handshake TLS OK):
- AUTH LOGIN con las credenciales del usuario.
- Si autentica → ¡encontrado! Guarda la config y termina.
- Si rechaza → continúa con la siguiente combinación.

### Resultado en UI
Stream en tiempo real (SSE o polling) mostrando cada intento:
```
✓ Resolviendo dominio... ejemplo.com
✓ Consultando Mozilla ISPDB... no encontrado
✓ Probando autoconfig.ejemplo.com... no responde
✓ DNS SRV _submission._tcp.ejemplo.com... no encontrado
⏳ Probando smtp.ejemplo.com:587 STARTTLS... conectado
⏳ Autenticando... ✓ ÉXITO
✅ Configuración encontrada: smtp.ejemplo.com:587 STARTTLS
```

Tiempo total típico: 2-15 segundos. Máximo 30s con timeout duro.

---

## Parte 3 — Verificación periódica real
Cron `pg_cron` cada 5 min → `/api/public/verify-smtps` (con secret) re-autentica todos los SMTPs guardados. Si uno falla, la UI lo marca en rojo **antes** de que lances campañas.

---

## Parte 4 — Envío real de campañas
Server function `sendCampaign(campaignId)`:
- Lee lista paginada (soporta 100k+ contactos).
- Deduplica por email a nivel SQL.
- Interpola `{{name}}`, `{{phone}}`, etc.
- Envía por lotes con `nodemailer` y throttling (correos/min).
- Guarda resultado por destinatario en `campaign_sends`.
- Progreso en vivo en la UI.

---

## Parte 5 — Listas (migrar a backend)
- Import CSV/XLSX en streaming → inserción por lotes.
- Mapeo automático de columnas (nombre, email, teléfono, custom).
- Deduplicación SQL `UNIQUE(list_id, email)`.
- Export CSV/XLSX desde el servidor.

---

## Parte 6 — Dashboard
- SMTPs activos / caídos.
- Correos enviados hoy/semana, bounce rate.
- Alertas en vivo cuando un SMTP falla.

---

## Detalles técnicos
- **Backend:** Lovable Cloud + server functions TanStack Start.
- **SMTP:** `nodemailer` (envío + auth tester); `net`/`tls`/`dns` nativos para sondeo de bajo nivel y resolución DNS/SRV/MX.
- **Cifrado:** `pgp_sym_encrypt` con clave en secret de Lovable Cloud.
- **Cron:** `pg_cron` cada 5 min con header `x-cron-secret`.
- **RLS:** todas las tablas filtradas por `user_id = auth.uid()`.
- **Validación:** Zod cliente + servidor.
- **Concurrencia:** las pruebas combinatorias corren en paralelo con `Promise.allSettled` y timeout por intento de 5s para que el autodetect no se eternice.

---

## UI del flujo nuevo
En `/smtps` el botón "Nuevo SMTP" mostrará dos modos:
- **Modo automático (default):** solo email + contraseña → autodetect.
- **Modo manual:** los campos actuales (host, puerto, etc.) para casos exóticos.

---

¿Procedo con todo esto?
