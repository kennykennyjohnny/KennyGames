"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      // Si la confirmation email est desactivee, la session est immediate.
      if (data.session) {
        router.push("/onboarding");
      } else {
        setInfo(
          "Compte cree ! Si on te demande de confirmer par email, verifie ta boite mail. " +
            "Sinon, connecte-toi juste en dessous."
        );
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      router.push("/feed");
      router.refresh();
    }
  }

  async function magicLink() {
    if (!email) return setError("Entre ton email d'abord.");
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setInfo("Lien magique envoye ! Verifie ta boite mail.");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link href="/" className="text-sm font-semibold text-brand">
          🔮 {APP_NAME}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Entre ton email et ton mot de passe."
            : "Choisis un email et un mot de passe (6 caractères min)."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.fr"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-brand"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mot de passe"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-brand"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-sm text-muted hover:text-foreground"
        >
          {mode === "login" ? "Pas encore de compte ? En créer un" : "J'ai déjà un compte"}
        </button>

        <div className="mt-4 border-t border-border pt-4 text-center">
          <button onClick={magicLink} disabled={loading} className="text-xs text-brand-2 hover:underline">
            Recevoir plutôt un lien magique par email
          </button>
        </div>
      </div>
    </main>
  );
}
