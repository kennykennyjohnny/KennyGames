import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_NAME, MASCOT_NAME } from "@/lib/config";
import { TataKenny, TataKennyHero, Wordmark } from "@/components/TataKenny";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", name: "Tu t'inscris", desc: "Crée ton compte en 30 secondes. Pas de carte bancaire, pas de vérif. Juste un pseudo et c'est parti.", tag: "Gratuit" },
  { n: "02", name: "Tu paries", desc: `Choisis un pari du moment. Mise tes ${CURRENCY_NAME} sur ce que tu crois qu'il va se passer.`, tag: CURRENCY_NAME },
  { n: "03", name: "Tu règnes", desc: `Le résultat tombe. Tu avais raison ? Tes ${CURRENCY_NAME} explosent. Tu grimpes au classement. ${MASCOT_NAME} est fière.`, tag: "Classement" },
];

const CATS = [
  { emoji: "📺", name: "Téléréalité", hot: true },
  { emoji: "⚽", name: "Sport", hot: true },
  { emoji: "🏛️", name: "Politique", hot: false },
  { emoji: "🎵", name: "Musique", hot: false },
  { emoji: "🔥", name: "Buzz & réseaux", hot: true },
  { emoji: "📰", name: "Actu", hot: false },
  { emoji: "👥", name: "Entre potes", hot: false },
  { emoji: "✨", name: "Bientôt", hot: false },
];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <main className="flex flex-1 flex-col">
      {/* NAV */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-or/15 bg-foret px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <TataKenny size={38} />
          <Wordmark className="text-sm text-creme" />
        </Link>
        <Link
          href="/login"
          className="rounded bg-or px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-or-text transition hover:bg-or-hover"
        >
          Jouer gratuitement
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative grid min-h-screen items-center gap-8 overflow-hidden bg-foret px-6 pb-16 pt-32 sm:px-10 lg:grid-cols-[1fr_440px]">
        <div className="relative z-10 flex flex-col gap-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border-[1.5px] border-or/35 bg-or/10 px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-or">
            <span className="kg-blink h-[7px] w-[7px] rounded-full bg-or" />
            100 % Gratuit — Zéro euro en jeu
          </span>
          <h1 className="text-[clamp(3rem,7vw,6.5rem)] font-extrabold leading-[0.88] tracking-[-0.04em] text-creme">
            Parie
            <br />
            <span className="block text-or">sur tout.</span>
            <span className="block" style={{ WebkitTextStroke: "2px var(--or)", color: "transparent" }}>
              Sauf ton fric.
            </span>
          </h1>
          <p className="max-w-md text-[1.05rem] font-light leading-[1.75] text-creme/60">
            Le jeu de prédiction gratuit où tu paries sur tout — téléréalité, politique, sport, buzz —
            avec tes {CURRENCY_NAME}. Pas un centime en jeu. Toute la frisson.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-5">
            <Link
              href="/login"
              className="rounded bg-or px-8 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-or-text transition hover:bg-or-hover"
            >
              Jouer maintenant →
            </Link>
            <a href="#how" className="text-sm text-creme/50 transition hover:text-creme">
              Comment ça marche ↓
            </a>
          </div>
        </div>

        <div className="relative z-10 hidden items-end justify-center lg:flex">
          <div className="relative w-[320px]">
            <div className="kg-bob absolute -right-4 -top-2 z-10 rounded-[14px_14px_0_14px] bg-or px-4 py-2.5 text-[0.72rem] font-extrabold leading-tight text-or-text shadow-lg shadow-or/30">
              « J'avais dit que ça allait
              <br />
              arriver. Comme toujours. »
            </div>
            <TataKennyHero className="h-auto w-full" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 bg-or md:grid-cols-4">
        {[
          ["100%", "Gratuit — toujours"],
          ["∞", `${CURRENCY_NAME} dispo`],
          ["7", "Univers de paris"],
          ["0 €", "En jeu — zéro risque"],
        ].map(([num, label], i) => (
          <div key={i} className="border-r border-foret/10 px-6 py-8 text-center last:border-r-0">
            <div className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-[-0.03em] text-or-text">{num}</div>
            <div className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-or-text/60">{label}</div>
          </div>
        ))}
      </section>

      {/* HOW */}
      <section id="how" className="bg-creme px-6 py-20 sm:px-10">
        <div className="eyebrow mb-4 text-foret-light">Mode d&apos;emploi</div>
        <h2 className="mb-12 max-w-xl text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.025em] text-foret">
          Trois étapes. C&apos;est tout.
        </h2>
        <div className="grid gap-px bg-gris-fin md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col gap-4 bg-creme p-8 transition hover:bg-[#ede6d8]">
              <div className="text-5xl font-extrabold leading-none tracking-[-0.04em] text-foret/10">{s.n}</div>
              <div className="text-xl font-extrabold tracking-[-0.02em] text-foret">{s.name}</div>
              <p className="text-sm font-light leading-[1.7] text-gris">{s.desc}</p>
              <span className="mt-1 w-fit rounded-sm bg-foret px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.15em] text-or">
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-foret px-6 py-20 sm:px-10">
        <div className="eyebrow mb-4 text-or/60">Univers de paris</div>
        <h2 className="mb-10 max-w-lg text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.025em] text-creme">
          Parie sur <span className="text-or">n&apos;importe quoi.</span>
        </h2>
        <div className="grid grid-cols-2 gap-0.5 md:grid-cols-4">
          {CATS.map((c) => (
            <div
              key={c.name}
              className={`relative flex flex-col gap-4 border border-creme/[0.07] bg-creme/5 p-6 transition hover:border-or/25 hover:bg-creme/10 ${c.hot ? "border-t-2 border-t-or" : ""}`}
            >
              {c.hot && (
                <span className="absolute right-3 top-3 rounded-sm bg-or px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.15em] text-or-text">
                  🔥 Chaud
                </span>
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-creme/[0.07] text-xl">{c.emoji}</div>
              <div className="text-base font-bold leading-tight text-creme">{c.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PEPITES */}
      <section className="bg-blanc px-6 py-20 sm:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="eyebrow mb-4 text-foret-light">La monnaie du jeu</div>
            <h2 className="mb-6 text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.03em] text-charbon">
              Les <span className="text-foret">{CURRENCY_NAME}.</span>
              <br />
              Sans thune.
            </h2>
            <p className="mb-8 max-w-md text-[0.95rem] font-light leading-[1.8] text-gris">
              Les {CURRENCY_NAME}, c&apos;est la monnaie officielle du jeu. On en gagne, on en perd, on les accumule.
              Elles ne se convertissent jamais en argent réel — c&apos;est le principe, et c&apos;est ce qui rend le
              jeu accessible à tous.
            </p>
            <div className="flex flex-col">
              {[
                ["Capital de départ gratuit", "Tu démarres avec des " + CURRENCY_NAME + " pour jouer tout de suite, sans rien débourser."],
                ["Pool parimutuel", "Les mises se redistribuent entre les gagnants. La cote se forme selon la foule."],
                ["Zéro argent réel", "Pas de conversion, pas de retrait. Toute la frisson, zéro risque."],
              ].map(([t, d], i) => (
                <div key={i} className="flex items-start gap-4 border-b border-gris-fin py-4 first:border-t">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-foret text-xs text-or">✓</span>
                  <p className="text-[0.84rem] leading-[1.6] text-charbon">
                    <strong className="font-bold text-foret">{t}</strong> — {d}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-40 w-40 flex-col items-center justify-center gap-1 rounded-full bg-or shadow-[0_0_0_8px_rgba(245,200,66,0.1),0_0_0_20px_rgba(245,200,66,0.05)]">
              <span className="text-5xl">🪙</span>
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-or-text">{CURRENCY_NAME}</span>
            </div>
            <p className="text-center text-[0.75rem] font-semibold italic text-gris">
              « Comme l&apos;or, mais gratuit. »
              <br />— {MASCOT_NAME}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center bg-foret px-6 py-28 text-center sm:px-10">
        <TataKenny size={84} />
        <div className="mt-6 flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.25em] text-or before:h-px before:w-8 before:bg-or/40 after:h-px after:w-8 after:bg-or/40">
          {MASCOT_NAME} t&apos;attend
        </div>
        <h2 className="mt-6 text-[clamp(2.6rem,7vw,6rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-creme">
          Prêt à <span className="text-or">tout parier</span>
          <br />
          <span style={{ WebkitTextStroke: "2px var(--or)", color: "transparent" }}>sans risque ?</span>
        </h2>
        <p className="mt-6 text-base font-light text-creme/55">Rejoins les premiers joueurs. Gratuit, maintenant, pour toujours.</p>
        <Link
          href="/login"
          className="mt-8 rounded bg-or px-10 py-5 text-sm font-extrabold uppercase tracking-[0.15em] text-or-text transition hover:bg-or-hover"
        >
          Créer mon compte gratuitement →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-4 bg-charbon px-6 py-7 sm:px-10">
        <div className="flex items-center gap-3">
          <TataKenny size={28} halo={false} />
          <Wordmark className="text-sm text-creme" />
        </div>
        <span className="text-[0.67rem] text-creme/20">
          © 2026 KennyGames — Jeu gratuit, zéro argent réel — Paris, France
        </span>
      </footer>
    </main>
  );
}
