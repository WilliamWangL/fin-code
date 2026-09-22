import { notFound } from "next/navigation";

/**
 * Catch-all for unknown routes inside a locale. Renders the localized
 * not-found page (src/app/[locale]/not-found.tsx) instead of an empty 404,
 * per the SEO rule: never serve generated empty pages.
 */
export default function CatchAllPage() {
  notFound();
}
