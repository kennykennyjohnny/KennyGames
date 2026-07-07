"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Créer un crew ou rejoindre par code (§4.5). Passe par les RPC dédiées. */
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
    setMsg("Crew créé !");
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

  const input = "mt-2 w-full rounded-lg border border-gris-fin bg-creme px-3 py-2 outline-none focus:border-foret";
  const btn = "mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.1em] transition";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-gris-fin bg-blanc p-4">
        <h3 className="font-extrabold text-foret">Créer un crew</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du crew" className={input} />
        <button onClick={create} className={`${btn} bg-foret text-creme hover:bg-foret-mid`}>Créer</button>
      </div>
      <div className="rounded-lg border border-gris-fin bg-blanc p-4">
        <h3 className="font-extrabold text-foret">Rejoindre par code</h3>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code d'invitation" className={`${input} uppercase`} />
        <button onClick={join} className={`${btn} bg-or text-or-text hover:bg-or-hover`}>Rejoindre</button>
      </div>
      {msg && <p className="text-sm font-semibold text-foret sm:col-span-2">{msg}</p>}
    </div>
  );
}
