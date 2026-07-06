"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Creer un crew ou rejoindre par code (§4.5). Passe par les RPC dediees. */
export function CrewActions() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    const { error } = await supabase.rpc("create_crew", { p_name: name, p_description: null });
    if (error) return setMsg(error.message);
    setName("");
    setMsg("Crew cree !");
    router.refresh();
  }

  async function join() {
    if (!code.trim()) return;
    const { error } = await supabase.rpc("join_crew", { p_invite_code: code });
    if (error) return setMsg(error.message);
    setCode("");
    setMsg("Bienvenue dans le crew !");
    router.refresh();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Creer un crew</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du crew"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand"
        />
        <button onClick={create} className="mt-2 w-full rounded-xl bg-brand px-4 py-2 font-semibold text-white">
          Creer
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Rejoindre par code</h3>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Code d'invitation"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 uppercase outline-none focus:border-brand"
        />
        <button onClick={join} className="mt-2 w-full rounded-xl bg-brand-2 px-4 py-2 font-semibold text-white">
          Rejoindre
        </button>
      </div>
      {msg && <p className="text-sm text-muted sm:col-span-2">{msg}</p>}
    </div>
  );
}
