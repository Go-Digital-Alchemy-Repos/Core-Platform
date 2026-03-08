import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <h3 className="font-heading text-lg font-semibold mb-3">TCK Wellness</h3>
            <p className="text-sm text-muted-foreground">
              Connecting Third Culture Kids with culturally informed therapists worldwide.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/directory" className="text-muted-foreground hover:text-foreground" data-testid="link-footer-directory">
                  Directory
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-muted-foreground hover:text-foreground" data-testid="link-footer-events">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground" data-testid="link-footer-about">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground" data-testid="link-footer-contact">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">For Therapists</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth/register" className="text-muted-foreground hover:text-foreground" data-testid="link-footer-join">
                  Join the Directory
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-muted-foreground hover:text-foreground" data-testid="link-footer-login">
                  Therapist Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground" data-testid="text-copyright">
          &copy; {new Date().getFullYear()} TCK Wellness. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
