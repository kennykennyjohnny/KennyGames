import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME, CURRENCY_NAME } from "@/lib/config";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <div className="mb-4 inline-block rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
          🔮 {APP_NAME}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Parie sur tout.
          <br />
          <span className="text-brand-2">Sauf ton fric.</span>
        </h1>
        <p className="mt-5 text-lg text-muted">
          Telerealite, politique, musique, buzz, actu — et surtout paris entre
          potes. On mise des {CURRENCY_NAME}, jamais de vrai argent.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/30 transition hover:opacity-90"
          >
            Commencer a jouer
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border bg-card px-6 py-3 font-semibold transition hover:bg-brand/5"
          >
            J'ai deja un compte
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">
          Jeu gratuit a monnaie fictive. Aucun gain retirable en argent reel.
        </p>
      </div>
    </main>
  );
}
