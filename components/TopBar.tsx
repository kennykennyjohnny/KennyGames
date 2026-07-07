"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/config";
import { TataKenny, Wordmark } from "@/components/TataKenny";
import type { Profile } from "@/lib/types";

const LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/crews", label: "Crews" },
  { href: "/leagues", label: "Ligues" },
];

export function TopBar({ profile }: { profile: Profile }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isStaff = profile.role === "admin" || profile.role === "moderator";

  return (
    <header className="sticky top-0 z-40 border-b border-or/15 bg-foret">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/feed" className="flex items-center gap-2.5">
          <TataKenny size={34} />
          <Wordmark className="hidden text-[0.8rem] text-creme sm:inline" />
        </Link>

        <nav className="flex items-center gap-1 text-[0.72rem] font-bold uppercase tracking-[0.12em]">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded px-3 py-1.5 transition ${active ? "text-or" : "text-creme/55 hover:text-creme"}`}
              >
                {l.label}
              </Link>
            );
          })}
          {isStaff && (
            <Link href="/admin" className="rounded px-3 py-1.5 text-or/80 transition hover:text-or">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${profile.username}`}
            className="rounded-full bg-or px-3 py-1.5 text-[0.8rem] font-extrabold text-or-text transition hover:bg-or-hover"
          >
            🪙 {formatCurrency(profile.balance)}
          </Link>
          <button onClick={logout} className="px-1.5 text-creme/50 transition hover:text-or" title="Se déconnecter">
            ⏻
          </button>
        </div>
      </div>
    </header>
  );
}
