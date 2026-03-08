import { Link } from "wouter";
import logoImg from "@assets/IMG_0002_1772999718659.png";

const platformLinks = [
  { href: "/directory", label: "Find a Therapist", testId: "link-footer-directory" },
  { href: "/events", label: "Events & Workshops", testId: "link-footer-events" },
  { href: "/about", label: "How It Works", testId: "link-footer-how-it-works" },
];

const therapistLinks = [
  { href: "/auth/register", label: "Join the Directory", testId: "link-footer-join" },
  { href: "/auth/login", label: "Therapist Login", testId: "link-footer-login" },
  { href: "/therapist/subscription", label: "Membership Plans", testId: "link-footer-membership" },
];

const resourceLinks = [
  { href: "/about", label: "About TCKs", testId: "link-footer-about-tcks" },
  { href: "/events", label: "Upcoming Events", testId: "link-footer-upcoming-events" },
  { href: "/directory", label: "Browse Specializations", testId: "link-footer-specializations" },
];

const companyLinks = [
  { href: "/about", label: "About Us", testId: "link-footer-about" },
  { href: "/contact", label: "Contact", testId: "link-footer-contact" },
  { href: "/contact", label: "Support", testId: "link-footer-support" },
];

function FooterColumn({ title, links }: { title: string; links: typeof platformLinks }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-4 text-foreground">{title}</h4>
      <ul className="space-y-3 text-sm">
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

export function Footer() {
  return (
    <footer className="border-t bg-muted/30" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-2">
            <img
              src={logoImg}
              alt="TCK Wellness"
              className="h-9 w-auto mb-4 dark:brightness-[1.8] dark:contrast-[0.9]"
            />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Connecting Third Culture Kids with culturally informed therapists worldwide. Find support that understands your unique journey.
            </p>
          </div>

          <FooterColumn title="Platform" links={platformLinks} />
          <FooterColumn title="For Therapists" links={therapistLinks} />
          <div>
            <FooterColumn title="Resources" links={resourceLinks} />
            <div className="mt-8">
              <FooterColumn title="Company" links={companyLinks} />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground" data-testid="text-copyright">
          <span>&copy; {new Date().getFullYear()} TCK Wellness. All rights reserved.</span>
          <div className="flex items-center gap-6 flex-wrap">
            <Link href="/contact" className="hover:text-foreground transition-colors" data-testid="link-footer-privacy">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors" data-testid="link-footer-terms">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
