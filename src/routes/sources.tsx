import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { ShieldAlert, Server, Sparkles } from "lucide-react";

export const Route = createFileRoute("/sources")({ component: SourcesPage });

const recommended = [
  { name: "Office 365 Business", desc: "Para empresas. Buena reputación, ideal para correo transaccional y comunicación interna.", price: "$6/usuario/mes", host: "smtp.office365.com:587" },
  { name: "Google Workspace", desc: "SMTP de Gmail con dominio propio. Excelente entrega, requiere contraseña de aplicación.", price: "$6/usuario/mes", host: "smtp.gmail.com:465" },
  { name: "SendGrid", desc: "Especializado en envíos masivos y transaccionales. Plan gratis: 100 correos/día.", price: "Gratis hasta 100/día", host: "smtp.sendgrid.net:587" },
  { name: "Mailgun", desc: "API y SMTP para developers. Excelente reputación de entrega.", price: "Plan flex desde $0", host: "smtp.mailgun.org:587" },
  { name: "Brevo (ex Sendinblue)", desc: "300 correos gratis al día. Buena opción para marketing.", price: "Gratis 300/día", host: "smtp-relay.brevo.com:587" },
  { name: "Amazon SES", desc: "Lo más barato para volumen alto. Requiere salir del sandbox de AWS.", price: "$0.10 por 1.000 correos", host: "email-smtp.us-east-1.amazonaws.com:587" },
];

function SourcesPage() {
  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Fuentes de SMTP"
        description="Proveedores recomendados para configurar como SMTP en MailPilot."
      />

      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 mb-8 flex gap-4">
        <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm space-y-2">
          <div className="font-semibold text-destructive">Sobre "extraer SMTPs gratuitos de internet"</div>
          <p className="text-foreground/90">
            Pediste que el sistema busque y extraiga servidores SMTP abiertos en la web.
            <strong> No lo voy a implementar</strong>, y quiero ser honesto contigo del por qué:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-foreground/80">
            <li><strong>Es ilegal en la mayoría de países.</strong> Usar credenciales SMTP que no te pertenecen es acceso no autorizado a sistemas informáticos (CFAA en EE.UU., Ley 1273 en Colombia, equivalentes en LATAM/UE).</li>
            <li><strong>No funcionan.</strong> Hace 15 años existían "open relays" abiertos. Hoy todos están cerrados, en blacklists o son <em>honeypots</em> de fuerzas de seguridad para identificar a quien los usa.</li>
            <li><strong>Tu dominio queda quemado.</strong> Cualquier correo enviado por servidores así marca tu remitente como spam permanentemente.</li>
            <li><strong>Te exponen a ti.</strong> Tu IP queda registrada al conectarte; muchos de esos servidores pertenecen a redes criminales que recolectan datos de quien los usa.</li>
          </ul>
          <p className="text-foreground/90">
            La solución real es usar un proveedor legítimo. Abajo te dejo las mejores opciones, varias con planes gratuitos generosos.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold text-lg">Proveedores recomendados</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommended.map((r) => (
          <div key={r.name} className="glass rounded-xl border border-border p-5 hover:border-primary/40 transition">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs px-2 py-0.5 rounded-md bg-success/15 text-success">{r.price}</div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
                <div className="text-xs font-mono text-muted-foreground mt-2">{r.host}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
