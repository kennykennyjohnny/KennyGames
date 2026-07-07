"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function postAdmin(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "erreur");
  return json;
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run(payload: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setErr(null);
    try {
      await postAdmin(payload);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, err };
}

const btn = "rounded px-3 py-1.5 text-sm font-bold uppercase tracking-[0.08em] transition disabled:opacity-50";

export function DraftActions({ id }: { id: string }) {
  const { run, busy, err } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button disabled={busy} onClick={() => run({ action: "publish_market", id })} className={`${btn} bg-foret text-creme hover:bg-foret-mid`}>
        Publier
      </button>
      <button disabled={busy} onClick={() => run({ action: "delete_market", id }, "Supprimer ce brouillon ?")} className={`${btn} border border-gris-fin text-danger`}>
        Supprimer
      </button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

export function ResolveControls({
  marketId,
  options,
  resolutionId,
  proposedOptionId,
  source,
  justification,
}: {
  marketId: string;
  options: { id: string; label: string }[];
  resolutionId?: number;
  proposedOptionId?: string | null;
  source?: string | null;
  justification?: string | null;
}) {
  const { run, busy, err } = useAction();
  const [winner, setWinner] = useState(proposedOptionId ?? options[0]?.id ?? "");
  const [src, setSrc] = useState(source ?? "");
  const [just, setJust] = useState(justification ?? "");

  return (
    <div className="mt-2 space-y-2 rounded-md bg-foret-pale/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={winner} onChange={(e) => setWinner(e.target.value)} className="rounded border border-gris-fin bg-blanc px-2 py-1 text-sm">
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
              {proposedOptionId === o.id ? " (Tata Kenny)" : ""}
            </option>
          ))}
        </select>
        <button
          disabled={busy || !winner}
          onClick={() =>
            run(
              { action: "resolve_market", marketId, winningOption: winner, source: src, justification: just, resolutionId },
              "Valider cette issue et distribuer les gains ? Action définitive."
            )
          }
          className={`${btn} bg-or text-or-text hover:bg-or-hover`}
        >
          ✓ Valider &amp; payer
        </button>
        {resolutionId && (
          <button disabled={busy} onClick={() => run({ action: "reject_resolution", resolutionId })} className={`${btn} border border-gris-fin text-gris`}>
            Rejeter
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => run({ action: "cancel_market", marketId, reason: "annulé par admin" }, "Annuler le marché et rembourser tout le monde ?")}
          className={`${btn} border border-danger text-danger`}
        >
          Annuler (rembourser)
        </button>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row">
        <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="source (URL)" className="flex-1 rounded border border-gris-fin bg-blanc px-2 py-1 text-xs" />
        <input value={just} onChange={(e) => setJust(e.target.value)} placeholder="justification" className="flex-1 rounded border border-gris-fin bg-blanc px-2 py-1 text-xs" />
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}

export function DisputeControls({ disputeId }: { disputeId: number }) {
  const { run, busy, err } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={busy}
        onClick={() => run({ action: "dispute", disputeId, decision: "accept" }, "Accepter : annule le marché et rembourse ?")}
        className={`${btn} bg-foret text-creme hover:bg-foret-mid`}
      >
        Accepter (annuler)
      </button>
      <button disabled={busy} onClick={() => run({ action: "dispute", disputeId, decision: "reject" })} className={`${btn} border border-gris-fin text-gris`}>
        Rejeter (dégeler)
      </button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

export function ConfigEditor({ entries }: { entries: { key: string; value: unknown }[] }) {
  const { run, busy, err } = useAction();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(entries.map((e) => [e.key, JSON.stringify(e.value)]))
  );

  function save(key: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(values[key]);
    } catch {
      parsed = values[key];
    }
    run({ action: "update_config", key, value: parsed });
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.key} className="flex items-center gap-2">
          <label className="w-52 font-mono text-sm text-foret">{e.key}</label>
          <input value={values[e.key] ?? ""} onChange={(ev) => setValues((v) => ({ ...v, [e.key]: ev.target.value }))} className="flex-1 rounded border border-gris-fin bg-creme px-2 py-1 text-sm" />
          <button disabled={busy} onClick={() => save(e.key)} className={`${btn} bg-foret text-creme hover:bg-foret-mid`}>
            Enregistrer
          </button>
        </div>
      ))}
      {err && <p className="text-xs text-danger">{err}</p>}
      <p className="text-xs text-gris">Valeurs JSON : nombres (400), booléens (true/false), texte entre guillemets.</p>
    </div>
  );
}

export function GenerateButton() {
  const { run, busy, err } = useAction();
  return (
    <div>
      <button
        disabled={busy}
        onClick={() => run({ action: "generate_now", count: 5 })}
        className="rounded bg-or px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.1em] text-or-text transition hover:bg-or-hover disabled:opacity-50"
      >
        {busy ? "Tata Kenny consulte les astres…" : "🔮 Générer 5 marchés maintenant"}
      </button>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
