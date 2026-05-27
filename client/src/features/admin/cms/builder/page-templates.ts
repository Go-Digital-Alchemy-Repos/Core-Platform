import { createBlock, type BlockInstance } from "./block-registry";

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "starter" | "marketing" | "content";
  blockCount: number;
  blocks: () => BlockInstance[];
}

function block(type: string, overrides?: Record<string, unknown>): BlockInstance {
  const b = createBlock(type);
  if (overrides) {
    b.props = { ...b.props, ...overrides };
  }
  return b;
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "blank",
    name: "Blank Page",
    description: "Start from scratch with an empty canvas",
    icon: "FileText",
    category: "starter",
    blockCount: 0,
    blocks: () => [],
  },
  {
    id: "landing-v1",
    name: "Landing Page v1",
    description: "High-conversion landing page with hero, social proof, features, and CTA",
    icon: "Sparkles",
    category: "marketing",
    blockCount: 8,
    blocks: () => [
      block("hero", {
        heading: "Find a Counselor Who Understands Your World",
        subheading: "Connect with culturally informed mental health professionals who specialize in the Third Culture Kid experience.",
        ctaText: "Browse Counselors",
        ctaLink: "/directory",
        ctaSecondaryText: "Learn More",
        ctaSecondaryLink: "#how-it-works",
        minHeight: "560",
      }),
      block("trust-bar"),
      block("social-proof-stats", {
        stats: [
          { value: "500+", label: "Verified Counselors" },
          { value: "40+", label: "Countries Represented" },
          { value: "10,000+", label: "Core Platforms Connected" },
          { value: "4.9/5", label: "Average Rating" },
        ],
      }),
      block("section-header", {
        eyebrow: "How It Works",
        title: "Your Path to Support in 3 Simple Steps",
        subtitle: "Getting started with Core Platform is straightforward and stress-free.",
      }),
      block("delivery-setup", {
        title: "",
        steps: [
          { step: "1", title: "Browse the Directory", description: "Search by specialty, language, location, or therapy style to find your ideal match." },
          { step: "2", title: "Review Profiles", description: "Read about their qualifications, approach, and lived cross-cultural experience." },
          { step: "3", title: "Connect & Begin", description: "Reach out directly through their profile to schedule your first session." },
        ],
      }),
      block("feature-list", {
        title: "Why Core Platform?",
        subtitle: "We built this platform specifically for the Core Platform community.",
        columns: "3",
        features: [
          { icon: "Globe", title: "Culturally Informed Care", description: "Every counselor understands the nuances of growing up between cultures." },
          { icon: "ShieldCheck", title: "Vetted Professionals", description: "Thorough verification ensures quality and safety for every member." },
          { icon: "Heart", title: "Core Platform-Specific Training", description: "Counselors with specialized training in cross-cultural identity and transition." },
        ],
      }),
      block("testimonials", {
        title: "What Our Community Says",
        items: [
          { quote: "Finding a counselor who truly understood my Core Platform experience was life-changing.", name: "Sarah M.", role: "Adult Core Platform", location: "Singapore" },
          { quote: "I finally feel seen and understood in a way I never did before.", name: "James T.", role: "Core Platform Client", location: "Germany" },
          { quote: "The platform made it so easy to find the right fit for my needs.", name: "Priya K.", role: "Expat Parent", location: "UAE" },
        ],
      }),
      block("cta", {
        heading: "Ready to Find Your Match?",
        subheading: "Browse our network of Core Platform-informed counselors and take the first step today.",
        primaryText: "Browse Counselors",
        primaryLink: "/directory",
        secondaryText: "Join as a Counselor",
        secondaryLink: "/join",
        variant: "dark",
      }),
    ],
  },
  {
    id: "content-story-v1",
    name: "Content Story v1",
    description: "Long-form storytelling page with rich text, images, and supporting sections",
    icon: "BookOpen",
    category: "content",
    blockCount: 6,
    blocks: () => [
      block("section-header", {
        eyebrow: "Our Story",
        title: "The Core Platform Mission",
        subtitle: "How we're building a bridge between Third Culture Kids and the mental health support they deserve.",
        alignment: "center",
      }),
      block("text-image", {
        heading: "A Community Built on Understanding",
        body: "Core Platform was born from a simple realization: Third Culture Kids face unique mental health challenges that most professionals aren't equipped to handle. Growing up between cultures creates a rich but complex inner world that requires specialized understanding.",
        imageAlt: "Core Platform community",
        imagePosition: "right",
      }),
      block("rich-text", {
        content: "<h2>Why Cross-Cultural Competence Matters</h2><p>Traditional therapy approaches often miss the nuances of the Core Platform experience. Issues like rootlessness, cultural identity confusion, and hidden grief require professionals who have either lived the experience themselves or received specific training.</p><p>Our platform bridges this gap by connecting Core Platforms with counselors who truly understand their world.</p>",
        alignment: "left",
      }),
      block("text-image", {
        heading: "Our Impact So Far",
        body: "Since our founding, we've connected thousands of Core Platforms with culturally informed counselors across more than 40 countries. Every match represents a step toward better mental health support for the global community.",
        imageAlt: "Global impact",
        imagePosition: "left",
      }),
      block("benefit-stack", {
        title: "What Sets Us Apart",
        layout: "timeline",
        items: [
          { icon: "Globe", title: "Global Network", description: "Counselors across 40+ countries speaking dozens of languages." },
          { icon: "ShieldCheck", title: "Rigorous Vetting", description: "Every professional undergoes thorough verification and background checks." },
          { icon: "Heart", title: "Cultural Sensitivity", description: "Training requirements ensure counselors understand cross-cultural challenges." },
          { icon: "Users", title: "Community Focus", description: "Built by Core Platforms, for Core Platforms — we understand because we've lived it." },
        ],
      }),
      block("cta", {
        heading: "Join Our Mission",
        subheading: "Whether you're seeking support or want to help others, there's a place for you here.",
        primaryText: "Find a Counselor",
        primaryLink: "/directory",
        secondaryText: "Join as a Counselor",
        secondaryLink: "/join",
        variant: "accent",
      }),
    ],
  },
  {
    id: "conversion-funnel-v1",
    name: "Conversion Funnel v1",
    description: "Persuasion-focused page with objection handling, before/after, and strong CTAs",
    icon: "TrendingUp",
    category: "marketing",
    blockCount: 7,
    blocks: () => [
      block("hero", {
        heading: "Stop Explaining Your Background — Start Being Understood",
        subheading: "Connect with a counselor who gets the Core Platform experience without needing a cultural crash course.",
        ctaText: "Find Your Counselor",
        ctaLink: "/directory",
        ctaSecondaryText: "",
        ctaSecondaryLink: "",
        minHeight: "420",
        badge: "For Third Culture Kids",
      }),
      block("recovery-use-cases", {
        title: "Is Core Platform Right for You?",
        subtitle: "Our platform serves a diverse range of cross-cultural individuals and families.",
        personas: [
          { title: "Adult Core Platforms", description: "You grew up across cultures and struggle with identity, belonging, or unresolved grief from constant transitions.", icon: "User" },
          { title: "Expat Families", description: "You're raising children between cultures and want proactive mental health support for your family.", icon: "Users" },
          { title: "Cross-Cultural Couples", description: "You and your partner navigate different cultural backgrounds and need help bridging the gap.", icon: "Heart" },
        ],
      }),
      block("before-after", {
        title: "Your Transformation Journey",
        items: [
          { before: "Feeling isolated and misunderstood", after: "Connected with a counselor who gets it", milestone: "Week 1" },
          { before: "Struggling to articulate cross-cultural grief", after: "Learning frameworks to process your experience", milestone: "Month 1" },
          { before: "Navigating identity confusion alone", after: "Building confidence in your multicultural identity", milestone: "Month 3" },
        ],
      }),
      block("social-proof-stats", {
        stats: [
          { value: "500+", label: "Verified Counselors" },
          { value: "40+", label: "Countries" },
          { value: "98%", label: "Satisfaction Rate" },
        ],
      }),
      block("objection-busters", {
        title: "Common Questions & Concerns",
        items: [
          { concern: "Will the counselor understand my background?", response: "Every counselor in our directory has specific training or lived experience with cross-cultural populations. We don't just list anyone." },
          { concern: "Is online therapy really effective?", response: "Research consistently shows online therapy is as effective as in-person for many conditions — and it's especially valuable for globally mobile individuals." },
          { concern: "What if I don't find the right fit?", response: "Our directory lets you filter by specialty, language, location, and approach. Plus, our support team can help you find the right match." },
        ],
      }),
      block("guarantee-warranty", {
        title: "Our Commitment to You",
        items: [
          { text: "Every counselor is individually vetted and verified" },
          { text: "Your privacy and confidentiality are always protected" },
          { text: "Support team available to help you find the right match" },
          { text: "No hidden fees — browse the directory completely free" },
        ],
        ctaText: "Need Help? Contact Support",
        ctaLink: "/contact",
      }),
      block("cta", {
        heading: "Take the First Step Today",
        subheading: "Join thousands of Core Platforms who've found the support they deserve. Browse our directory — it's completely free.",
        primaryText: "Browse Counselors Now",
        primaryLink: "/directory",
        secondaryText: "",
        secondaryLink: "",
        variant: "dark",
      }),
    ],
  },
  {
    id: "blog-page-v1",
    name: "Blog Page v1",
    description: "Blog listing page with an editable intro, featured post, and configurable post feed",
    icon: "Newspaper",
    category: "content",
    blockCount: 3,
    blocks: () => [
      block("section-header", {
        eyebrow: "Core Platform Blog",
        title: "Insights & Articles",
        subtitle: "Explore articles, research, and insights on Third Culture Kid mental health and cross-cultural counseling.",
        alignment: "center",
      }),
      block("blog-featured-post", {
        layout: "split",
      }),
      block("blog-post-feed", {
        postsPerPage: 9,
        gridColumns: "3",
        feedStyle: "pagination",
        showSearch: true,
        showCategoryFilter: true,
        showTagFilter: true,
      }),
    ],
  },
];

