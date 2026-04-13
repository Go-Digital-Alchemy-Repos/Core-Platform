import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@assets/IMG_0002_1772999718659.png";
import type { CmsMenu, MenuItem, PublicMenuLocation } from "@shared/schema";

const defaultPlatformLinks = [
  { href: "/directory", label: "Find a Mental Health Professional", testId: "link-footer-directory" },
  { href: "/events", label: "Events & Workshops", testId: "link-footer-events" },
  { href: "/about", label: "How It Works", testId: "link-footer-how-it-works" },
];

const defaultTherapistLinks = [
  { href: "/join", label: "Applications open in June", testId: "link-footer-join" },
  { href: "/auth/login", label: "Mental Health Professional Login", testId: "link-footer-login" },
  { href: "/therapist/subscription", label: "Membership Plans", testId: "link-footer-membership" },
];

const defaultResourceLinks = [
  { href: "/about", label: "About TCKs", testId: "link-footer-about-tcks" },
  { href: "/events", label: "Upcoming Events", testId: "link-footer-upcoming-events" },
  { href: "/directory", label: "Browse Specializations", testId: "link-footer-specializations" },
];

const defaultCompanyLinks = [
  { href: "/about", label: "About Us", testId: "link-footer-about" },
  { href: "/contact", label: "Contact", testId: "link-footer-contact" },
  { href: "/contact", label: "Support", testId: "link-footer-support" },
];

const defaultLegalLinks = [
  { href: "/contact", label: "Privacy Policy", testId: "link-footer-privacy" },
  { href: "/contact", label: "Terms of Service", testId: "link-footer-terms" },
];

type FooterLegalLink = {
  href: string;
  label: string;
  testId: string;
  openInNewTab?: boolean;
};

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string; testId: string }[] }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{title}</h4>
      <ul className="space-y-2.5 sm:space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.testId}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={link.testId}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function flattenFooterItems(items: MenuItem[], depth = 0): { item: MenuItem; depth: number }[] {
  const result: { item: MenuItem; depth: number }[] = [];
  for (const item of items) {
    result.push({ item, depth });
    if (item.children?.length > 0) {
      result.push(...flattenFooterItems(item.children, depth + 1));
    }
  }
  return result;
}

