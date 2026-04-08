import { TherapistSidebar } from "./therapist-sidebar";

interface TherapistLayoutProps {
  children: React.ReactNode;
}

export function TherapistLayout({ children }: TherapistLayoutProps) {
  return (
    <TherapistSidebar>
      {children}
    </TherapistSidebar>
  );
}
