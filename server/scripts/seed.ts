import { db } from "../db";
import { users, therapistProfiles, membershipTiers, events, docs } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@tckwellness.com"));
  if (existingAdmin.length > 0) {
    console.log("Seed data already exists, skipping...");
    return;
  }

  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const therapistPassword = await bcrypt.hash("Therapist123!", 12);
  const clientPassword = await bcrypt.hash("Client123!", 12);

  const [admin] = await db.insert(users).values({
    email: "admin@tckwellness.com",
    password: adminPassword,
    firstName: "Admin",
    lastName: "User",
    role: "admin",
  }).returning();

  const [therapist1] = await db.insert(users).values({
    email: "therapist@test.com",
    password: therapistPassword,
    firstName: "Sarah",
    lastName: "Chen",
    role: "therapist",
  }).returning();

  const [therapist2] = await db.insert(users).values({
    email: "james@tckwellness.com",
    password: therapistPassword,
    firstName: "James",
    lastName: "Okonkwo",
    role: "therapist",
  }).returning();

  const [therapist3] = await db.insert(users).values({
    email: "maria@tckwellness.com",
    password: therapistPassword,
    firstName: "Maria",
    lastName: "Gonzalez",
    role: "therapist",
  }).returning();

  await db.insert(users).values({
    email: "client@test.com",
    password: clientPassword,
    firstName: "Test",
    lastName: "Client",
    role: "client",
  });

  await db.insert(therapistProfiles).values({
    userId: therapist1.id,
    title: "Licensed Clinical Psychologist",
    bio: "With over 10 years of experience working with Third Culture Kids and expats, I specialize in helping individuals navigate the complexities of cross-cultural identity. My practice integrates CBT, EMDR, and mindfulness-based approaches.",
    specializations: ["Third Culture Kids (TCK)", "Cross-Cultural Transitions", "Anxiety", "Identity & Belonging", "EMDR"],
    languages: ["English", "Mandarin"],
    credentials: "Ph.D. Clinical Psychology, Licensed in California",
    licenseNumber: "PSY-12345",
    practiceMode: "both",
    addressLine1: "123 Wellness Center Drive",
    city: "San Francisco",
    state: "CA",
    country: "United States",
    zipCode: "94102",
    latitude: "37.7749",
    longitude: "-122.4194",
    phone: "+1 (415) 555-0123",
    website: "https://drsarahchen.com",
    acceptingClients: true,
    isApproved: true,
    isActive: true,
  });

  await db.insert(therapistProfiles).values({
    userId: therapist2.id,
    title: "Licensed Marriage and Family Therapist",
    bio: "Born and raised across three continents, I bring a deep personal understanding of the TCK experience to my practice. I work with individuals, couples, and families dealing with transition, grief, and cultural adjustment.",
    specializations: ["Third Culture Kids (TCK)", "Expatriate Adjustment", "Grief & Loss", "Family Therapy", "Couples Counseling"],
    languages: ["English", "French", "Swahili"],
    credentials: "M.A. Marriage and Family Therapy, LMFT",
    licenseNumber: "LMFT-67890",
    practiceMode: "virtual",
    acceptingClients: true,
    isApproved: true,
    isActive: true,
  });

  await db.insert(therapistProfiles).values({
    userId: therapist3.id,
    title: "Licensed Professional Counselor",
    bio: "Specializing in trauma-informed care for globally mobile individuals. My approach combines narrative therapy with somatic experiencing to help clients process their unique life stories.",
    specializations: ["Trauma & PTSD", "Cross-Cultural Transitions", "Anxiety", "Depression", "Mindfulness & Meditation"],
    languages: ["English", "Spanish", "Portuguese"],
    credentials: "M.S. Clinical Mental Health Counseling, LPC",
    licenseNumber: "LPC-54321",
    practiceMode: "in_person",
    addressLine1: "456 Global Therapy Suite",
    city: "New York",
    state: "NY",
    country: "United States",
    zipCode: "10001",
    latitude: "40.7128",
    longitude: "-74.0060",
    phone: "+1 (212) 555-0456",
    website: "https://mariagonzalezcounseling.com",
    acceptingClients: true,
    isApproved: true,
    isActive: true,
  });

  await db.insert(membershipTiers).values([
    {
      name: "Basic",
      description: "Essential directory listing for therapists just getting started.",
      monthlyPrice: 2900,
      annualPrice: 29000,
      features: ["Basic directory listing", "Profile page", "Contact form", "Email support"],
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Professional",
      description: "Enhanced visibility and features for growing practices.",
      monthlyPrice: 4900,
      annualPrice: 49000,
      features: ["Featured directory listing", "Profile page with media", "Priority in search results", "Analytics dashboard", "Email & chat support"],
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Premium",
      description: "Maximum exposure and premium features for established practices.",
      monthlyPrice: 7900,
      annualPrice: 79000,
      features: ["Top-tier directory placement", "Profile page with video", "Priority search + featured badge", "Advanced analytics", "Blog/article publishing", "Dedicated support", "Event hosting"],
      isActive: true,
      sortOrder: 3,
    },
  ]);

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await db.insert(events).values([
    {
      title: "Understanding the TCK Experience",
      description: "Join us for an insightful webinar exploring the unique challenges and strengths of Third Culture Kids. Led by Dr. Sarah Chen, this session will cover identity formation, belonging, and resilience.",
      date: nextWeek,
      endDate: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
      location: "Zoom Webinar",
      isVirtual: true,
      zoomLink: "https://zoom.us/j/example",
      memberOnly: false,
    },
    {
      title: "Therapist Networking Mixer",
      description: "Monthly networking event for TCK Wellness member therapists. Share best practices, discuss challenging cases, and build your professional community.",
      date: nextMonth,
      endDate: new Date(nextMonth.getTime() + 3 * 60 * 60 * 1000),
      location: "San Francisco Community Center, 100 Larkin St",
      isVirtual: false,
      memberOnly: true,
    },
    {
      title: "Cross-Cultural Parenting Workshop",
      description: "A recorded workshop on navigating cross-cultural parenting challenges. Available for replay.",
      date: lastWeek,
      endDate: new Date(lastWeek.getTime() + 1.5 * 60 * 60 * 1000),
      location: "Online",
      isVirtual: true,
      memberOnly: false,
    },
  ]);

  await db.insert(docs).values([
    {
      title: "Getting Started",
      slug: "getting-started",
      category: "Getting Started",
      content: `# Getting Started with TCK Wellness Admin\n\nWelcome to the TCK Wellness administration panel. This guide will help you get oriented with the platform.\n\n## Quick Start\n\n1. **Review Pending Therapists** - Check the Therapists page for new applications\n2. **Set Up Membership Tiers** - Configure pricing on the Membership Tiers page\n3. **Create Events** - Add upcoming events on the Events page\n4. **Monitor Messages** - Check the Messages page for contact form submissions\n\n## Navigation\n\nUse the sidebar to navigate between sections. Each section has its own set of tools and views.`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "User Roles & Permissions",
      slug: "user-roles",
      category: "User Management",
      content: `# User Roles & Permissions\n\n## Admin\n- Full platform access\n- Manage therapists, users, tiers, events\n- View analytics and messages\n- Access documentation library\n\n## Therapist\n- Edit own profile\n- Manage subscription\n- View practice analytics\n\n## Client\n- Browse therapist directory\n- View therapist profiles\n- Submit contact forms\n- View public events`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "Managing Therapists",
      slug: "managing-therapists",
      category: "Therapist Management",
      content: `# Managing Therapists\n\n## Approval Process\n\nWhen a therapist registers, their profile starts as unapproved. Admins must review and approve profiles before they appear in the public directory.\n\n### To Approve a Therapist:\n1. Go to Admin → Therapists\n2. Find the pending therapist\n3. Review their credentials and profile\n4. Click "Approve" to make them visible in the directory\n\n## Custom Pricing\n\nAdmins can set custom subscription pricing per therapist if needed. This overrides the standard tier pricing.`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "Subscriptions & Billing",
      slug: "subscriptions-billing",
      category: "Subscriptions & Billing",
      content: `# Subscriptions & Billing\n\n## Stripe Integration\n\nTCK Wellness uses Stripe for payment processing. All subscription management, billing, and invoicing is handled through Stripe.\n\n## Membership Tiers\n\n- **Basic** ($29/mo) - Essential directory listing\n- **Professional** ($49/mo) - Enhanced visibility and features\n- **Premium** ($79/mo) - Maximum exposure and premium features\n\n## Managing Tiers\n\nAdmins can create, edit, and manage membership tiers from the Membership Tiers page. Changes to pricing require updating the corresponding Stripe price IDs.`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "Directory Features",
      slug: "directory-features",
      category: "Directory & Search",
      content: `# Directory Features\n\n## Search & Filters\n\nThe public directory supports filtering by:\n- Specialization\n- Practice mode (in-person, virtual, both)\n- Language\n- Accepting new clients\n\n## Map View\n\nTherapists with physical locations appear on an interactive map using OpenStreetMap. Virtual-only therapists appear in the list view with a distinct badge.\n\n## Profile Pages\n\nEach therapist has a detailed profile page showing their credentials, specializations, bio, and contact information.`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "Events Management",
      slug: "events-management",
      category: "Events",
      content: `# Events Management\n\n## Creating Events\n\n1. Go to Admin → Events\n2. Click "Create Event"\n3. Fill in the event details\n4. Set the date, time, and location\n5. Mark as virtual if applicable\n6. Toggle "Member Only" to restrict access\n\n## Event Types\n\n- **Public Events** - Visible to everyone\n- **Member-Only Events** - Only accessible to subscribed therapists\n- **Virtual Events** - Online events with Zoom links\n- **In-Person Events** - Physical location events`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "API Reference",
      slug: "api-reference",
      category: "API Reference",
      content: `# API Reference\n\n## Authentication\n- POST /api/auth/register - Register new user\n- POST /api/auth/login - Login\n- POST /api/auth/logout - Logout\n- GET /api/auth/me - Get current user\n\n## Directory\n- GET /api/therapists - List therapists (public)\n- GET /api/therapists/:id - Get therapist profile\n\n## Therapist\n- GET /api/therapist/profile - Get own profile\n- PUT /api/therapist/profile - Update own profile\n- GET /api/therapist/subscription - Get subscription status\n\n## Stripe\n- POST /api/stripe/create-checkout-session - Create checkout\n- POST /api/stripe/create-portal-session - Open billing portal\n\n## Admin\n- GET /api/admin/dashboard-stats - Dashboard statistics\n- GET/PUT /api/admin/therapists - Manage therapists\n- GET/PUT /api/admin/users - Manage users\n- CRUD /api/admin/membership-tiers - Manage tiers\n- CRUD /api/admin/events - Manage events\n- GET /api/admin/messages - View messages\n- CRUD /api/admin/docs - Manage documentation`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
    {
      title: "System Architecture",
      slug: "system-architecture",
      category: "System Architecture",
      content: `# System Architecture\n\n## Tech Stack\n\n- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui\n- **Backend**: Express.js, TypeScript\n- **Database**: PostgreSQL with Drizzle ORM\n- **Authentication**: Custom JWT with HTTP-only cookies\n- **Payments**: Stripe subscriptions\n- **Maps**: OpenStreetMap + Leaflet (Google Maps-ready architecture)\n- **Routing**: Wouter (client), Express (server)\n- **State**: TanStack Query v5\n\n## File Structure\n\nThe project uses a modular enterprise-grade file structure:\n- \`shared/schema/\` - Database schemas (Drizzle)\n- \`shared/types/\` - Shared TypeScript types\n- \`server/routes/\` - Modular API routes\n- \`server/storage/\` - Data access layer\n- \`server/middleware/\` - Auth, validation, error handling\n- \`client/src/features/\` - Feature-based frontend modules\n- \`client/src/components/\` - Shared UI components`,
      sortOrder: 1,
      isPublished: true,
      createdBy: admin.id,
    },
  ]);

  console.log("Seed data created successfully!");
}

seed().catch(console.error);