function DynamicFooterColumn({ item }: { item: MenuItem }) {
  const allLinks = flattenFooterItems(item.children || []);
  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{item.label}</h4>
      <ul className="space-y-2.5 sm:space-y-3 text-sm">
        {allLinks.map(({ item: child, depth }) => (
          <li key={child.id} style={depth > 0 ? { paddingLeft: `${depth * 12}px` } : undefined}>
            {child.openInNewTab ? (
              <a
                href={child.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${child.id}`}
              >
                {child.label}
              </a>
            ) : (
              <Link
                href={child.url}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${child.id}`}
              >
                {child.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function flattenMenuLinks(items: MenuItem[]): MenuItem[] {
  return flattenFooterItems(items).map(({ item }) => item);
}

function StandardFooterColumn({ menu }: { menu: CmsMenu }) {
  const links = flattenMenuLinks((menu.items as MenuItem[]) || []);
  if (links.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{menu.name}</h4>
      <ul className="space-y-2.5 sm:space-y-3 text-sm">
        {links.map((item) => (
          <li key={item.id}>
            {item.openInNewTab ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${item.id}`}
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.url}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${item.id}`}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { data: publicMenus } = useQuery<Partial<Record<PublicMenuLocation, CmsMenu>>>({
    queryKey: ["/api/cms/menus"],
    queryFn: async () => {
      const res = await fetch("/api/cms/menus");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  const legacyFooterItems = useMemo(() => {
    const footerMenu = publicMenus?.footer;
    if (!footerMenu?.items) return null;
    const items = footerMenu.items as MenuItem[];
    return items.length > 0 ? items : null;
  }, [publicMenus]);

  const standardFooterMenus = useMemo(
    () => [
      publicMenus?.footer_platform,
      publicMenus?.footer_professionals,
      publicMenus?.footer_resources,
      publicMenus?.footer_company,
    ].filter((menu): menu is CmsMenu => Boolean(menu && Array.isArray(menu.items) && menu.items.length > 0)),
    [publicMenus]
  );

  const legalLinks = useMemo(() => {
    const legalMenu = publicMenus?.footer_legal;
    if (!legalMenu?.items) return defaultLegalLinks;

    const items = flattenMenuLinks((legalMenu.items as MenuItem[]) || []);
    if (items.length === 0) return defaultLegalLinks;

    return items.map((item) => ({
      href: item.url,
      label: item.label,
      openInNewTab: item.openInNewTab,
      testId: `link-footer-${item.id}`,
    }));
  }, [publicMenus]) as FooterLegalLink[];

  const useStandardFooterMenus = standardFooterMenus.length > 0;

  return (
    <footer className="border-t bg-muted/30" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className={`grid grid-cols-2 sm:grid-cols-2 ${useStandardFooterMenus ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-8 sm:gap-10 lg:gap-12`}>
          <div className="col-span-2">
            <img
              src={logoImg}
              alt="TCK Wellness"
              className="h-8 sm:h-9 w-auto mb-3 sm:mb-4 dark:brightness-[1.8] dark:contrast-[0.9]"
            />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Connecting Third Culture Kids with culturally informed mental health professionals worldwide. Find support that understands your unique journey.
            </p>
          </div>

          {useStandardFooterMenus ? (
            standardFooterMenus.map((menu) => <StandardFooterColumn key={menu.id} menu={menu} />)
          ) : legacyFooterItems ? (
            legacyFooterItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <DynamicFooterColumn key={item.id} item={item} />
              ) : (
                <div key={item.id}>
                  <ul className="space-y-2.5 sm:space-y-3 text-sm">
                    <li>
                      {item.openInNewTab ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors font-semibold"
                          data-testid={`link-footer-${item.id}`}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.url}
                          className="text-muted-foreground hover:text-foreground transition-colors font-semibold"
                          data-testid={`link-footer-${item.id}`}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  </ul>
                </div>
              )
            )
          ) : (
            <>
              <FooterColumn title="Platform" links={defaultPlatformLinks} />
              <FooterColumn title="For Mental Health Professionals" links={defaultTherapistLinks} />
              <div className="col-span-2 sm:col-span-1">
                <FooterColumn title="Resources" links={defaultResourceLinks} />
                <div className="mt-6 sm:mt-8">
                  <FooterColumn title="Company" links={defaultCompanyLinks} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 sm:mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-sm text-muted-foreground" data-testid="text-copyright">
          <span className="text-center sm:text-left">&copy; {new Date().getFullYear()} Interaction International. All rights reserved.</span>
          <div className="flex items-center gap-4 sm:gap-6">
            {legalLinks.map((link) =>
              link.openInNewTab ? (
                <a
                  key={link.testId}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  data-testid={link.testId}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.testId}
                  href={link.href}
                  className="hover:text-foreground transition-colors"
                  data-testid={link.testId}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      </div>

      <div className="bg-accent" data-testid="section-disclaimer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <h4 className="font-semibold text-xs mb-2 text-white/90 uppercase tracking-wide">Disclaimer</h4>
          <div className="text-xs italic text-white/75 leading-snug space-y-1.5">
            <p>
              If you or someone you know is experiencing a mental health emergency:{" "}
              In the U.S. please call <span className="font-semibold text-white not-italic">988</span> for the Suicide and Crisis Lifeline. For other emergencies call <span className="font-semibold text-white not-italic">911</span>.{" "}
              Outside the U.S. find international suicide hotlines{" "}
              <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2 hover:text-white/80 not-italic">here</a>.{" "}
              For other emergencies, find help{" "}
              <a href="https://www.who.int/health-topics/emergency-care" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2 hover:text-white/80 not-italic">here</a>.
            </p>
            <p>
              TCK Wellness conducts a vetting process to ensure that each listed provider is TCK-informed. This process includes an application, an interview, and a background check, and approved providers have access to ongoing TCK-informed training opportunities.
            </p>
            <p>
              Neither TCK Wellness nor Interaction International evaluates or verifies providers' qualifications, scope of practice, or expertise outside of TCK-informed care. Individuals are encouraged to use their own discernment when determining whether a provider is an appropriate fit for their specific needs.{" "}
              <Link href="/about" className="text-white underline underline-offset-2 hover:text-white/80 not-italic" data-testid="link-footer-vetted">Learn more about what it means to be vetted</Link>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
