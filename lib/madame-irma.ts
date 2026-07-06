import "server-only";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MARKET_CATEGORIES } from "@/lib/config";

/**
 * Madame Irma — moteur de contenu ET de resolution (§2 différenciateur #2, §11).
 * SERVEUR UNIQUEMENT : la cle ANTHROPIC_API_KEY ne quitte jamais le serveur.
 * Elle PROPOSE (JSON strict + source), le systeme EXECUTE via les RPC.
 */

const MODEL = process.env.MADAME_IRMA_MODEL ?? "claude-opus-4-8";

function persona(): string {
  // Persona versionnee dans /prompts pour iterer sans toucher au code (§11).
  try {
    return fs.readFileSync(path.join(process.cwd(), "prompts", "madame-irma.md"), "utf8");
  } catch {
    return "Tu es Madame Irma, voyante pop française. Tu proposes du JSON strict, tu ne touches jamais l'argent.";
  }
}

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY manquant (serveur only)");
  return new Anthropic();
}

// ---------------------------------------------------------
// GENERATION DE MARCHES — sortie JSON strict (structured outputs)
// ---------------------------------------------------------
const GeneratedMarket = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(MARKET_CATEGORIES as unknown as [string, ...string[]]),
  type: z.enum(["binary", "multiple"]),
  options: z.array(z.string()).min(2).max(5),
  close_time: z.string(), // ISO 8601
});
const GenerationResult = z.object({ markets: z.array(GeneratedMarket) });
export type GeneratedMarket = z.infer<typeof GeneratedMarket>;

export async function generateMarkets(count = 5, context?: string): Promise<GeneratedMarket[]> {
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(GenerationResult) },
    system: persona(),
    messages: [
      {
        role: "user",
        content:
          `Genere ${count} marches de prediction a issue verifiable, varies en categorie.` +
          (context ? `\n\nContexte / actu du moment :\n${context}` : "") +
          `\n\nLes close_time doivent etre dans les 2 a 30 prochains jours.`,
      },
    ],
  });
  return res.parsed_output?.markets ?? [];
}

// ---------------------------------------------------------
// RESOLUTION — web search + JSON strict. winner=null si non fiable (§8).
// On combine l'outil web_search avec une consigne de sortie JSON stricte,
// puis on parse defensivement (l'outil serveur empeche output_config.format).
// ---------------------------------------------------------
const ResolutionResult = z.object({
  winner_option_id: z.string().nullable(),
  source_url: z.string().nullable(),
  justification: z.string(),
});
export type ResolutionProposal = z.infer<typeof ResolutionResult>;

export async function resolveMarketAI(input: {
  title: string;
  description: string | null;
  options: { id: string; label: string }[];
}): Promise<ResolutionProposal> {
  const optionList = input.options.map((o) => `- ${o.label} (id: ${o.id})`).join("\n");

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    system: persona(),
    messages: [
      {
        role: "user",
        content:
          `Resous ce marche en cherchant le resultat officiel sur le web.\n\n` +
          `Question : ${input.title}\n` +
          `${input.description ?? ""}\n\n` +
          `Options possibles :\n${optionList}\n\n` +
          `Reponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :\n` +
          `{"winner_option_id": "<id de l'option gagnante ou null>", ` +
          `"source_url": "<url de la source ou null>", "justification": "<1-2 phrases>"}\n` +
          `Si le resultat n'est pas encore connu ou pas fiable, mets winner_option_id a null.`,
      },
    ],
  });

  // Concatene les blocs texte de la reponse finale, puis extrait le JSON.
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { winner_option_id: null, source_url: null, justification: "Reponse illisible de l'IA." };
  }
  const parsed = ResolutionResult.safeParse(JSON.parse(match[0]));
  if (!parsed.success) {
    return { winner_option_id: null, source_url: null, justification: "JSON de resolution invalide." };
  }
  // Garde-fou : l'option gagnante doit exister dans le marche.
  if (parsed.data.winner_option_id && !input.options.some((o) => o.id === parsed.data.winner_option_id)) {
    return { ...parsed.data, winner_option_id: null, justification: "Option gagnante hors liste : " + parsed.data.justification };
  }
  return parsed.data;
}