export interface LandingPageGoal {
  id: string;
  label: string;
  description: string;
}

export const LANDING_PAGE_GOALS: LandingPageGoal[] = [
  { id: "find-counselor", label: "Help users find a counselor", description: "Drive visitors to browse and connect with counselors" },
  { id: "join-network", label: "Recruit counselors to join", description: "Convince mental health professionals to join the network" },
  { id: "build-awareness", label: "Build awareness about Core Platform", description: "Educate visitors about the Core Platform experience and the platform" },
  { id: "promote-event", label: "Promote an event or webinar", description: "Drive registrations for upcoming community events" },
  { id: "general", label: "General purpose landing page", description: "Flexible landing page for any campaign or purpose" },
];

export interface AudienceOption {
  id: string;
  label: string;
}

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  { id: "adult-corePlatforms", label: "Adult Core Platforms" },
  { id: "expat-families", label: "Expat Families" },
  { id: "cross-cultural-couples", label: "Cross-Cultural Couples" },
  { id: "organizations", label: "Organizations & Schools" },
  { id: "counselors", label: "Mental Health Professionals" },
  { id: "general", label: "General Audience" },
];

export interface WizardBlockOption {
  id: string;
  type: string;
  label: string;
  description: string;
  recommended: boolean;
}

export function getRecommendedBlocks(goalId: string): WizardBlockOption[] {
  const all: WizardBlockOption[] = [
    { id: "hero", type: "hero", label: "Hero Section", description: "Full-width hero with heading and CTA buttons", recommended: true },
    { id: "trust-bar", type: "trust-bar", label: "Trust Bar", description: "Row of trust signals (verified, secure, etc.)", recommended: false },
    { id: "stats", type: "social-proof-stats", label: "Statistics", description: "Key numbers and metrics", recommended: false },
    { id: "features", type: "feature-list", label: "Features / Benefits", description: "Icon + text feature cards", recommended: false },
    { id: "how-it-works", type: "delivery-setup", label: "How It Works", description: "Step-by-step process", recommended: false },
    { id: "testimonials", type: "testimonials", label: "Testimonials", description: "Quotes from community members", recommended: false },
    { id: "use-cases", type: "recovery-use-cases", label: "Who It's For", description: "Persona-based messaging", recommended: false },
    { id: "before-after", type: "before-after", label: "Before & After", description: "Transformation journey milestones", recommended: false },
    { id: "objections", type: "objection-busters", label: "Objection Busters", description: "Address common concerns", recommended: false },
    { id: "faq", type: "faq", label: "FAQ", description: "Frequently asked questions", recommended: false },
    { id: "guarantee", type: "guarantee-warranty", label: "Guarantee", description: "Trust-building commitments", recommended: false },
    { id: "cta", type: "cta", label: "Call to Action", description: "Bold CTA section with buttons", recommended: true },
    { id: "events", type: "events-preview", label: "Events Preview", description: "Upcoming events from the system", recommended: false },
    { id: "counselors", type: "featured-professionals", label: "Featured Counselors", description: "Live counselor cards from directory", recommended: false },
  ];

  const goalRecommendations: Record<string, string[]> = {
    "find-counselor": ["hero", "trust-bar", "stats", "how-it-works", "testimonials", "cta"],
    "join-network": ["hero", "stats", "features", "testimonials", "guarantee", "cta"],
    "build-awareness": ["hero", "features", "use-cases", "before-after", "faq", "cta"],
    "promote-event": ["hero", "stats", "features", "events", "testimonials", "cta"],
    "general": ["hero", "features", "testimonials", "cta"],
  };

  const recommended = goalRecommendations[goalId] ?? goalRecommendations["general"];
  return all.map((b) => ({ ...b, recommended: recommended!.includes(b.id) }));
}

