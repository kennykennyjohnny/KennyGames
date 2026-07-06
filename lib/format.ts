/** Petits helpers d'affichage partages. */

export function timeRemaining(closeTime: string): string {
  const ms = new Date(closeTime).getTime() - Date.now();
  if (ms <= 0) return "Cloture";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Telerealite: "📺",
  Politique: "🏛️",
  Musique: "🎵",
  Sport: "⚽",
  "Buzz / Internet": "🔥",
  Actu: "📰",
  "Entre potes": "👥",
};

export function categoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] ?? "🎲";
}
