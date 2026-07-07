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

const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50";

/** Actions sur un brouillon de marche (proposition Irma ou admin). */
export function DraftActions({ id }: { id: string }) {
  const { run, busy, err } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={busy}
        onClick={() => run({ action: "publish_market", id })}
        className={`${btn} bg-success text-white`}
      >
        Publier
      </button>
      <button
        disabled={busy}
        onClick={() => run({ action: "delete_market", id }, "Supprimer ce brouillon ?")}
        className={`${btn} border border-border text-danger`}
      >
        Supprimer
      </button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

/** Valider une issue (parimutuel) ou annuler le marche. */
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
    <div className="mt-2 space-y-2 rounded-lg bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={winner}
          onChange={(e) => setWinner(e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
        >
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
              "Valider cette issue et distribuer les gains ? Action definitive."
            )
          }
          className={`${btn} bg-brand text-white`}
        >
          ✓ Valider &amp; payer
        </button>
        {resolutionId && (
          <button
            disabled={busy}
            onClick={() => run({ action: "reject_resolution", resolutionId })}
            className={`${btn} border border-border`}
          >
            Rejeter la proposition
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => run({ action: "cancel_market", marketId, reason: "annule par admin" }, "Annuler le marche et rembourser tout le monde ?")}
          className={`${btn} border border-danger text-danger`}
        >
          Annuler (rembourser)
        </button>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row">
        <input
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="source (URL)"
          className="flex-1 rounded-lg border border-border bg-card px-2 py-1 text-xs"
        />
        <input
          value={just}
          onChange={(e) => setJust(e.target.value)}
          placeholder="justification"
          className="flex-1 rounded-lg border border-border bg-card px-2 py-1 text-xs"
        />
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}

/** Trancher un litige. */
export function DisputeControls({ disputeId }: { disputeId: number }) {
  const { run, busy, err } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={busy}
        onClick={() => run({ action: "dispute", disputeId, decision: "accept" }, "Accepter : annule le marche et rembourse ?")}
        className={`${btn} bg-success text-white`}
      >
        Accepter (annuler marche)
      </button>
      <button
        disabled={busy}
        onClick={() => run({ action: "dispute", disputeId, decision: "reject" })}
        className={`${btn} border border-border`}
      >
        Rejeter (degeler)
      </button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

/** Editeur des cles de config economie. */
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
      parsed = values[key]; // fallback string
    }
    run({ action: "update_config", key, value: parsed });
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.key} className="flex items-center gap-2">
          <label className="w-52 font-mono text-sm">{e.key}</label>
          <input
            value={values[e.key] ?? ""}
            onChange={(ev) => setValues((v) => ({ ...v, [e.key]: ev.target.value }))}
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          <button disabled={busy} onClick={() => save(e.key)} className={`${btn} bg-brand text-white`}>
            Enregistrer
          </button>
        </div>
      ))}
      {err && <p className="text-xs text-danger">{err}</p>}
      <p className="text-xs text-muted">
        Valeurs au format JSON : nombres (ex : 400), booleens (true/false), texte entre guillemets.
      </p>
    </div>
  );
}

/** Bouton : generer des marches Irma maintenant. */
export function GenerateButton() {
  const { run, busy, err } = useAction();
  return (
    <div>
      <button
        disabled={busy}
        onClick={() => run({ action: "generate_now", count: 5 })}
        className={`${btn} bg-gradient-to-r from-brand to-brand-2 text-white`}
      >
        {busy ? "Tata Kenny consulte les astres..." : "🔮 Generer 5 marches maintenant"}
      </button>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
