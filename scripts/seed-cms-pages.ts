import { db } from "../server/db";
import { cmsPages } from "../shared/schema/cms-pages";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

function uid() {
  return randomUUID();
}

const homeContent = {
  blocks: [
    {
      id: uid(),
      type: "hero",
      props: {
        heading: 'Care that understands where members "come from".',
        subheading: "",
        ctaText: "Find a Verified Provider!",
        ctaLink: "/directory",
        ctaSecondaryText: "Join the Network!",
        ctaSecondaryLink: "/auth/register",
        backgroundImageUrl: "/images/hero-therapy-session-1280w.webp",
        overlayOpacity: 85,
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        title: "Why Platform Approved?",
        subtitle: "We bridge the gap between members of globally mobile communities and culturally competent verified providers.",
        columns: "3",
        cards: [
          {
            icon: "Globe",
            title: "Culturally Informed Care",
            description: "Every verified provider in our directory understands the unique challenges of growing up across cultures.",
          },
          {
            icon: "Heart",
            title: "Specialized Support",
            description: "Find professionals trained in identity, belonging, grief of place, and cross-cultural transitions.",
          },
          {
            icon: "Users",
            title: "Global Community",
            description: "Join a community that celebrates the richness of a multicultural upbringing.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        title: "What Kind of Support Is Needed?",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Not every challenge requires a formal service plan. Sometimes what members need most is validation, community, or practical guidance for navigating transitions. Our directory includes a range of professionals — from licensed professionals to certified coaches and peer support specialists — so you can find the right kind of support for wherever you are in your journey.</p>",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "testimonials",
      props: {
        title: "What People Are Saying",
        items: [
          {
            quote:
              "For the first time, I didn't have to explain what it means to grow up between cultures. My verified provider just understood.",
            name: "Sarah M.",
            role: "Adult Community Member",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Core Platform connected me with a verified provider who speaks my language — literally and figuratively. It's been life-changing.",
            name: "James K.",
            role: "Expat Parent",
            location: "Dubai",
            avatarUrl:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "As a verified provider, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
            name: "Dr. Amara O.",
            role: "Verified Provider",
            location: "Nairobi",
            avatarUrl:
              "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.",
            name: "Lena T.",
            role: "College Student",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The specialization filters helped me find a verified provider experienced with military kid transitions. Highly recommend.",
            name: "Marcus W.",
            role: "Military Family Member",
            location: "Virginia, USA",
            avatarUrl:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time here.",
            name: "Priya D.",
            role: "Cross-Cultural Professional",
            location: "London",
            avatarUrl:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "therapist-map",
      props: {
        title: "Our Verified Providers Around the World",
        subtitle: "Click a pin to learn more about a platform-approved professional near you",
      },
    },
    {
      id: uid(),
      type: "events-preview",
      props: {
        title: "Upcoming Events",
        subtitle: "Join our community events for members and verified providers.",
        limit: 3,
      },
    },
    {
      id: uid(),
      type: "blog-preview",
      props: {
        title: "Featured Articles",
        subtitle: "Latest insights on platform operations, community support, and cross-cultural wellness.",
        limit: 6,
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Are You a Platform-Approved Verified Provider?",
        subheading:
          "Join our growing directory and connect with members who need your unique expertise. List your practice and reach the global member community.",
        primaryText: "Join the Directory",
        primaryLink: "/auth/register",
        variant: "accent",
      },
    },
  ],
};

const aboutContent = {
  blocks: [
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "OUR STORY",
        title: "History",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Core Platform was born from the lived experience of growing up between cultures. Our founders — adult members and community advocates — experienced firsthand how difficult it is to find a verified provider who truly understands what it means to call multiple countries \"home.\" In 2024, they set out to build a bridge between members of globally mobile communities and the culturally competent professionals who serve them.</p>",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "WHAT WE STAND FOR",
        title: "Vision & Mission",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Our vision is a world where every member of a globally mobile community has access to specialized support that honors their multicultural identity. Our mission is to build the most trusted directory of verified providers — vetted, accessible, and global — so that no one has to navigate the complexities of cross-cultural life alone.</p>",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "THE RESEARCH",
        title: "The Stats Speak for Themselves",
        subtitle:
          "According to internal platform research across member communities:",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        columns: "3",
        cards: [
          {
            icon: "AlertCircle",
            title: "60% of members",
            description: "experienced symptoms of anxiety related to their cross-cultural upbringing and transitions.",
          },
          {
            icon: "AlertCircle",
            title: "59% of members",
            description: "experienced symptoms of depression, often connected to unresolved grief of place and identity.",
          },
          {
            icon: "AlertCircle",
            title: "47% of members",
            description: "experienced symptoms of suicidal ideation at some point in their lives.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>However, significantly smaller numbers get diagnosed. While we can only speculate on why, due to our decades of observations and expertise in the field, we think a large reason is due to lack of accessibility to proper specialized services. <strong>Which is a major driver in why we do what we do!</strong></p>",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "WHY IT MATTERS",
        title: "Why Platform Approved?",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Traditional support models were developed within a single cultural framework. When members bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A verified provider understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.</p>",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "OUR VETTING",
        title: "What Our Vetting Process Means — and Doesn't Mean",
        subtitle:
          "We take our responsibility to both verified providers and members seriously. Here's what you can expect from our process.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: `<div>
<h3>What vetting means:</h3>
<ul>
<li>Every verified provider completes a detailed application process</li>
<li>Credentials and licensure are verified</li>
<li>Training or lived experience with globally mobile and cross-cultural populations is required</li>
<li>Profiles are reviewed by our team before being published</li>
</ul>
<h3>What vetting does not mean:</h3>
<ul>
<li>We are not a licensing or credentialing body</li>
<li>We do not provide clinical supervision</li>
<li>Listing does not constitute an endorsement of specific service outcomes</li>
<li>We do not guarantee a service match — but we make finding one easier</li>
</ul>
</div>`,
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "testimonials",
      props: {
        title: "What Are People Saying?",
        items: [
          {
            quote:
              "For the first time, I didn't have to explain what it means to grow up between cultures. My verified provider just understood.",
            name: "Sarah M.",
            role: "Adult Community Member",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Core Platform connected me with a verified provider who speaks my language — literally and figuratively. It's been life-changing.",
            name: "James K.",
            role: "Expat Parent",
            location: "Dubai",
            avatarUrl:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "As a verified provider, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
            name: "Dr. Amara O.",
            role: "Verified Provider",
            location: "Nairobi",
            avatarUrl:
              "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.",
            name: "Lena T.",
            role: "College Student",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The specialization filters helped me find a verified provider experienced with military kid transitions. Highly recommend.",
            name: "Marcus W.",
            role: "Military Family Member",
            location: "Virginia, USA",
            avatarUrl:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time here.",
            name: "Priya D.",
            role: "Cross-Cultural Professional",
            location: "London",
            avatarUrl:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "blog-preview",
      props: {
        title: "Featured On",
        subtitle: "",
        limit: 3,
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        title: "FAQs",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "faq",
      props: {
        items: [
          {
            question: "What is a member of a globally mobile community (Core Platform)?",
            answer:
              "A member of a globally mobile community (Core Platform) is a person who has spent a significant part of their developmental years outside their parents' culture. They build relationships with multiple cultures while not having full ownership of any, creating a blended cultural framework shaped by passport countries, host countries, and communities.",
          },
          {
            question: "Who can use Core Platform to find a verified provider?",
            answer:
              "Core Platform is for anyone who has had a cross-cultural upbringing or is navigating globally-mobile life: members of all ages, expat families, international students, military families, missionary kids, diplomats' children, and cross-cultural professionals.",
          },
          {
            question: "How are verified providers vetted before joining the directory?",
            answer:
              "Every verified provider completes an application process, provides verified credentials, and must demonstrate training or lived experience with globally mobile and cross-cultural populations. Our team reviews each profile before it goes live in the directory.",
          },
          {
            question: "Is Core Platform a support service?",
            answer:
              "No. Core Platform is a directory and community platform. We connect individuals with qualified verified providers — we do not provide support directly. All service relationships are between members and their chosen verified providers.",
          },
          {
            question: "Can I use the directory if I live outside the United States?",
            answer:
              "Yes. Our verified providers serve members globally, with many offering online/telehealth sessions. Use the location and online session filters in the directory to find verified providers who can work with you wherever you are.",
          },
          {
            question: "How can I support Core Platform?",
            answer:
              "You can support us by sharing the platform with members and expat communities, following us on social media, attending our events, or if you're a verified provider — joining our network.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Donate to Core Platform",
        subheading: "Your support helps us maintain this platform, expand our directory, and provide resources to the global member community. Every contribution — large or small — makes a difference in connecting members with the care they deserve.",
        primaryText: "Donate",
        primaryLink: "/donate",
        variant: "accent",
      },
    },
  ],
};

const contactContent = {
  blocks: [
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "GET IN TOUCH",
        title: "Contact Us",
        subtitle: "Have a question or feedback? We'd love to hear from you.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "contact-form",
      props: {},
    },
  ],
};

const joinContent = {
  blocks: [
    {
      id: uid(),
      type: "join-registration-form",
      props: {
        heading: "Are you a Platform-Approved Verified Provider?",
        accentHeading: "Join the Network!",
        subheading: "",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        title: "What Does Membership Include?",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        columns: "4",
        cards: [
          {
            icon: "ClipboardCheck",
            title: "Directory Listing",
            description: "Get a professional profile in our searchable directory, visible to members and cross-cultural families seeking specialized support worldwide.",
          },
          {
            icon: "Users",
            title: "Member Connections",
            description: "Receive referrals from individuals actively searching for verified providers who understand their experience.",
          },
          {
            icon: "BarChart3",
            title: "Profile Analytics",
            description: "Track how many people view your profile, where they're located, and which specializations attract the most interest.",
          },
          {
            icon: "Star",
            title: "Community Access",
            description: "Join a network of platform-approved professionals for peer consultation, shared resources, and community events.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        title: "The Application Process",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        columns: "3",
        cards: [
          {
            icon: "ClipboardCheck",
            title: "1. Submit Your Application",
            description: "Complete our online application with your credentials, areas of specialization, and experience working with Core Platform or cross-cultural populations.",
          },
          {
            icon: "CheckCircle",
            title: "2. Credential Verification",
            description: "Our team verifies your licensure, certifications, and professional standing to ensure quality and trust for our community.",
          },
          {
            icon: "Search",
            title: "3. Core Platform Competency Review",
            description: "We assess your training and lived experience with Core Platform, expat, and cross-cultural members to confirm a strong fit for our directory.",
          },
          {
            icon: "User",
            title: "4. Profile Setup",
            description: "Build your professional profile with your bio, specializations, languages, session formats, and availability for prospective members.",
          },
          {
            icon: "Star",
            title: "5. Go Live in the Directory",
            description: "Once approved, your profile goes live and you begin receiving visibility from members and families searching for support.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Interested in Training but Not a Member?",
        subheading:
          "We offer platform-approved training programs for verified providers who want to deepen their cross-cultural competency. Whether you're just beginning to explore the Core Platform space or want to sharpen your skills, our training equips you with the frameworks and lived-experience insights to better serve globally-mobile members.",
        primaryText: "Learn More",
        primaryLink: "/training",
        variant: "light",
      },
    },
  ],
};

const insightsContent = {
  blocks: [
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "Core Platform Blog",
        title: "Insights & Articles",
        subtitle: "Explore articles, research, and insights for globally mobile communities.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "blog-featured-post",
      props: {
        title: "Featured Article",
        layout: "split",
      },
    },
    {
      id: uid(),
      type: "blog-post-feed",
      props: {
        title: "All Articles",
        postsPerPage: 9,
        gridColumns: "3",
        feedStyle: "pagination",
        showSearch: true,
        showCategoryFilter: true,
        showTagFilter: true,
      },
    },
  ],
};

const eventsContent = {
  blocks: [
    {
      id: uid(),
      type: "events-archive",
      props: {
        heading: "Upcoming Events",
        subheading:
          "We offer quarterly platform-approved trainings for professional providers. All of our members get free registration to the events below.",
        defaultView: "list",
        showViewToggle: true,
      },
    },
  ],
};

const recordingsContent = {
  blocks: [
    {
      id: uid(),
      type: "video-archives",
      props: {
        heading: "Video Archives",
        subheading: "Browse our collection of past trainings and webinars.",
        showSearch: true,
        showYearFilter: true,
        showAccessFilter: true,
      },
    },
  ],
};

const portfolioContent = {
  blocks: [
    {
      id: uid(),
      type: "portfolio-grid",
      props: {
        eyebrow: "Featured Case Study",
        heading: "Featured Portfolio Project",
        subheading:
          "A closer look at selected work, project context, and measurable outcomes.",
        layout: "list",
        featuredOnly: true,
        excludeFeatured: false,
        showSearch: false,
        showIndustryFilter: false,
        showCategoryFilter: false,
        showLocationFilter: false,
        limit: 1,
      },
    },
    {
      id: uid(),
      type: "portfolio-grid",
      props: {
        eyebrow: "Portfolio",
        heading: "Explore More Work",
        subheading:
          "Browse additional seeded case studies across real estate, web development, creative portfolios, and service launches.",
        layout: "grid",
        featuredOnly: false,
        excludeFeatured: true,
        showSearch: true,
        showIndustryFilter: true,
        showCategoryFilter: true,
        showLocationFilter: true,
        limit: 0,
      },
    },
  ],
};

const directoryContent = {
  blocks: [
    {
      id: uid(),
      type: "directory-browser",
      props: {
        heading: "Find a Verified Provider",
        subheading:
          "Search for platform-approved care by specialty, location, language, or session format, then explore results on the map.",
        showCategoryChips: true,
        showMap: true,
      },
    },
    {
      id: uid(),
      type: "text-image",
      props: {
        heading: "Why Platform Approved?",
        body:
          "Traditional support models were developed within a single cultural framework. When members bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A verified provider understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.",
        imageUrl:
          "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=1200&fit=crop&crop=faces",
        imageAlt: "platform-approved support",
        imagePosition: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        title: 'What does it mean to be "vetted"?',
        subtitle: "And just as importantly, what it does not mean.",
        content:
          "<h3>What does it mean to be &ldquo;vetted&rdquo;?</h3><ul><li>Every verified provider completes a detailed application process</li><li>Credentials and licensure are verified</li><li>Training or lived experience with globally mobile and cross-cultural populations is required</li><li>Profiles are reviewed by our team before being published</li></ul><h3>What does it NOT mean to be &ldquo;vetted&rdquo;?</h3><ul><li>We are not a licensing or credentialing body</li><li>We do not provide clinical supervision</li><li>Listing does not constitute an endorsement of specific service outcomes</li><li>We do not guarantee a service match, but we make finding one easier</li></ul>",
        alignment: "left",
        sectionBackgroundColor: "#f6f7f5",
        sectionShowRadialGradient: true,
        sectionRadialGradientPosition: "bottom",
      },
    },
  ],
};

const pages = [
  {
    slug: "home",
    title: "Home",
    pageType: "home" as const,
    status: "published" as const,
    content: homeContent,
    seoTitle: "Core Platform — Specialized Support for Globally Mobile Communities",
    seoDescription:
      "Find a verified provider who understands your cross-cultural experience. Core Platform connects members of globally mobile communities, expats, and globally-mobile families with specialized verified providers.",
  },
  {
    slug: "about",
    title: "About",
    pageType: "about" as const,
    status: "published" as const,
    content: aboutContent,
    seoTitle: "About Core Platform",
    seoDescription:
      "Learn about Core Platform, our mission to support members of globally mobile communities, and how we vet verified providers for cross-cultural competency.",
  },
  {
    slug: "contact",
    title: "Contact",
    pageType: "contact" as const,
    status: "published" as const,
    content: contactContent,
    seoTitle: "Contact Core Platform",
    seoDescription:
      "Get in touch with the Core Platform team. We're here to help you find the right verified provider or answer questions about our platform.",
  },
  {
    slug: "join",
    title: "Join as a Verified Provider",
    pageType: "custom" as const,
    status: "published" as const,
    content: joinContent,
    seoTitle: "Join the Core Platform Verified Provider Network",
    seoDescription:
      "Apply to join the Core Platform verified provider network. Reach members and cross-cultural families who need your specialized expertise.",
  },
  {
    slug: "insights",
    title: "Insights & Articles",
    pageType: "custom" as const,
    template: "with-sidebar" as const,
    status: "published" as const,
    content: insightsContent,
    seoTitle: "Insights & Articles | Core Platform",
    seoDescription:
      "Explore articles, research, and insights for globally mobile communities.",
  },
  {
    slug: "events",
    title: "Events",
    pageType: "custom" as const,
    status: "published" as const,
    content: eventsContent,
    seoTitle: "Upcoming Events | Core Platform",
    seoDescription:
      "Explore upcoming Core Platform trainings, workshops, and community events.",
  },
  {
    slug: "recordings",
    title: "Video Archives",
    pageType: "custom" as const,
    status: "published" as const,
    content: recordingsContent,
    seoTitle: "Video Archives | Core Platform",
    seoDescription:
      "Watch past Core Platform trainings and webinars from the video archives.",
  },
  {
    slug: "portfolio",
    title: "Portfolio",
    pageType: "custom" as const,
    status: "published" as const,
    content: portfolioContent,
    seoTitle: "Portfolio | Core Platform",
    seoDescription:
      "Explore selected portfolio projects, case studies, and project outcomes.",
  },
  {
    slug: "directory",
    title: "Find a Verified Provider",
    pageType: "custom" as const,
    status: "published" as const,
    content: directoryContent,
    seoTitle: "Find a Verified Provider | Core Platform",
    seoDescription:
      "Browse verified providers by location, specialty, language, and more.",
  },
];

async function seed() {
  console.log("Seeding CMS pages...");
  for (const page of pages) {
    const existing = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.slug, page.slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(cmsPages)
        .set({
          content: page.content as any,
          status: page.status,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          publishedAt: page.status === "published" ? new Date() : existing[0].publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.slug, page.slug));
      console.log(`  [updated] ${page.slug} — id: ${existing[0].id}, status: ${page.status}`);
    } else {
      const [inserted] = await db
        .insert(cmsPages)
        .values({
          title: page.title,
          slug: page.slug,
          pageType: page.pageType,
          status: page.status,
          content: page.content as any,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoKeywords: "",
          ogImageUrl: "",
          publishedAt: page.status === "published" ? new Date() : null,
        })
        .returning();
      console.log(`  [created] ${page.slug} — id: ${inserted.id}, status: ${inserted.status}`);
    }
  }
  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
