"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENCY_NAME, INITIAL_GRANT, MASCOT_NAME, formatCurrency } from "@/lib/config";
import { TataKenny } from "@/components/TataKenny";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [referral, setReferral] = useState("");
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!age || !terms) {
      setError("Tu dois confirmer ton âge et accepter les CGU.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("complete_onboarding", {
      p_username: username,
      p_avatar_url: null,
      p_referral_code: referral || null,
      p_accept_terms: terms,
      p_age_confirmed: age,
    });
    setLoading(false);
    if (error) setError(error.message);
    else {
      router.push("/feed");
      router.refresh();
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-foret px-6 py-10">
      <div className="w-full max-w-md rounded-xl border border-or/15 bg-blanc p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <TataKenny size={48} />
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-foret">Bienvenue !</h1>
            <p className="text-sm text-gris">
              {MASCOT_NAME} t&apos;offre <b className="text-or-text">{formatCurrency(INITIAL_GRANT)}</b> pour démarrer.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-gris">Pseudo</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 caractères, lettres/chiffres/_"
              className="mt-1 w-full rounded-lg border border-gris-fin bg-creme px-4 py-3 outline-none focus:border-foret"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-gris">Code de parrainage (optionnel)</label>
            <input
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              placeholder="Ex : AB2CD3EF"
              className="mt-1 w-full rounded-lg border border-gris-fin bg-creme px-4 py-3 uppercase outline-none focus:border-foret"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-charbon">
            <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1 accent-foret" />
            <span>Je confirme avoir l&apos;âge requis pour jouer.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-charbon">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 accent-foret" />
            <span>
              J&apos;accepte les CGU. Je comprends que les {CURRENCY_NAME} sont fictifs et non convertibles en argent réel.
            </span>
          </label>

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-or px-4 py-3 text-sm font-extrabold uppercase tracking-[0.1em] text-or-text transition hover:bg-or-hover disabled:opacity-50"
          >
            {loading ? "Création…" : `Récupérer mes ${CURRENCY_NAME} et jouer`}
          </button>
        </form>
      </div>
    </main>
  );
}
