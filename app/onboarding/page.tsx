"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, CURRENCY_NAME, INITIAL_GRANT, formatCurrency } from "@/lib/config";

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
      setError("Tu dois confirmer ton age et accepter les CGU.");
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
    else router.push("/feed");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h1 className="text-2xl font-bold">Bienvenue sur {APP_NAME} 🔮</h1>
        <p className="mt-1 text-sm text-muted">
          Choisis ton pseudo. Madame Irma t'offre {formatCurrency(INITIAL_GRANT)} pour
          demarrer.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Pseudo</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 caracteres, lettres/chiffres/_"
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Code de parrainage (optionnel)</label>
            <input
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              placeholder="Ex : AB2CD3EF"
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 uppercase outline-none focus:border-brand"
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1" />
            <span>Je confirme avoir l'age requis pour utiliser {APP_NAME}.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
            <span>
              J'accepte les CGU. Je comprends que les {CURRENCY_NAME} sont fictifs et
              non convertibles en argent reel.
            </span>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creation..." : "Recuperer mes Pepites et jouer"}
          </button>
        </form>
      </div>
    </main>
  );
}
