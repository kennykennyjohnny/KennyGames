/**
 * Valeurs de connexion Supabase cote PUBLIC.
 *
 * L'URL du projet et la cle `anon` ne sont PAS des secrets : elles sont conçues
 * pour etre exposees (elles partent dans le bundle navigateur), et c'est la RLS
 * qui protege les donnees. On les met donc en repli en dur, pour que l'app
 * demarre meme si les variables d'env Vercel ne sont pas (ou mal) configurees.
 *
 * Les variables d'env, si elles sont definies, restent PRIORITAIRES — donc si tu
 * regeneres la cle anon un jour, il suffit de mettre a jour NEXT_PUBLIC_SUPABASE_ANON_KEY
 * dans Vercel (ou ici).
 *
 * ⚠️ NE JAMAIS mettre la cle `service_role` ici : elle est SECRETE et reste
 * uniquement dans l'env serveur (voir lib/supabase/admin.ts).
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sbukcgmyulnqxsmpcydu.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidWtjZ215dWxucXhzbXBjeWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTQ5ODAsImV4cCI6MjA5ODkzMDk4MH0.T0Zh_xaJ3GHPDs4ZAmlv05wCj6ju_2eDZ3QSWQ53BgQ";
