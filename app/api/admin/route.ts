import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { generateMarkets } from "@/lib/madame-irma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dispatcher des actions admin. Gate par getStaff() (role reel en base), puis
 * execute via la SESSION de l'admin (pas de service_role) : toutes les
 * mutations passent par des RPC SECURITY DEFINER gate is_staff. Le tableau de
 * bord fonctionne donc avec le seul compte admin connecte.
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

  const supabase = await createClient();
  const action = body.action;

  try {
    switch (action) {
      case "publish_market": {
        const { error } = await supabase.rpc("admin_publish_market", { p_market: String(body.id) });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "delete_market": {
        const { error } = await supabase.rpc("admin_delete_market", { p_market: String(body.id) });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "resolve_market": {
        const { error } = await supabase.rpc("resolve_market", {
          p_market: String(body.marketId),
          p_winning_option: String(body.winningOption),
          p_source: body.source ? String(body.source) : null,
          p_justification: body.justification ? String(body.justification) : null,
          p_by: staff.userId,
        });
        if (error) throw error;
        if (body.resolutionId) {
          await supabase.rpc("admin_set_resolution_status", { p_id: Number(body.resolutionId), p_status: "confirmed" });
        }
        return NextResponse.json({ ok: true });
      }

      case "reject_resolution": {
        const { error } = await supabase.rpc("admin_set_resolution_status", {
          p_id: Number(body.resolutionId),
          p_status: "rejected",
        });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "cancel_market": {
        const { error } = await supabase.rpc("cancel_market", {
          p_market: String(body.marketId),
          p_reason: body.reason ? String(body.reason) : null,
        });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "dispute": {
        const { error } = await supabase.rpc("admin_resolve_dispute", {
          p_id: Number(body.disputeId),
          p_accept: body.decision === "accept",
        });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "update_config": {
        const { error } = await supabase.rpc("admin_set_config", { p_key: String(body.key), p_value: body.value });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "generate_now": {
        const count = Math.min(Number(body.count ?? 5), 10);
        const generated = await generateMarkets(count);
        let inserted = 0;
        for (const g of generated) {
          const { error } = await supabase.rpc("admin_create_market", {
            p_title: g.title,
            p_category: g.category,
            p_close_time: g.close_time,
            p_options: g.options,
            p_description: g.description,
            p_type: g.type,
            p_status: "draft",
            p_is_ai: true,
          });
          if (!error) inserted++;
        }
        return NextResponse.json({ ok: true, inserted });
      }

      default:
        return NextResponse.json({ error: `action inconnue: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
