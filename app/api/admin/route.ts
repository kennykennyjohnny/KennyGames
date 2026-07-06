import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMarkets } from "@/lib/madame-irma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_ACCOUNT = "00000000-0000-0000-0000-0000000000aa";

/**
 * Dispatcher des actions admin. Chaque appel est gate par getStaff() (role reel
 * en base), puis execute avec la service_role cote serveur. Le front admin
 * n'ecrit jamais directement : il appelle POST /api/admin { action, ... }.
 */
export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "reserve au staff" }, { status: 403 });

  let body: { action?: string; [k: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corps JSON invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const action = body.action;

  try {
    switch (action) {
      // --- Marches editoriaux / propositions Irma ---
      case "publish_market": {
        const id = String(body.id);
        const { error } = await admin
          .from("markets")
          .update({ status: "open" })
          .eq("id", id)
          .eq("status", "draft");
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "delete_market": {
        // uniquement les brouillons (jamais un marche avec des paris)
        const id = String(body.id);
        const { error } = await admin.from("markets").delete().eq("id", id).eq("status", "draft");
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      // --- Resolution : valide une issue (parimutuel via RPC) ---
      case "resolve_market": {
        const marketId = String(body.marketId);
        const winningOption = String(body.winningOption);
        const source = body.source ? String(body.source) : null;
        const justification = body.justification ? String(body.justification) : null;
        const { error } = await admin.rpc("resolve_market", {
          p_market: marketId,
          p_winning_option: winningOption,
          p_source: source,
          p_justification: justification,
          p_by: staff.userId,
        });
        if (error) throw error;
        // Marque la proposition Irma correspondante comme confirmee (audit)
        if (body.resolutionId) {
          await admin
            .from("market_resolutions")
            .update({ status: "confirmed", resolved_by: staff.userId })
            .eq("id", Number(body.resolutionId));
        }
        return NextResponse.json({ ok: true });
      }

      case "reject_resolution": {
        const { error } = await admin
          .from("market_resolutions")
          .update({ status: "rejected", resolved_by: staff.userId })
          .eq("id", Number(body.resolutionId));
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "cancel_market": {
        const { error } = await admin.rpc("cancel_market", {
          p_market: String(body.marketId),
          p_reason: body.reason ? String(body.reason) : null,
        });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      // --- Litiges (§8) ---
      case "dispute": {
        const disputeId = Number(body.disputeId);
        const { data: dispute } = await admin
          .from("disputes")
          .select("market_id")
          .eq("id", disputeId)
          .maybeSingle();
        if (!dispute) throw new Error("litige introuvable");

        if (body.decision === "accept") {
          // Litige fonde : on annule le marche (remboursement integral)
          await admin.rpc("cancel_market", { p_market: dispute.market_id, p_reason: "litige accepte" });
          await admin.from("disputes").update({ status: "accepted" }).eq("id", disputeId);
        } else {
          // Litige rejete : on degele le marche (retour en 'closed')
          await admin.from("disputes").update({ status: "rejected" }).eq("id", disputeId);
          await admin.from("markets").update({ status: "closed" }).eq("id", dispute.market_id).eq("status", "disputed");
        }
        return NextResponse.json({ ok: true });
      }

      // --- Config economie (rake, dotations, auto-resolution IA) ---
      case "update_config": {
        const key = String(body.key);
        const value = body.value; // JSON: number | boolean | string
        const { error } = await admin.from("config").upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      // --- Outil : generer des marches Irma maintenant ---
      case "generate_now": {
        const count = Number(body.count ?? 5);
        const generated = await generateMarkets(Math.min(count, 10));
        const ids: string[] = [];
        for (const g of generated) {
          const { data: m, error } = await admin
            .from("markets")
            .insert({
              creator_id: SYSTEM_ACCOUNT,
              title: g.title,
              description: g.description,
              category: g.category,
              type: g.type,
              status: "draft",
              resolution_mode: "ai",
              close_time: g.close_time,
              is_ai_generated: true,
            })
            .select("id")
            .single();
          if (error || !m) continue;
          await admin.from("market_options").insert(
            g.options.map((label, i) => ({ market_id: m.id, label, sort_order: i + 1 }))
          );
          ids.push(m.id);
        }
        return NextResponse.json({ ok: true, inserted: ids.length });
      }

      default:
        return NextResponse.json({ error: `action inconnue: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
