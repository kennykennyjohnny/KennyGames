import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/admin";
import { TataKenny, Wordmark } from "@/components/TataKenny";

/**
 * Coquille du tableau de bord admin (§8, pilotage du site).
 * Double barriere : session requise, puis role admin/moderateur (getStaff).
 * Sert aussi sur admin.kennygames.fr via la reecriture d'hote (proxy.ts).
 * Tout fonctionne avec la SEULE session de l'admin (aucune service_role requise).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const staff = await getStaff();
  if (!staff) redirect("/feed");

  const nav = [
    { href: "/admin", label: "Vue d'ensemble" },
    { href: "/admin/resolutions", label: "Résolutions" },
    { href: "/admin/markets", label: "Marchés" },
    { href: "/admin/disputes", label: "Litiges" },
    { href: "/admin/config", label: "Config" },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-blanc">
      <header className="border-b border-or/15 bg-foret">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <TataKenny size={30} />
            <Wordmark className="text-sm text-creme" />
            <span className="rounded-sm bg-or px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-or-text">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-creme/60">
              {staff.username} · {staff.role}
            </span>
            <Link href="/feed" className="text-creme/60 hover:text-or">↩ site</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em]">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded px-3 py-1.5 text-creme/55 hover:bg-creme/10 hover:text-or">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
