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
        heading: 'Care that understands where TCKs "come from".',
        subheading: "",
        ctaText: "Find a Mental Health Professional!",
        ctaLink: "/directory",
        ctaSecondaryText: "Join the Network!",
        ctaSecondaryLink: "/auth/register",
        backgroundImageUrl: "/images/hero-therapy-session.png",
        overlayOpacity: 85,
      },
    },
    {
      id: uid(),
      type: "cards-grid",
      props: {
        title: "Why TCK Informed?",
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
        content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>",
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
            role: "Adult TCK",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "TCK Wellness connected me with a mental health professional who speaks my language — literally and figuratively. It's been life-changing.",
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
              "I struggled for years to find someone who understood repatriation grief. TCK Wellness made it possible in minutes.",
            name: "Lena T.",
            role: "TCK & College Student",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.",
            name: "Marcus W.",
            role: "Military TCK",
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
        subtitle: "Click a pin to learn more about a TCK-informed professional near you",
      },
    },
    {
      id: uid(),
      type: "events-preview",
      props: {
        title: "Upcoming Events",
        subtitle: "Join our community events for TCKs and mental health professionals.",
        limit: 3,
      },
    },
    {
      id: uid(),
      type: "blog-preview",
      props: {
        title: "Featured Articles",
        subtitle: "Latest insights on TCK mental health and cross-cultural wellness.",
        limit: 6,
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Are You a TCK-Informed Mental Health Professional?",
        subheading:
          "Join our growing directory and connect with clients who need your unique expertise. List your practice and reach the global TCK community.",
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
        content: "<p>TCK Wellness was born from the lived experience of growing up between cultures. Our founders — Adult TCKs and mental health advocates — experienced firsthand how difficult it is to find a mental health professional who truly understands what it means to call multiple countries \"home.\" In 2024, they set out to build a bridge between Third Culture Kids and the culturally competent professionals who serve them.</p>",
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
        content: "<p>Our vision is a world where every Third Culture Kid has access to mental health support that honors their multicultural identity. Our mission is to build the most trusted directory of TCK-informed mental health professionals — vetted, accessible, and global — so that no one has to navigate the complexities of cross-cultural life alone.</p>",
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
          "According to TCK Training's 2024 research, survey of 1600+ adult TCKs:",
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
            title: "60% of TCKs",
            description: "experienced symptoms of anxiety related to their cross-cultural upbringing and transitions.",
          },
          {
            icon: "AlertCircle",
            title: "59% of TCKs",
            description: "experienced symptoms of depression, often connected to unresolved grief of place and identity.",
          },
          {
            icon: "AlertCircle",
            title: "47% of TCKs",
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
        title: "Why TCK Informed?",
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: "<p>Traditional therapy models were developed within a single cultural framework. When TCKs bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A TCK-informed mental health professional understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.</p>",
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
<li>Training or lived experience with TCK/cross-cultural populations is required</li>
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
        title: "Stories from Our Community",
        items: [
          {
            quote:
              "For the first time, I didn't have to explain what it means to grow up between cultures. My mental health professional just understood.",
            name: "Sarah M.",
            role: "Adult TCK",
            location: "Singapore",
            avatarUrl:
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "TCK Wellness connected me with a mental health professional who speaks my language — literally and figuratively. It's been life-changing.",
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
              "I struggled for years to find someone who understood repatriation grief. TCK Wellness made it possible in minutes.",
            name: "Lena T.",
            role: "TCK & College Student",
            location: "Germany",
            avatarUrl:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
          },
          {
            quote:
              "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.",
            name: "Marcus W.",
            role: "Military TCK",
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
        eyebrow: "FAQ",
        title: "Frequently Asked Questions",
        subtitle: "Common questions about TCK Wellness, our directory, and our approach to counseling.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "faq",
      props: {
        items: [
          {
            question: "What is a Third Culture Kid (TCK)?",
            answer:
              "A Third Culture Kid (TCK) is a person who has spent a significant part of their developmental years outside their parents' culture. They build relationships with multiple cultures while not having full ownership of any, creating what is often called a 'third culture' — a blend of their passport country and host countries.",
          },
          {
            question: "Who can use TCK Wellness to find a mental health professional?",
            answer:
              "TCK Wellness is for anyone who has had a cross-cultural upbringing or is navigating globally-mobile life: TCKs of all ages, expat families, international students, military families, missionary kids, diplomats' children, and cross-cultural professionals.",
          },
          {
            question: "How are mental health professionals vetted before joining the directory?",
            answer:
              "Every mental health professional completes an application process, provides verified credentials, and must demonstrate training or lived experience with TCK and cross-cultural populations. Our team reviews each profile before it goes live in the directory.",
          },
          {
            question: "Is TCK Wellness a therapy service?",
            answer:
              "No. TCK Wellness is a directory and community platform. We connect individuals with qualified mental health professionals — we do not provide therapy directly. All therapeutic relationships are between clients and their chosen mental health professionals.",
          },
          {
            question: "Can I use the directory if I live outside the United States?",
            answer:
              "Yes. Our mental health professionals serve clients globally, with many offering online/telehealth sessions. Use the location and online session filters in the directory to find mental health professionals who can work with you wherever you are.",
          },
          {
            question: "How can I support TCK Wellness?",
            answer:
              "You can support us by sharing the platform with TCKs and expat communities, following us on social media, attending our events, or if you're a mental health professional — joining our network.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Donate to TCK Wellness",
        subheading: "Your support helps us maintain this platform, expand our directory, and provide resources to the global TCK community. Every contribution — large or small — makes a difference in connecting TCKs with the care they deserve.",
        primaryText: "Donate",
        primaryLink: "/donate",
        variant: "accent",
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Find a Mental Health Professional Who Gets It",
        subheading: "Browse our directory of vetted mental health professionals with lived cross-cultural experience.",
        primaryText: "Browse the Directory",
        primaryLink: "/directory",
        secondaryText: "Join Our Network",
        secondaryLink: "/join",
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
      props: {},
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "BENEFITS",
        title: "What Does Membership Include?",
        subtitle:
          "Reach the clients who need your unique cross-cultural expertise — and build a practice that reflects your values.",
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
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          },
          {
            icon: "Users",
            title: "Client Connections",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          },
          {
            icon: "BarChart3",
            title: "Profile Analytics",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          },
          {
            icon: "Star",
            title: "Community Access",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "THE PROCESS",
        title: "How Joining Works",
        subtitle: "Our vetting process ensures quality and trust for clients and mental health professionals alike.",
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
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
          },
          {
            icon: "CheckCircle",
            title: "2. Credential Verification",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
          },
          {
            icon: "Search",
            title: "3. TCK Competency Review",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
          },
          {
            icon: "User",
            title: "4. Profile Setup",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
          },
          {
            icon: "Star",
            title: "5. Go Live in the Directory",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
          },
        ],
      },
    },
    {
      id: uid(),
      type: "section-header",
      props: {
        eyebrow: "PRICING",
        title: "Membership Plans",
        subtitle:
          "Choose the plan that fits your practice. Cancel or upgrade at any time.",
        alignment: "center",
      },
    },
    {
      id: uid(),
      type: "rich-text",
      props: {
        content: `<div class="grid-cols-3 grid gap-4">
  <div class="border rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-1">Basic</h3>
    <p class="text-3xl font-bold mb-3">$29<span class="text-base font-normal text-muted-foreground">/mo</span></p>
    <ul class="space-y-1 text-sm text-muted-foreground">
      <li>✓ Directory listing</li>
      <li>✓ Basic profile</li>
      <li>✓ Client connections</li>
    </ul>
  </div>
  <div class="border-2 border-primary rounded-lg p-6 bg-primary/5">
    <h3 class="text-lg font-semibold mb-1">Professional</h3>
    <p class="text-3xl font-bold mb-3">$49<span class="text-base font-normal text-muted-foreground">/mo</span></p>
    <ul class="space-y-1 text-sm text-muted-foreground">
      <li>✓ Everything in Basic</li>
      <li>✓ Featured placement</li>
      <li>✓ Profile analytics</li>
      <li>✓ Community events</li>
    </ul>
  </div>
  <div class="border rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-1">Premium</h3>
    <p class="text-3xl font-bold mb-3">$79<span class="text-base font-normal text-muted-foreground">/mo</span></p>
    <ul class="space-y-1 text-sm text-muted-foreground">
      <li>✓ Everything in Professional</li>
      <li>✓ Priority placement</li>
      <li>✓ Recording access</li>
      <li>✓ Dedicated support</li>
    </ul>
  </div>
</div>`,
        alignment: "left",
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Ready to Join?",
        subheading:
          "Create your account and start reaching TCKs and cross-cultural families who need your expertise.",
        primaryText: "Apply Now",
        primaryLink: "/join#apply",
        secondaryText: "Learn More",
        secondaryLink: "/about",
        variant: "accent",
      },
    },
    {
      id: uid(),
      type: "cta",
      props: {
        heading: "Interested in Training but Not a Member?",
        subheading:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        primaryText: "Learn More",
        primaryLink: "/training",
        variant: "light",
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
    seoTitle: "TCK Wellness — Mental Health Support for Third Culture Kids",
    seoDescription:
      "Find a mental health professional who understands your cross-cultural experience. TCK Wellness connects Third Culture Kids, expats, and globally-mobile families with specialized mental health professionals.",
  },
  {
    slug: "about",
    title: "About",
    pageType: "about" as const,
    status: "published" as const,
    content: aboutContent,
    seoTitle: "About TCK Wellness",
    seoDescription:
      "Learn about TCK Wellness, our mission to support Third Culture Kids, and how we vet mental health professionals for cross-cultural competency.",
  },
  {
    slug: "contact",
    title: "Contact",
    pageType: "contact" as const,
    status: "published" as const,
    content: contactContent,
    seoTitle: "Contact TCK Wellness",
    seoDescription:
      "Get in touch with the TCK Wellness team. We're here to help you find the right mental health professional or answer questions about our platform.",
  },
  {
    slug: "join",
    title: "Join as a Mental Health Professional",
    pageType: "custom" as const,
    status: "published" as const,
    content: joinContent,
    seoTitle: "Join the TCK Wellness Mental Health Professional Network",
    seoDescription:
      "Apply to join the TCK Wellness mental health professional network. Reach TCKs and cross-cultural families who need your specialized expertise.",
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
