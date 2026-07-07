"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TataKenny, Wordmark } from "@/components/TataKenny";

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        router.push("/onboarding");
      } else {
        setInfo("Compte créé ! Si on te demande de confirmer par email, vérifie ta boîte mail. Sinon, connecte-toi juste en dessous.");
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

  return (
    <main className="flex flex-1 items-center justify-center bg-foret px-6 py-10">
      <div className="w-full max-w-sm rounded-xl border border-or/15 bg-blanc p-8 shadow-2xl">
        <Link href="/" className="flex items-center gap-2.5">
          <TataKenny size={40} />
          <Wordmark className="text-base text-charbon" />
        </Link>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-foret">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-sm text-gris">
          {mode === "login" ? "Entre ton email et ton mot de passe." : "Choisis un email et un mot de passe (6 caractères min)."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.fr"
            className="w-full rounded-lg border border-gris-fin bg-creme px-4 py-3 outline-none transition focus:border-foret"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mot de passe"
            className="w-full rounded-lg border border-gris-fin bg-creme px-4 py-3 outline-none transition focus:border-foret"
          />
          {error && <p className="text-sm font-semibold text-danger">{error}</p>}
          {info && <p className="text-sm font-semibold text-success">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-or px-4 py-3 text-sm font-extrabold uppercase tracking-[0.1em] text-or-text transition hover:bg-or-hover disabled:opacity-50"
          >
            {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-sm text-gris transition hover:text-foret"
        >
          {mode === "login" ? "Pas encore de compte ? En créer un" : "J'ai déjà un compte"}
        </button>
      </div>
    </main>
  );
}
