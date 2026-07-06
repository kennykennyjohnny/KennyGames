import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraichit la session Supabase a chaque requete et protege les routes de l'app.
 * (Pattern @supabase/ssr pour l'App Router.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Sous-domaine admin (admin.kennygames.fr) : la racine sert le tableau de bord.
  // Le controle de role reel se fait dans app/admin/layout.tsx (getStaff()).
  const host = request.headers.get("host") ?? "";
  const isAdminHost = host.split(":")[0].startsWith("admin.");
  if (
    isAdminHost &&
    !path.startsWith("/admin") &&
    !path.startsWith("/api") &&
    !path.startsWith("/login") &&
    !path.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = path === "/" ? "/admin" : `/admin${path}`;
    return NextResponse.rewrite(url);
  }

  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/j/"); // landing virale de partage (§4.5)

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
