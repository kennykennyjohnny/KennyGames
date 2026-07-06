import "server-only";

/**
 * Protege les routes cron. Vercel Cron envoie `Authorization: Bearer <CRON_SECRET>`.
 * On refuse tout appel sans le secret : ces routes utilisent la service_role.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
