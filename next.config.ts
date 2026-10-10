import type { NextConfig } from "next";

/**
 * Two build flavours from one codebase:
 *
 *  - Server edition (default): Next.js server + API routes, Supabase Auth/Postgres (or the local
 *    embedded database in development). Files named `*.server.ts(x)` are included.
 *  - Static edition: a plain static site (`out/`) for GitHub Pages or any static host. The game and its
 *    save run fully in the browser (PGlite in IndexedDB). Files named `*.static.tsx` are included and
 *    server-only routes are left out. It is a single page with relative asset URLs, so the same files
 *    work at any path (`https://you.github.io/<any-repo-name>/`, a sub-folder, a custom domain).
 *
 * The static edition is built when STATIC_EXPORT=1, or automatically on Vercel when no database is
 * configured — so a fresh repository deploys on Vercel with zero environment variables.
 */
const onVercelWithoutDatabase = !!process.env.VERCEL && !process.env.DATABASE_URL;
const isStatic = process.env.STATIC_EXPORT === "1" || onVercelWithoutDatabase;

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      reactStrictMode: true,
      // "./_next/…" instead of "/_next/…": path-independent assets.
      assetPrefix: ".",
      images: { unoptimized: true },
      pageExtensions: ["tsx", "ts", "static.tsx", "static.ts"],
      env: { NEXT_PUBLIC_STATIC_EXPORT: "1" },
      poweredByHeader: false,
    }
  : {
      reactStrictMode: true,
      pageExtensions: ["tsx", "ts", "server.tsx", "server.ts"],
      env: { NEXT_PUBLIC_STATIC_EXPORT: "" },
      // pg and PGlite are Node-only server dependencies here; keep them out of the server bundle.
      serverExternalPackages: ["pg", "@electric-sql/pglite"],
      poweredByHeader: false,
    };

export default nextConfig;
