"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link href="/" className="text-sm font-semibold text-brand">
          🔮 {APP_NAME}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Connexion</h1>
        <p className="mt-1 text-sm text-muted">
          On t'envoie un lien magique par email. Pas de mot de passe.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-success/10 p-4 text-sm text-success">
            Verifie ta boite mail : un lien de connexion t'attend.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.fr"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-brand"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Recevoir le lien magique"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
