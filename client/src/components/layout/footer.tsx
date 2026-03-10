import { Link } from "wouter";
import logoImg from "@assets/IMG_0002_1772999718659.png";

const platformLinks = [
  { href: "/directory", label: "Find a Counselor", testId: "link-footer-directory" },
  { href: "/events", label: "Events & Workshops", testId: "link-footer-events" },
  { href: "/about", label: "How It Works", testId: "link-footer-how-it-works" },
];

const therapistLinks = [
  { href: "/auth/register", label: "Join the Directory", testId: "link-footer-join" },
  { href: "/auth/login", label: "Counselor Login", testId: "link-footer-login" },
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

export function Footer() {
  return (
    <footer className="border-t bg-muted/30" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12">
          <div className="col-span-2">
            <img
              src={logoImg}
              alt="TCK Wellness"
              className="h-8 sm:h-9 w-auto mb-3 sm:mb-4 dark:brightness-[1.8] dark:contrast-[0.9]"
            />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Connecting Third Culture Kids with culturally informed counselors worldwide. Find support that understands your unique journey.
            </p>
          </div>

          <FooterColumn title="Platform" links={platformLinks} />
          <FooterColumn title="For Counselors" links={therapistLinks} />
          <div className="col-span-2 sm:col-span-1">
            <FooterColumn title="Resources" links={resourceLinks} />
            <div className="mt-6 sm:mt-8">
              <FooterColumn title="Company" links={companyLinks} />
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-6 border-t" data-testid="section-disclaimer">
          <h4 className="font-semibold text-xs mb-3 text-foreground uppercase tracking-wide">Disclaimer</h4>
          <div className="text-xs italic text-muted-foreground leading-relaxed space-y-3">
            <p>
              If you or someone you know is experiencing a mental health emergency:{" "}
              In the U.S. please call <span className="font-semibold text-foreground not-italic">988</span> for the Suicide and Crisis Lifeline. For other emergencies call <span className="font-semibold text-foreground not-italic">911</span>.{" "}
              Outside the U.S. find international suicide hotlines{" "}
              <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent/80 not-italic">here</a>.{" "}
              For other emergencies, find help{" "}
              <a href="https://www.who.int/health-topics/emergency-care" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent/80 not-italic">here</a>.
            </p>
            <p>
              TCK Wellness conducts a vetting process to ensure that each listed provider is TCK-informed. This process includes an application, an interview, and a background check, and approved providers have access to ongoing TCK-informed training opportunities.
            </p>
            <p>
              Neither TCK Wellness nor Interaction International evaluates or verifies providers' qualifications, scope of practice, or expertise outside of TCK-informed care. Individuals are encouraged to use their own discernment when determining whether a provider is an appropriate fit for their specific needs.{" "}
              <Link href="/about" className="text-accent underline underline-offset-2 hover:text-accent/80 not-italic" data-testid="link-footer-vetted">Learn more about what it means to be vetted</Link>.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-sm text-muted-foreground" data-testid="text-copyright">
          <span className="text-center sm:text-left">&copy; {new Date().getFullYear()} TCK Wellness. All rights reserved.</span>
          <div className="flex items-center gap-4 sm:gap-6">
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
