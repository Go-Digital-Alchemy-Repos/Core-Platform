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
        heading: 'Care that understands where Core Platforms "come from".',
        subheading: "",
        ctaText: "Find a Mental Health Professional!",
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
        title: "Why Core Platform Informed?",
        subtitle: "We bridge the gap between Third Culture Kids and culturally competent mental health professionals.",
        columns: "3",
        cards: [
          {
            icon: "Globe",
            title: "Culturally Informed Care",
            description: "Every mental health professional in our directory understands the unique challenges of growing up across cultures.",
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
        title: "Is Counseling What's Needed?",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Not every challenge requires a clinical diagnosis or therapy. Sometimes what Core Platforms need most is validation, community, or practical guidance for navigating transitions. Our directory includes a range of professionals — from licensed therapists to certified coaches and peer support specialists — so you can find the right kind of support for wherever you are in your journey.</p>",
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
              "For the first time, I didn't have to explain what it means to grow up between cultures. My mental health professional just understood.",
            name: "Sarah M.",
            role: "Adult Core Platform",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Core Platform connected me with a mental health professional who speaks my language — literally and figuratively. It's been life-changing.",
            name: "James K.",
            role: "Expat Parent",
            location: "Dubai",
            avatarUrl:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "As a mental health professional, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
            name: "Dr. Amara O.",
            role: "Licensed Mental Health Professional",
            location: "Nairobi",
            avatarUrl:
              "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.",
            name: "Lena T.",
            role: "Core Platform & College Student",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.",
            name: "Marcus W.",
            role: "Military Core Platform",
            location: "Virginia, USA",
            avatarUrl:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time in therapy.",
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
        title: "Our Mental Health Professionals Around the World",
        subtitle: "Click a pin to learn more about a Core Platform-informed professional near you",
      },
    },
    {
      id: uid(),
      type: "events-preview",
      props: {
        title: "Upcoming Events",
        subtitle: "Join our community events for Core Platforms and mental health professionals.",
        limit: 3,
      },
    },
    {
      id: uid(),
      type: "blog-preview",
      props: {
        title: "Featured Articles",
        subtitle: "Latest insights on Core Platform mental health and cross-cultural wellness.",
        limit: 6,
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Are You a Core Platform-Informed Mental Health Professional?",
        subheading:
          "Join our growing directory and connect with clients who need your unique expertise. List your practice and reach the global Core Platform community.",
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
        content: "<p>Core Platform was born from the lived experience of growing up between cultures. Our founders — Adult Core Platforms and mental health advocates — experienced firsthand how difficult it is to find a mental health professional who truly understands what it means to call multiple countries \"home.\" In 2024, they set out to build a bridge between Third Culture Kids and the culturally competent professionals who serve them.</p>",
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
        content: "<p>Our vision is a world where every Third Culture Kid has access to mental health support that honors their multicultural identity. Our mission is to build the most trusted directory of Core Platform-informed mental health professionals — vetted, accessible, and global — so that no one has to navigate the complexities of cross-cultural life alone.</p>",
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
          "According to Core Platform Training's 2024 research, survey of 1600+ adult Core Platforms:",
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
            title: "60% of Core Platforms",
            description: "experienced symptoms of anxiety related to their cross-cultural upbringing and transitions.",
          },
          {
            icon: "AlertCircle",
            title: "59% of Core Platforms",
            description: "experienced symptoms of depression, often connected to unresolved grief of place and identity.",
          },
          {
            icon: "AlertCircle",
            title: "47% of Core Platforms",
            description: "experienced symptoms of suicidal ideation at some point in their lives.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>However, significantly smaller numbers get diagnosed. While we can only speculate on why, due to our decades of observations and expertise in the field, we think a large reason is due to lack of accessibility to proper mental health services. <strong>Which is a major driver in why we do what we do!</strong></p>",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "WHY IT MATTERS",
        title: "Why Core Platform Informed?",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Traditional therapy models were developed within a single cultural framework. When Core Platforms bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A Core Platform-informed mental health professional understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.</p>",
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
          "We take our responsibility to both mental health professionals and clients seriously. Here's what you can expect from our process.",
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
<li>Every mental health professional completes a detailed application process</li>
<li>Credentials and licensure are verified</li>
<li>Training or lived experience with Core Platform/cross-cultural populations is required</li>
<li>Profiles are reviewed by our team before being published</li>
</ul>
<h3>What vetting does not mean:</h3>
<ul>
<li>We are not a licensing or credentialing body</li>
<li>We do not provide clinical supervision</li>
<li>Listing does not constitute an endorsement of specific therapeutic outcomes</li>
<li>We do not guarantee a therapeutic match — but we make finding one easier</li>
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
              "For the first time, I didn't have to explain what it means to grow up between cultures. My mental health professional just understood.",
            name: "Sarah M.",
            role: "Adult Core Platform",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Core Platform connected me with a mental health professional who speaks my language — literally and figuratively. It's been life-changing.",
            name: "James K.",
            role: "Expat Parent",
            location: "Dubai",
            avatarUrl:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "As a mental health professional, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.",
            name: "Dr. Amara O.",
            role: "Licensed Mental Health Professional",
            location: "Nairobi",
            avatarUrl:
              "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.",
            name: "Lena T.",
            role: "Core Platform & College Student",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.",
            name: "Marcus W.",
            role: "Military Core Platform",
            location: "Virginia, USA",
            avatarUrl:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time in therapy.",
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
            question: "What is a Third Culture Kid (Core Platform)?",
            answer:
              "A Third Culture Kid (Core Platform) is a person who has spent a significant part of their developmental years outside their parents' culture. They build relationships with multiple cultures while not having full ownership of any, creating what is often called a 'third culture' — a blend of their passport country and host countries.",
          },
          {
            question: "Who can use Core Platform to find a mental health professional?",
            answer:
              "Core Platform is for anyone who has had a cross-cultural upbringing or is navigating globally-mobile life: Core Platforms of all ages, expat families, international students, military families, missionary kids, diplomats' children, and cross-cultural professionals.",
          },
          {
            question: "How are mental health professionals vetted before joining the directory?",
            answer:
              "Every mental health professional completes an application process, provides verified credentials, and must demonstrate training or lived experience with Core Platform and cross-cultural populations. Our team reviews each profile before it goes live in the directory.",
          },
          {
            question: "Is Core Platform a therapy service?",
            answer:
              "No. Core Platform is a directory and community platform. We connect individuals with qualified mental health professionals — we do not provide therapy directly. All therapeutic relationships are between clients and their chosen mental health professionals.",
          },
          {
            question: "Can I use the directory if I live outside the United States?",
            answer:
              "Yes. Our mental health professionals serve clients globally, with many offering online/telehealth sessions. Use the location and online session filters in the directory to find mental health professionals who can work with you wherever you are.",
          },
          {
            question: "How can I support Core Platform?",
            answer:
              "You can support us by sharing the platform with Core Platforms and expat communities, following us on social media, attending our events, or if you're a mental health professional — joining our network.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Donate to Core Platform",
        subheading: "Your support helps us maintain this platform, expand our directory, and provide resources to the global Core Platform community. Every contribution — large or small — makes a difference in connecting Core Platforms with the care they deserve.",
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
        heading: "Are you a Core Platform-Informed Mental Health Professional?",
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
            description: "Get a professional profile in our searchable directory, visible to Core Platforms and cross-cultural families seeking specialized support worldwide.",
          },
          {
            icon: "Users",
            title: "Client Connections",
            description: "Receive referrals from individuals actively searching for Core Platform-informed mental health professionals who understand their experience.",
          },
          {
            icon: "BarChart3",
            title: "Profile Analytics",
            description: "Track how many people view your profile, where they're located, and which specializations attract the most interest.",
          },
          {
            icon: "Star",
            title: "Community Access",
            description: "Join a network of Core Platform-informed professionals for peer consultation, shared resources, and community events.",
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
            description: "We assess your training and lived experience with Core Platform, expat, and cross-cultural clients to confirm a strong fit for our directory.",
          },
          {
            icon: "User",
            title: "4. Profile Setup",
            description: "Build your professional profile with your bio, specializations, languages, session formats, and availability for prospective clients.",
          },
          {
            icon: "Star",
            title: "5. Go Live in the Directory",
            description: "Once approved, your profile goes live and you begin receiving visibility from Core Platforms and families searching for support.",
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
          "We offer Core Platform-informed training programs for mental health professionals who want to deepen their cross-cultural competency. Whether you're just beginning to explore the Core Platform space or want to sharpen your skills, our training equips you with the frameworks and lived-experience insights to better serve globally-mobile clients.",
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
        subtitle: "Explore articles, research, and insights on Third Culture Kid mental health and cross-cultural counseling.",
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
          "We offer quarterly Core Platform-informed trainings for professional providers. All of our members get free registration to the events below.",
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

const directoryContent = {
  blocks: [
    {
      id: uid(),
      type: "directory-browser",
      props: {
        heading: "Find a Mental Health Professional",
        subheading:
          "Search for Core Platform-informed care by specialty, location, language, or session format, then explore results on the map.",
        showCategoryChips: true,
        showMap: true,
      },
    },
    {
      id: uid(),
      type: "text-image",
      props: {
        heading: "Why Core Platform Informed?",
        body:
          "Traditional therapy models were developed within a single cultural framework. When Core Platforms bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A Core Platform-informed mental health professional understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.",
        imageUrl:
          "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=1200&fit=crop&crop=faces",
        imageAlt: "Core Platform-informed counseling",
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
          "<h3>What does it mean to be &ldquo;vetted&rdquo;?</h3><ul><li>Every mental health professional completes a detailed application process</li><li>Credentials and licensure are verified</li><li>Training or lived experience with Core Platform/cross-cultural populations is required</li><li>Profiles are reviewed by our team before being published</li></ul><h3>What does it NOT mean to be &ldquo;vetted&rdquo;?</h3><ul><li>We are not a licensing or credentialing body</li><li>We do not provide clinical supervision</li><li>Listing does not constitute an endorsement of specific therapeutic outcomes</li><li>We do not guarantee a therapeutic match, but we make finding one easier</li></ul>",
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
    seoTitle: "Core Platform — Mental Health Support for Third Culture Kids",
    seoDescription:
      "Find a mental health professional who understands your cross-cultural experience. Core Platform connects Third Culture Kids, expats, and globally-mobile families with specialized mental health professionals.",
  },
  {
    slug: "about",
    title: "About",
    pageType: "about" as const,
    status: "published" as const,
    content: aboutContent,
    seoTitle: "About Core Platform",
    seoDescription:
      "Learn about Core Platform, our mission to support Third Culture Kids, and how we vet mental health professionals for cross-cultural competency.",
  },
  {
    slug: "contact",
    title: "Contact",
    pageType: "contact" as const,
    status: "published" as const,
    content: contactContent,
    seoTitle: "Contact Core Platform",
    seoDescription:
      "Get in touch with the Core Platform team. We're here to help you find the right mental health professional or answer questions about our platform.",
  },
  {
    slug: "join",
    title: "Join as a Mental Health Professional",
    pageType: "custom" as const,
    status: "published" as const,
    content: joinContent,
    seoTitle: "Join the Core Platform Mental Health Professional Network",
    seoDescription:
      "Apply to join the Core Platform mental health professional network. Reach Core Platforms and cross-cultural families who need your specialized expertise.",
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
      "Explore articles, research, and insights on Third Culture Kid mental health and cross-cultural counseling.",
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
    slug: "directory",
    title: "Find a Mental Health Professional",
    pageType: "custom" as const,
    status: "published" as const,
    content: directoryContent,
    seoTitle: "Find a Mental Health Professional | Core Platform",
    seoDescription:
      "Browse Core Platform-informed mental health professionals by location, specialty, language, and more.",
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
