import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useLists, uid } from "../lib/store";
import { PageHeader } from "../components/PageHeader";
import type { Contact, ContactList } from "../lib/types";
import { Upload, Trash2, Download, Search, Filter, X } from "lucide-react";

export const Route = createFileRoute("/lists")({ component: ListsPage });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectKey(keys: string[], candidates: string[]) {
  const lower = keys.map((k) => k.toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.findIndex((k) => k === c || k.includes(c));
    if (i >= 0) return keys[i];
  }
  return null;
}

function rowsToContacts(rows: Record<string, unknown>[]): Contact[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  const emailKey = detectKey(keys, ["email", "correo", "e-mail", "mail"]);
  const nameKey = detectKey(keys, ["name", "nombre", "first name", "fullname"]);
  const phoneKey = detectKey(keys, ["phone", "telefono", "teléfono", "celular", "mobile"]);

  const contacts: Contact[] = [];
  for (const row of rows) {
    const email = String(emailKey ? row[emailKey] ?? "" : Object.values(row)[0] ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) continue;
    const extra: Record<string, string> = {};
    for (const k of keys) {
      if (k === emailKey || k === nameKey || k === phoneKey) continue;
      const v = row[k];
      if (v != null && String(v).trim() !== "") extra[k] = String(v);
    }
    contacts.push({
      id: uid(),
      email,
      name: nameKey ? String(row[nameKey] ?? "").trim() || undefined : undefined,
      phone: phoneKey ? String(row[phoneKey] ?? "").trim() || undefined : undefined,
      extra: Object.keys(extra).length ? extra : undefined,
    });
  }
  return contacts;
}

function ListsPage() {
  const [lists, setLists] = useLists();
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<"new" | string>("new");
  const [newListName, setNewListName] = useState("");

  const onFile = async (file: File) => {
    let rows: Record<string, unknown>[] = [];
    if (file.name.endsWith(".csv") || file.type === "text/csv") {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      rows = parsed.data as Record<string, unknown>[];
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }
    const contacts = rowsToContacts(rows);
    if (contacts.length === 0) { alert("No se encontraron correos válidos."); return; }

    if (importTarget === "new") {
      const name = newListName.trim() || file.name.replace(/\.[^.]+$/, "");
      const list: ContactList = { id: uid(), name, contacts: dedupe(contacts), createdAt: Date.now() };
      setLists((p) => [list, ...p]);
      setSelected(list.id);
      setNewListName("");
    } else {
      setLists((p) => p.map((l) => (l.id === importTarget ? { ...l, contacts: dedupe([...l.contacts, ...contacts]) } : l)));
      setSelected(importTarget);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const dedupe = (cs: Contact[]) => {
    const seen = new Set<string>();
    const out: Contact[] = [];
    for (const c of cs) {
      const key = c.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  };

  const current = lists.find((l) => l.id === selected) ?? lists[0];

  return (
    <div className="p-10 max-w-7xl">
      <PageHeader
        title="Listas de contactos"
        description="Importa CSV/XLSX con correos, nombres, teléfonos o cualquier columna extra. Deduplicación automática."
      />

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
                <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Nombre de la lista (opcional)" className={inputCls} />
              )}
              <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium text-sm shadow-glow">
                <Upload className="h-4 w-4" /> Subir CSV / XLSX
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <p className="text-[11px] text-muted-foreground">Detecta columnas: email, nombre, teléfono y conserva el resto.</p>
            </div>
          </div>

          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-3 text-sm font-medium border-b border-border">Mis listas ({lists.length})</div>
            <div className="max-h-[60vh] overflow-y-auto">
              {lists.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Sin listas todavía</div>
              ) : (
                lists.map((l) => (
                  <button key={l.id} onClick={() => setSelected(l.id)} className={`w-full text-left p-3 border-b border-border/60 last:border-0 hover:bg-accent/40 transition ${current?.id === l.id ? "bg-accent/60" : ""}`}>
                    <div className="font-medium text-sm truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.contacts.length.toLocaleString()} contactos</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {current ? (
            <ListDetail
              key={current.id}
              list={current}
              onChange={(updated) => setLists((p) => p.map((l) => (l.id === updated.id ? updated : l)))}
              onDelete={() => { setLists((p) => p.filter((l) => l.id !== current.id)); setSelected(null); }}
            />
          ) : (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
              Selecciona o crea una lista para verla aquí.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ListDetail({ list, onChange, onDelete }: { list: ContactList; onChange: (l: ContactList) => void; onDelete: () => void }) {
  const [q, setQ] = useState("");
  const filtered = list.contacts.filter((c) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return c.email.includes(t) || c.name?.toLowerCase().includes(t) || c.phone?.includes(t);
  });

  const exportCsv = () => {
    const cols = new Set<string>(["email", "name", "phone"]);
    list.contacts.forEach((c) => c.extra && Object.keys(c.extra).forEach((k) => cols.add(k)));
    const headers = Array.from(cols);
    const rows = list.contacts.map((c) => headers.map((h) => {
      if (h === "email") return c.email;
      if (h === "name") return c.name ?? "";
      if (h === "phone") return c.phone ?? "";
      return c.extra?.[h] ?? "";
    }));
    const csv = Papa.unparse([headers, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${list.name}.csv`;
    a.click();
  };

  const dedupe = () => {
    const seen = new Set<string>();
    const out = list.contacts.filter((c) => {
      const k = c.email.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const removed = list.contacts.length - out.length;
    onChange({ ...list, contacts: out });
    alert(removed ? `Se eliminaron ${removed} duplicados.` : "No hay duplicados.");
  };

  const remove = (id: string) => onChange({ ...list, contacts: list.contacts.filter((c) => c.id !== id) });

  return (
    <div className="glass rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-lg">{list.name}</div>
          <div className="text-xs text-muted-foreground">{list.contacts.length.toLocaleString()} contactos · creada {new Date(list.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={dedupe} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition"><Filter className="h-3.5 w-3.5" /> Quitar duplicados</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent transition"><Download className="h-3.5 w-3.5" /> Exportar CSV</button>
          <button onClick={() => confirm("¿Eliminar esta lista?") && onDelete()} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 transition"><Trash2 className="h-3.5 w-3.5" /> Eliminar lista</button>
        </div>
      </div>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por email, nombre o teléfono..." className={inputCls + " pl-9"} />
        </div>
      </div>
      <div className="overflow-auto max-h-[60vh]">
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
                  <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 500 && <div className="p-3 text-center text-xs text-muted-foreground">Mostrando primeros 500 de {filtered.length.toLocaleString()}.</div>}
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring";
