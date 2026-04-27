import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "../components/PageHeader";
import { Upload, Trash2, Download, Search, Filter, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lists")({ component: ListsPage });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Contact = { email: string; name: string | null; phone: string | null; extra: Record<string, string> | null };
type DBList = { id: string; name: string; created_at: string; count?: number };

function detectKey(keys: string[], cands: string[]) {
  const lower = keys.map((k) => k.toLowerCase().trim());
  for (const c of cands) {
    const i = lower.findIndex((k) => k === c || k.includes(c));
    if (i >= 0) return keys[i];
  }
  return null;
}

function rowsToContacts(rows: Record<string, unknown>[]): Contact[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const emailKey = detectKey(keys, ["email", "correo", "e-mail", "mail"]);
  const nameKey = detectKey(keys, ["name", "nombre", "first name", "fullname"]);
  const phoneKey = detectKey(keys, ["phone", "telefono", "teléfono", "celular", "mobile"]);
  const seen = new Set<string>();
  const out: Contact[] = [];
  for (const row of rows) {
    const email = String(emailKey ? row[emailKey] ?? "" : Object.values(row)[0] ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    const extra: Record<string, string> = {};
    for (const k of keys) {
      if (k === emailKey || k === nameKey || k === phoneKey) continue;
      const v = row[k];
      if (v != null && String(v).trim() !== "") extra[k] = String(v);
    }
    out.push({
      email,
      name: nameKey ? String(row[nameKey] ?? "").trim() || null : null,
      phone: phoneKey ? String(row[phoneKey] ?? "").trim() || null : null,
      extra: Object.keys(extra).length ? extra : null,
    });
  }
  return out;
}

function ListsPage() {
  const [lists, setLists] = useState<DBList[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<string>("new");
  const [newListName, setNewListName] = useState("");
  const [importing, setImporting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("contact_lists").select("id, name, created_at").order("created_at", { ascending: false });
    if (!data) { setLists([]); return; }
    // Conteo en paralelo
    const counts = await Promise.all(data.map(async (l) => {
      const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true }).eq("list_id", l.id);
      return { ...l, count: count ?? 0 };
    }));
    setLists(counts);
  };

  useEffect(() => { load(); }, []);

  const onFile = async (file: File) => {
    setImporting(true);
    try {
      let rows: Record<string, unknown>[] = [];
      if (file.name.match(/\.csv$/i)) {
        const text = await file.text();
        rows = (Papa.parse(text, { header: true, skipEmptyLines: true }).data as Record<string, unknown>[]);
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      }
      const contacts = rowsToContacts(rows);
      if (!contacts.length) { toast.error("No se encontraron correos válidos"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("No autenticado"); return; }

      let listId = importTarget;
      if (importTarget === "new") {
        const name = newListName.trim() || file.name.replace(/\.[^.]+$/, "");
        const { data: list, error } = await supabase.from("contact_lists")
          .insert({ user_id: user.id, name }).select("id").single();
        if (error || !list) throw new Error(error?.message ?? "Error creando lista");
        listId = list.id;
      }

      // Insertar por lotes
      const BATCH = 500;
      let inserted = 0;
      for (let i = 0; i < contacts.length; i += BATCH) {
        const chunk = contacts.slice(i, i + BATCH).map((c) => ({
          list_id: listId, user_id: user.id,
          email: c.email, name: c.name, phone: c.phone, extra: c.extra ?? {},
        }));
        const { error } = await supabase.from("contacts").upsert(chunk, { onConflict: "list_id,email" });
        if (error) console.error(error);
        else inserted += chunk.length;
      }

      toast.success(`Importados ${inserted} contactos (deduplicados)`);
      setNewListName("");
      if (fileRef.current) fileRef.current.value = "";
      setSelectedId(listId);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Error importando");
    } finally {
      setImporting(false);
    }
  };

  const current = lists.find((l) => l.id === selectedId) ?? lists[0];

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader title="Listas de contactos"
        description="Importa CSV/XLSX. Deduplicación automática a nivel de base de datos. Soporta listas grandes." />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="glass rounded-xl border border-border p-4">
            <div className="text-sm font-medium mb-3">Importar archivo</div>
            <div className="space-y-2">
              <select value={importTarget} onChange={(e) => setImportTarget(e.target.value)} className={inputCls}>
                <option value="new">→ Crear lista nueva</option>
                {lists.map((l) => (<option key={l.id} value={l.id}>Añadir a: {l.name}</option>))}
              </select>
              {importTarget === "new" && (
                <input value={newListName} onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Nombre (opcional)" className={inputCls} />
              )}
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium text-sm shadow-glow disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Importando..." : "Subir CSV / XLSX"}
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <p className="text-[11px] text-muted-foreground">Detecta: email, nombre, teléfono. Conserva el resto como extra.</p>
            </div>
          </div>

          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-3 text-sm font-medium border-b border-border">Mis listas ({lists.length})</div>
            <div className="max-h-[60vh] overflow-y-auto">
              {lists.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Sin listas todavía</div>
              ) : lists.map((l) => (
                <button key={l.id} onClick={() => setSelectedId(l.id)}
                  className={`w-full text-left p-3 border-b border-border/60 last:border-0 hover:bg-accent/40 transition ${current?.id === l.id ? "bg-accent/60" : ""}`}>
                  <div className="font-medium text-sm truncate">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{(l.count ?? 0).toLocaleString()} contactos</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {current ? (
            <ListDetail key={current.id} list={current} onChanged={load} onDeleted={() => { setSelectedId(null); load(); }} />
          ) : (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
              Importa un archivo para empezar.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ListDetail({ list, onChanged, onDeleted }: { list: DBList; onChanged: () => void; onDeleted: () => void }) {
  const [contacts, setContacts] = useState<(Contact & { id: string })[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from("contacts").select("id, email, name, phone, extra")
      .eq("list_id", list.id).order("created_at", { ascending: false }).limit(2000)
      .then(({ data }) => { setContacts((data as any) ?? []); setLoading(false); });
  }, [list.id]);

  const filtered = contacts.filter((c) => !q || c.email.includes(q.toLowerCase()) ||
    c.name?.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q));

  const exportCsv = async () => {
    // Trae todo (paginado)
    const all: any[] = [];
    let from = 0; const PAGE = 1000;
    while (true) {
      const { data } = await supabase.from("contacts")
        .select("email, name, phone, extra").eq("list_id", list.id)
        .range(from, from + PAGE - 1);
      if (!data || !data.length) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const cols = new Set<string>(["email", "name", "phone"]);
    all.forEach((c) => c.extra && Object.keys(c.extra).forEach((k) => cols.add(k)));
    const headers = Array.from(cols);
    const rows = all.map((c) => headers.map((h) =>
      h === "email" ? c.email : h === "name" ? c.name ?? "" : h === "phone" ? c.phone ?? "" : (c.extra?.[h] ?? "")
    ));
    const csv = Papa.unparse([headers, ...rows]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${list.name}.csv`;
    a.click();
    toast.success(`Exportados ${all.length} contactos`);
  };

  const removeContact = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    setContacts((p) => p.filter((c) => c.id !== id));
    onChanged();
  };

  const removeList = async () => {
    if (!confirm(`Eliminar lista "${list.name}" y todos sus contactos?`)) return;
    await supabase.from("contact_lists").delete().eq("id", list.id);
    toast.success("Lista eliminada");
    onDeleted();
  };

  return (
    <div className="glass rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-lg">{list.name}</div>
          <div className="text-xs text-muted-foreground">
            {(list.count ?? 0).toLocaleString()} contactos · creada {new Date(list.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button onClick={removeList} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      </div>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className={inputCls + " pl-9"} />
        </div>
      </div>
      <div className="overflow-auto max-h-[60vh]">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Nombre</th>
                <th className="text-left px-4 py-2.5">Teléfono</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((c) => (
                <tr key={c.id} className="border-t border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-2 font-mono text-xs">{c.email}</td>
                  <td className="px-4 py-2">{c.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeContact(c.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 500 && <div className="p-3 text-center text-xs text-muted-foreground">Mostrando 500 de {filtered.length}. Exporta CSV para ver todos.</div>}
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring";