const AUDIENCE_LABELS: Record<string, string> = {
  "adult-corePlatforms": "Adult Core Platforms",
  "expat-families": "Expat Families",
  "cross-cultural-couples": "Cross-Cultural Couples",
  "organizations": "Organizations & Schools",
  "counselors": "Mental Health Professionals",
  "general": "Everyone",
};

function buildAudienceSubheading(audiences: string[], fallback: string): string {
  if (!audiences.length) return fallback;
  const labels = audiences.map((a) => AUDIENCE_LABELS[a] ?? a);
  if (labels.length === 1) return `Designed specifically for ${labels[0]}.`;
  const last = labels.pop();
  return `Designed for ${labels.join(", ")} and ${last}.`;
}

function buildUseCasesForAudiences(audiences: string[]) {
  const personas: Record<string, { title: string; description: string; icon: string }> = {
    "adult-corePlatforms": { title: "Adult Core Platforms", description: "Adults who grew up across cultures and need support navigating identity, belonging, and transitions.", icon: "User" },
    "expat-families": { title: "Expat Families", description: "Parents raising children between cultures who want proactive mental health support.", icon: "Users" },
    "cross-cultural-couples": { title: "Cross-Cultural Couples", description: "Partners navigating different cultural backgrounds who need help bridging the gap.", icon: "Heart" },
    "organizations": { title: "Organizations & Schools", description: "Companies and schools supporting internationally mobile employees and students.", icon: "Building2" },
    "counselors": { title: "Mental Health Professionals", description: "Clinicians seeking to join a network of Core Platform-informed practitioners.", icon: "UserCheck" },
    "general": { title: "The Global Community", description: "Anyone seeking culturally informed mental health support.", icon: "Globe" },
  };
  return audiences.map((a) => personas[a] ?? personas["general"]!);
}

