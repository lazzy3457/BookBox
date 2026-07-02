"use client";

import { Download, FileUp } from "lucide-react";
import { useState } from "react";

type Preview = {
  index: number;
  title: string;
  authors: string[];
  status: string;
  rating: number | null;
  state: "new" | "match" | "conflict" | "invalid";
  message: string;
};

export function LibraryImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, "keep" | "import">>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(action: "preview" | "confirm") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    form.set("action", action);
    form.set("resolutions", JSON.stringify(resolutions));
    try {
      const response = await fetch("/api/library/import", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Import impossible.");
      if (action === "preview") {
        setPreview(payload.preview);
        setResolutions(Object.fromEntries(payload.preview.filter((row: Preview) => row.state === "conflict").map((row: Preview) => [String(row.index), "keep"])));
        setMessage(`${payload.summary.new} nouveaux · ${payload.summary.matches} reconnus · ${payload.summary.conflicts} conflits · ${payload.summary.invalid} invalides`);
      } else {
        setPreview([]);
        setMessage(`${payload.summary.imported} importés · ${payload.summary.merged} fusionnés · ${payload.summary.skipped} ignorés · ${payload.summary.errors} erreurs`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-7 rounded border border-line bg-panel/80 p-5 shadow-poster">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-mint">Données</div>
          <h2 className="mt-1 text-xl font-black text-paper">Importer une bibliothèque</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Compatible avec l’export CSV Goodreads et le modèle BooksBox. Limite : 2 Mo et 2 000 livres.</p>
        </div>
        <a href="/api/library/import/template" className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-xs font-black text-muted hover:text-mint">
          <Download size={14} /> Modèle CSV
        </a>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview([]); }} className="text-sm text-muted" />
        <button disabled={!file || busy} onClick={() => send("preview")} className="inline-flex items-center gap-2 rounded bg-paper px-4 py-2 text-xs font-black text-ink disabled:opacity-40">
          <FileUp size={14} /> Prévisualiser
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-muted">{message}</p> : null}
      {preview.length ? (
        <div className="mt-5">
          <div className="max-h-[520px] overflow-auto rounded border border-line">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="sticky top-0 bg-ink text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-3">Livre</th><th className="p-3">Statut</th><th className="p-3">Résultat</th><th className="p-3">Décision</th></tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.index} className="border-t border-line">
                    <td className="p-3"><div className="font-black text-paper">{row.title || "Ligne invalide"}</div><div className="text-xs text-muted">{row.authors.join(", ")}</div></td>
                    <td className="p-3 text-muted">{row.status}{row.rating ? ` · ${row.rating}/5` : ""}</td>
                    <td className="p-3"><span className={row.state === "invalid" || row.state === "conflict" ? "text-coral" : "text-mint"}>{row.message}</span></td>
                    <td className="p-3">
                      {row.state === "conflict" ? (
                        <select value={resolutions[String(row.index)] ?? "keep"} onChange={(event) => setResolutions((current) => ({ ...current, [String(row.index)]: event.target.value as "keep" | "import" }))} className="h-9 rounded border border-line bg-ink px-2 text-paper">
                          <option value="keep">Garder BooksBox</option>
                          <option value="import">Utiliser l’import</option>
                        </select>
                      ) : <span className="text-xs text-muted">{row.state === "invalid" ? "Ignorée" : "Automatique"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button disabled={busy} onClick={() => send("confirm")} className="mt-4 rounded bg-mint px-5 py-3 text-sm font-black text-ink">Confirmer l’import</button>
        </div>
      ) : null}
    </section>
  );
}
