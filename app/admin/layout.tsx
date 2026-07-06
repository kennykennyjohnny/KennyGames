import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/admin";
import { APP_NAME } from "@/lib/config";

/**
 * Coquille du tableau de bord admin (§8, pilotage du site).
 * Double barriere : session requise, puis role admin/moderateur (getStaff).
 * Sert aussi sur admin.kennygames.fr via la reecriture d'hote (proxy.ts).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const staff = await getStaff();
  if (!staff) redirect("/feed"); // connecte mais pas staff

  const nav = [
    { href: "/admin", label: "Vue d'ensemble" },
    { href: "/admin/resolutions", label: "Resolutions" },
    { href: "/admin/markets", label: "Marches" },
    { href: "/admin/disputes", label: "Litiges" },
    { href: "/admin/config", label: "Config" },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-extrabold text-brand-2">🛠️ {APP_NAME} — Admin</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {staff.username} · {staff.role}
            </span>
            <Link href="/feed" className="text-muted hover:text-foreground">
              ↩ retour au site
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-muted hover:bg-brand/10 hover:text-brand"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