export function generateLandingPageBlocks(
  goalId: string,
  headline: string,
  subheadline: string,
  audiences: string[],
  selectedBlockIds: string[],
  ctaText: string,
  ctaLink: string,
): BlockInstance[] {
  const blockOptions = getRecommendedBlocks(goalId);
  const blocks: BlockInstance[] = [];
  const audienceDesc = buildAudienceSubheading(audiences, "");

  for (const id of selectedBlockIds) {
    const opt = blockOptions.find((b) => b.id === id);
    if (!opt) continue;

    if (opt.type === "hero") {
      blocks.push(block("hero", {
        heading: headline || "Welcome to Core Platform",
        subheading: subheadline || audienceDesc || "Connecting Third Culture Kids with mental health professionals who understand your world.",
        ctaText: ctaText || "Get Started",
        ctaLink: ctaLink || "/directory",
        ctaSecondaryText: "",
        ctaSecondaryLink: "",
        minHeight: "560",
      }));
    } else if (opt.type === "cta") {
      blocks.push(block("cta", {
        heading: "Ready to Get Started?",
        subheading: subheadline || audienceDesc || "Take the first step toward culturally informed mental health support.",
        primaryText: ctaText || "Get Started",
        primaryLink: ctaLink || "/directory",
        variant: "dark",
      }));
    } else if (opt.type === "recovery-use-cases" && audiences.length > 0) {
      const useCasePersonas = buildUseCasesForAudiences(audiences);
      blocks.push(block("recovery-use-cases", {
        title: "Who Is This For?",
        subtitle: "",
        personas: useCasePersonas,
      }));
    } else {
      blocks.push(block(opt.type));
    }
  }

  return blocks;
}
