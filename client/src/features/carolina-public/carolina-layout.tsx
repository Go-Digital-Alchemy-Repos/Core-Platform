import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ChevronDown, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { useBranding } from "@/components/shared/branding-provider";
import { Button } from "@/components/ui/button";
import {
  CAROLINA_BRAND,
  COMMERCIAL_SERVICES,
  RESIDENTIAL_SERVICES,
  SERVICE_AREAS,
  imagePath,
} from "@shared/carolina-site";

const logoFull = imagePath("logo-full.png");

export function CarolinaLayout({ children }: { children: ReactNode }) {
  const { frontendLogoUrl } = useBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const brandLogo = frontendLogoUrl || logoFull;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="carolina-theme min-h-screen flex flex-col font-sans bg-background text-foreground">
      <div className="bg-primary text-primary-foreground py-2 px-4 hidden md:block text-sm font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              Serving {CAROLINA_BRAND.region}
            </span>
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              <a href={`mailto:${CAROLINA_BRAND.email}`} className="hover:text-accent">
                {CAROLINA_BRAND.email}
              </a>
            </span>
          </div>
          <span>{CAROLINA_BRAND.founded}</span>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "bg-background/95 backdrop-blur-md shadow-sm py-2" : "bg-background py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center group z-50">
            <img
              src={brandLogo}
              alt={CAROLINA_BRAND.name}
              className="h-9 md:h-11 w-auto group-hover:scale-105 transition-transform"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 font-bold text-sm text-foreground/80">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <MenuGroup label="Residential">
              {RESIDENTIAL_SERVICES.map((service) => (
                <Link
                  key={service.slug}
                  href={`/${service.slug}`}
                  className="p-3 hover:bg-muted rounded-sm transition-colors text-sm"
                >
                  {service.name}
                </Link>
              ))}
              <div className="h-px bg-border my-1" />
              <Link
                href="/gallery"
                className="p-3 hover:bg-muted rounded-sm transition-colors text-sm text-primary"
              >
                View Gallery
              </Link>
            </MenuGroup>
            <MenuGroup label="Commercial">
              <Link
                href="/commercial"
                className="p-3 hover:bg-muted rounded-sm transition-colors text-sm font-extrabold"
              >
                Commercial Hub
              </Link>
              {COMMERCIAL_SERVICES.map((service) => (
                <Link
                  key={service.slug}
                  href={`/${service.slug}`}
                  className="p-3 hover:bg-muted rounded-sm transition-colors text-sm"
                >
                  {service.name}
                </Link>
              ))}
              <div className="h-px bg-border my-1" />
              <Link
                href="/commercial-portfolio"
                className="p-3 hover:bg-muted rounded-sm transition-colors text-sm text-primary"
              >
                View Portfolio
              </Link>
            </MenuGroup>
            <Link href="/about" className="hover:text-primary transition-colors">
              About
            </Link>
            <Link href="/blog" className="hover:text-primary transition-colors">
              Blog
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <a
              href={`tel:${CAROLINA_BRAND.phoneTel}`}
              className="flex items-center gap-2 font-extrabold text-foreground hover:text-primary"
            >
              <Phone className="h-5 w-5 text-primary" />
              {CAROLINA_BRAND.phoneDisplay}
            </a>
            <Link href="/get-a-quote">
              <Button className="font-extrabold tracking-wide">GET A QUOTE</Button>
            </Link>
          </div>

          <button
            className="lg:hidden p-2 text-foreground z-50 relative"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={`fixed inset-0 bg-background z-40 transition-transform duration-300 pt-24 px-6 overflow-y-auto ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col gap-6 font-extrabold text-2xl">
            <Link href="/">Home</Link>
            <Link href="/about">About Us</Link>
            <MobileMenuSection title="Residential">
              {RESIDENTIAL_SERVICES.map((service) => (
                <Link key={service.slug} href={`/${service.slug}`}>
                  {service.name}
                </Link>
              ))}
              <Link href="/gallery" className="text-primary">
                Gallery
              </Link>
            </MobileMenuSection>
            <MobileMenuSection title="Commercial">
              <Link href="/commercial">Commercial Services Hub</Link>
              {COMMERCIAL_SERVICES.map((service) => (
                <Link key={service.slug} href={`/${service.slug}`}>
                  {service.name}
                </Link>
              ))}
              <Link href="/commercial-portfolio" className="text-primary">
                Portfolio
              </Link>
            </MobileMenuSection>
            <Link href="/service-areas">Service Areas</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/faq">FAQ</Link>
            <div className="mt-8 flex flex-col gap-4">
              <a
                href={`tel:${CAROLINA_BRAND.phoneTel}`}
                className="flex items-center justify-center gap-2 font-extrabold bg-muted p-4 rounded-md"
              >
                <Phone className="h-5 w-5 text-primary" />
                {CAROLINA_BRAND.phoneDisplay}
              </a>
              <Link href="/get-a-quote">
                <Button size="lg" className="w-full text-lg h-14">
                  GET A QUOTE
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="bg-foreground text-background pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <img
                src={brandLogo}
                alt={CAROLINA_BRAND.name}
                className="h-10 w-auto brightness-0 invert"
              />
              <p className="text-muted/80 text-sm leading-relaxed font-medium">
                {CAROLINA_BRAND.tagline} {CAROLINA_BRAND.subTagline}.<br />
                We are proud to serve {CAROLINA_BRAND.county} and the {CAROLINA_BRAND.region}.
              </p>
              <div className="space-y-3 font-bold text-sm">
                <FooterContact href={`tel:${CAROLINA_BRAND.phoneTel}`} icon={<Phone />}>
                  {CAROLINA_BRAND.phoneDisplay}
                </FooterContact>
                <FooterContact href={`mailto:${CAROLINA_BRAND.email}`} icon={<Mail />}>
                  {CAROLINA_BRAND.email}
                </FooterContact>
                <div className="flex items-center gap-3">
                  <IconBubble>
                    <MapPin className="h-4 w-4" />
                  </IconBubble>
                  {CAROLINA_BRAND.city}, {CAROLINA_BRAND.state}
                </div>
              </div>
            </div>
            <FooterLinks
              title="Residential"
              links={RESIDENTIAL_SERVICES}
              extra={{ label: "Gallery", href: "/gallery" }}
            />
            <FooterLinks
              title="Commercial"
              links={COMMERCIAL_SERVICES}
              extra={{ label: "Commercial Hub", href: "/commercial" }}
            />
            <div>
              <h4 className="font-extrabold text-lg mb-6 border-b border-white/10 pb-4">
                Service Areas
              </h4>
              <ul className="grid grid-cols-2 gap-3 text-sm font-medium text-muted/80">
                {SERVICE_AREAS.map((area) => (
                  <li key={area.slug}>
                    <Link href={`/service-areas/${area.slug}`} className="hover:text-primary">
                      {area.city}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/get-a-quote">
                <Button
                  variant="outline"
                  className="mt-8 w-full bg-transparent border-primary text-primary hover:bg-primary hover:text-white"
                >
                  REQUEST A QUOTE
                </Button>
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-muted/50">
            <p>
              &copy; {new Date().getFullYear()} {CAROLINA_BRAND.name}. All rights reserved.
            </p>
            <div className="flex gap-6">
              <span>{CAROLINA_BRAND.founded}</span>
              <Link href="/about" className="hover:text-white">
                About Us
              </Link>
              <Link href="/blog" className="hover:text-white">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 hover:text-primary transition-colors py-2">
        {label} <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform" />
      </button>
      <div className="absolute top-full left-0 w-64 bg-background border border-border shadow-lg rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0">
        <div className="p-2 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

function MobileMenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="h-px bg-border my-2" />
      <span className="text-primary text-sm tracking-widest uppercase">{title}</span>
      <div className="flex flex-col gap-4 text-lg text-foreground/80 font-bold ml-4">
        {children}
      </div>
    </>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary [&_svg]:h-4 [&_svg]:w-4">
      {children}
    </div>
  );
}

function FooterContact({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a href={href} className="flex items-center gap-3 hover:text-primary transition-colors">
      <IconBubble>{icon}</IconBubble>
      {children}
    </a>
  );
}

function FooterLinks({
  title,
  links,
  extra,
}: {
  title: string;
  links: readonly { slug: string; name: string }[];
  extra?: { label: string; href: string };
}) {
  const allLinks = extra
    ? [
        {
          slug: extra.href.replace(/^\//, ""),
          name: extra.label,
          href: extra.href,
        },
        ...links,
      ]
    : links;

  return (
    <div>
      <h4 className="font-extrabold text-lg mb-6 border-b border-white/10 pb-4">{title}</h4>
      <ul className="space-y-3 text-sm font-medium text-muted/80">
        {allLinks.map((link) => {
          const href = "href" in link ? link.href : `/${link.slug}`;
          return (
            <li key={href}>
              <Link
                href={href}
                className="hover:text-primary transition-colors flex items-center gap-2 group"
              >
                <ArrowRight className="h-3 w-3 text-primary opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                {link.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
