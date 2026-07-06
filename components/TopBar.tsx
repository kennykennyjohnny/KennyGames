"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, formatCurrency } from "@/lib/config";
import type { Profile } from "@/lib/types";

export function TopBar({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/feed" className="font-extrabold text-brand">
          🔮 {APP_NAME}
        </Link>

        <nav className="hidden gap-4 text-sm font-medium text-muted sm:flex">
          <Link href="/feed" className="hover:text-foreground">Feed</Link>
          <Link href="/crews" className="hover:text-foreground">Crews</Link>
          <Link href="/leagues" className="hover:text-foreground">Ligues</Link>
          <Link href={`/profile/${profile.username}`} className="hover:text-foreground">
            Profil
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">
            🪙 {formatCurrency(profile.balance)}
          </span>
          <button onClick={logout} className="text-sm text-muted hover:text-danger" title="Se deconnecter">
            ⏻
          </button>
        </div>
      </div>
    </header>
  );
}
