import { Landmark } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  const columns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
      title: t("footer.products"),
      links: [
        { label: t("nav.ibanValidator"), href: "/iban-checker" },
        { label: t("nav.swiftLookup"), href: "/swift-codes" },
        { label: t("nav.routingLookup"), href: "/routing-numbers" },
        { label: t("nav.sortCodeLookup"), href: "/sort-codes" },
        { label: t("nav.bsbLookup"), href: "/bsb" },
        { label: t("nav.ifscLookup"), href: "/ifsc" },
        { label: t("nav.cnapsLookup"), href: "/cnaps" },
      ],
    },
    {
      title: t("footer.developers"),
      links: [
        { label: t("footer.docs"), href: "/docs" },
        { label: t("developers.quickstartTitle"), href: "/docs/quickstart" },
        { label: t("footer.sdks"), href: "/docs/sdks" },
        { label: t("footer.changelog"), href: "/docs/changelog" },
        { label: t("footer.status"), href: "/status" },
      ],
    },
    {
      title: t("footer.resources"),
      links: [
        { label: t("footer.bankDirectory"), href: "/banks" },
        { label: t("footer.countryDirectory"), href: "/countries" },
        { label: t("footer.pricing"), href: "/pricing" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("footer.about"), href: "/about" },
        { label: t("footer.contact"), href: "/contact" },
        { label: t("footer.privacy"), href: "/privacy" },
        { label: t("footer.terms"), href: "/terms" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Landmark className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-lg tracking-tight">{t("common.siteName")}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("common.tagline")}
            </p>
            <p className="mt-4 max-w-xs text-xs text-muted-foreground">
              {t("footer.disclaimer")}
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          {t("footer.rights", { year })}
        </div>
      </div>
    </footer>
  );
}
