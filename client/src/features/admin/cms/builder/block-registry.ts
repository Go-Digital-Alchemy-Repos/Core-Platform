export type PropType =
  | "text"
  | "textarea"
  | "richtext"
  | "image-url"
  | "url"
  | "select"
  | "boolean"
  | "number"
  | "array-items";

export interface PropDef {
  key: string;
  label: string;
  type: PropType;
  placeholder?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  itemSchema?: Omit<PropDef, "itemSchema">[];
}

export interface BlockDef {
  type: string;
  label: string;
  iconName: string;
  description: string;
  defaultProps: Record<string, unknown>;
  propDefs: PropDef[];
  isDynamic?: boolean;
}

export interface BlockInstance {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface BuilderContent {
  blocks: BlockInstance[];
}

const ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const IMAGE_POSITION_OPTIONS = [
  { label: "Image Right", value: "right" },
  { label: "Image Left", value: "left" },
];

const CTA_VARIANT_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Accent", value: "accent" },
];

const COLUMNS_OPTIONS = [
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
  { label: "4 columns", value: "4" },
];

const SPACING_OPTIONS = [
  { label: "Small (32px)", value: "sm" },
  { label: "Medium (64px)", value: "md" },
  { label: "Large (96px)", value: "lg" },
  { label: "Extra Large (128px)", value: "xl" },
];

const BUTTON_VARIANT_OPTIONS = [
  { label: "Primary", value: "default" },
  { label: "Outline", value: "outline" },
  { label: "Ghost", value: "ghost" },
  { label: "Secondary", value: "secondary" },
];

const VIDEO_ASPECT_OPTIONS = [
  { label: "16:9 (Widescreen)", value: "16/9" },
  { label: "4:3 (Classic)", value: "4/3" },
  { label: "1:1 (Square)", value: "1/1" },
];

const IMAGE_WIDTH_OPTIONS = [
  { label: "Full width", value: "full" },
  { label: "Contained (max-w-4xl)", value: "contained" },
  { label: "Narrow (max-w-2xl)", value: "narrow" },
];

const DIVIDER_STYLE_OPTIONS = [
  { label: "Horizontal line", value: "line" },
  { label: "Spacer (invisible)", value: "spacer" },
  { label: "Dots", value: "dots" },
];

export const BLOCK_REGISTRY: BlockDef[] = [
  {
    type: "hero",
    label: "Hero",
    iconName: "Sparkles",
    description: "Full-width hero with heading, subheading, and CTA buttons",
    defaultProps: {
      heading: "Welcome to TCK Wellness",
      subheading: "Connecting Third Culture Kids with mental health professionals who understand your world.",
      ctaText: "Find a Mental Health Professional",
      ctaLink: "/directory",
      ctaSecondaryText: "Learn More",
      ctaSecondaryLink: "/about",
      backgroundImageUrl: "",
      overlayOpacity: 50,
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Main heading" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Supporting text beneath the heading" },
      { key: "ctaText", label: "Primary Button Text", type: "text", placeholder: "e.g. Find a Mental Health Professional" },
      { key: "ctaLink", label: "Primary Button Link", type: "url", placeholder: "/directory" },
      { key: "ctaSecondaryText", label: "Secondary Button Text", type: "text", placeholder: "e.g. Learn More" },
      { key: "ctaSecondaryLink", label: "Secondary Button Link", type: "url", placeholder: "/about" },
      { key: "backgroundImageUrl", label: "Background Image", type: "image-url", placeholder: "Upload or select image" },
      { key: "overlayOpacity", label: "Overlay Opacity (%)", type: "number", min: 0, max: 100 },
    ],
  },
  {
    type: "section-header",
    label: "Section Header",
    iconName: "Heading",
    description: "Title, optional eyebrow label, and subtitle",
    defaultProps: {
      eyebrow: "Our Approach",
      title: "Why TCK-Informed Care Matters",
      subtitle: "We match you with mental health professionals who understand the TCK experience.",
      alignment: "center",
    },
    propDefs: [
      { key: "eyebrow", label: "Eyebrow Label", type: "text", placeholder: "Small label above title" },
      { key: "title", label: "Title", type: "text", placeholder: "Section title" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Supporting description" },
      { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTIONS },
    ],
  },
  {
    type: "rich-text",
    label: "Rich Text",
    iconName: "FileText",
    description: "Free-form text content with alignment control",
    defaultProps: {
      content: "<p>Enter your content here.</p>",
      alignment: "left",
    },
    propDefs: [
      { key: "content", label: "Content (HTML)", type: "richtext", placeholder: "Enter content..." },
      { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTIONS },
    ],
  },
  {
    type: "text-image",
    label: "Text + Image",
    iconName: "LayoutTemplate",
    description: "Side-by-side text and image with configurable position",
    defaultProps: {
      heading: "About Our Mission",
      body: "We provide access to culturally informed mental health professionals who understand what it means to grow up between worlds.",
      imageUrl: "",
      imageAlt: "About TCK Wellness",
      imageCaption: "",
      imagePosition: "right",
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Section heading" },
      { key: "body", label: "Body Text", type: "textarea", placeholder: "Main text content" },
      { key: "imageUrl", label: "Image", type: "image-url", placeholder: "Upload or select image" },
      { key: "imageAlt", label: "Image Alt Text", type: "text", placeholder: "Descriptive alt text" },
      { key: "imageCaption", label: "Image Caption", type: "text", placeholder: "Optional caption" },
      { key: "imagePosition", label: "Image Position", type: "select", options: IMAGE_POSITION_OPTIONS },
    ],
  },
  {
    type: "cta",
    label: "Call to Action",
    iconName: "Megaphone",
    description: "Bold call-to-action section with one or two buttons",
    defaultProps: {
      heading: "Ready to Get Started?",
      subheading: "Find a TCK-informed mental health professional and begin your journey today.",
      primaryText: "Browse Mental Health Professionals",
      primaryLink: "/directory",
      secondaryText: "Join the Network",
      secondaryLink: "/join",
      variant: "dark",
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "CTA heading" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Supporting text" },
      { key: "primaryText", label: "Primary Button", type: "text", placeholder: "Button label" },
      { key: "primaryLink", label: "Primary Button Link", type: "url", placeholder: "/directory" },
      { key: "secondaryText", label: "Secondary Button", type: "text", placeholder: "Optional secondary button" },
      { key: "secondaryLink", label: "Secondary Button Link", type: "url", placeholder: "/about" },
      { key: "variant", label: "Style Variant", type: "select", options: CTA_VARIANT_OPTIONS },
    ],
  },
  {
    type: "cards-grid",
    label: "Cards Grid",
    iconName: "LayoutGrid",
    description: "A configurable grid of icon + text cards",
    defaultProps: {
      title: "Why Choose TCK Wellness",
      subtitle: "",
      columns: "3",
      cards: [
        { title: "Culturally Informed", description: "Mental health professionals who understand the TCK experience.", icon: "Globe" },
        { title: "Specialized Support", description: "Targeted help for unique TCK challenges.", icon: "Heart" },
        { title: "Global Community", description: "Connect with others who share your journey.", icon: "Users" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Grid section title" },
      { key: "subtitle", label: "Section Subtitle", type: "text", placeholder: "Optional subtitle" },
      { key: "columns", label: "Columns", type: "select", options: COLUMNS_OPTIONS },
      {
        key: "cards",
        label: "Cards",
        type: "array-items",
        itemSchema: [
          { key: "title", label: "Card Title", type: "text", placeholder: "Card title" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Card description" },
          { key: "icon", label: "Icon Name (Lucide)", type: "text", placeholder: "e.g. Globe, Heart, Users" },
        ],
      },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    iconName: "HelpCircle",
    description: "Collapsible frequently asked questions accordion",
    defaultProps: {
      title: "Frequently Asked Questions",
      items: [
        { question: "What is a Third Culture Kid?", answer: "A TCK is someone who spent a significant part of their developmental years in a culture different from their parents'." },
        { question: "How are mental health professionals vetted?", answer: "All mental health professionals complete a thorough application and background verification process." },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "FAQ section heading" },
      {
        key: "items",
        label: "Questions",
        type: "array-items",
        itemSchema: [
          { key: "question", label: "Question", type: "text", placeholder: "FAQ question" },
          { key: "answer", label: "Answer", type: "textarea", placeholder: "FAQ answer" },
        ],
      },
    ],
  },
  {
    type: "testimonials",
    label: "Testimonials",
    iconName: "Quote",
    description: "Quote cards from clients or community members",
    defaultProps: {
      title: "What Our Community Says",
      items: [
        { quote: "Finding a mental health professional who truly understood my TCK experience was life-changing.", name: "Sarah M.", role: "TCK Client", location: "Singapore" },
        { quote: "I finally feel seen and understood in a way I never did before.", name: "James T.", role: "TCK Client", location: "Germany" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Testimonials heading" },
      {
        key: "items",
        label: "Testimonials",
        type: "array-items",
        itemSchema: [
          { key: "quote", label: "Quote", type: "textarea", placeholder: "Testimonial text" },
          { key: "name", label: "Name", type: "text", placeholder: "Person's name" },
          { key: "role", label: "Role", type: "text", placeholder: "e.g. TCK Client" },
          { key: "location", label: "Location", type: "text", placeholder: "e.g. Singapore" },
        ],
      },
    ],
  },
  {
    type: "featured-professionals",
    label: "Featured Mental Health Professionals",
    iconName: "UserCheck",
    description: "Live grid of featured mental health professionals from the directory",
    defaultProps: {
      title: "Meet Our Mental Health Professionals",
      subtitle: "Browse our network of TCK-informed mental health professionals.",
      limit: 3,
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Supporting text" },
      { key: "limit", label: "Max Mental Health Professionals to Show", type: "number", min: 1, max: 12 },
    ],
  },
  {
    type: "featured-counselors",
    label: "Featured Mental Health Professionals",
    iconName: "UserCheck",
    description: "Live grid of featured mental health professionals from the directory",
    defaultProps: {
      title: "Meet Our Mental Health Professionals",
      subtitle: "Browse our network of TCK-informed mental health professionals.",
      limit: 3,
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Supporting text" },
      { key: "limit", label: "Max Mental Health Professionals to Show", type: "number", min: 1, max: 12 },
    ],
  },
  {
    type: "events-preview",
    label: "Events Preview",
    iconName: "CalendarDays",
    description: "Live upcoming events from the events system",
    defaultProps: {
      title: "Upcoming Events",
      subtitle: "Join our community events and webinars.",
      limit: 3,
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Supporting text" },
      { key: "limit", label: "Max Events to Show", type: "number", min: 1, max: 9 },
    ],
  },
  {
    type: "blog-preview",
    label: "Blog Preview",
    iconName: "BookOpen",
    description: "Live featured blog/insights articles",
    defaultProps: {
      title: "Latest Insights",
      subtitle: "Resources and perspectives for the TCK community.",
      limit: 3,
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Supporting text" },
      { key: "limit", label: "Max Articles to Show", type: "number", min: 1, max: 9 },
    ],
  },
  {
    type: "button-group",
    label: "Button Group",
    iconName: "MousePointerClick",
    description: "One or more buttons in a row",
    defaultProps: {
      alignment: "center",
      buttons: [
        { text: "Get Started", link: "/directory", variant: "default" },
        { text: "Learn More", link: "/about", variant: "outline" },
      ],
    },
    propDefs: [
      { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTIONS },
      {
        key: "buttons",
        label: "Buttons",
        type: "array-items",
        itemSchema: [
          { key: "text", label: "Button Text", type: "text", placeholder: "Button label" },
          { key: "link", label: "Link", type: "url", placeholder: "/page or https://..." },
          { key: "variant", label: "Style", type: "select", options: BUTTON_VARIANT_OPTIONS },
        ],
      },
    ],
  },
  {
    type: "image-block",
    label: "Image Block",
    iconName: "Image",
    description: "A standalone image with optional caption",
    defaultProps: {
      imageUrl: "",
      alt: "",
      caption: "",
      width: "contained",
    },
    propDefs: [
      { key: "imageUrl", label: "Image", type: "image-url", placeholder: "Upload or select image" },
      { key: "alt", label: "Alt Text", type: "text", placeholder: "Descriptive alt text for accessibility" },
      { key: "caption", label: "Caption", type: "text", placeholder: "Optional image caption" },
      { key: "width", label: "Image Width", type: "select", options: IMAGE_WIDTH_OPTIONS },
    ],
  },
  {
    type: "video-embed",
    label: "Video Embed",
    iconName: "Play",
    description: "Embed a YouTube or Vimeo video",
    defaultProps: {
      url: "",
      title: "",
      aspectRatio: "16/9",
    },
    propDefs: [
      { key: "url", label: "Video URL (YouTube or Vimeo)", type: "url", placeholder: "https://youtube.com/..." },
      { key: "title", label: "Title (optional)", type: "text", placeholder: "Video title" },
      { key: "aspectRatio", label: "Aspect Ratio", type: "select", options: VIDEO_ASPECT_OPTIONS },
    ],
  },
  {
    type: "contact-info",
    label: "Contact Info",
    iconName: "Phone",
    description: "A list of contact details with icons",
    defaultProps: {
      title: "Get in Touch",
      items: [
        { icon: "MapPin", label: "Location", value: "Global — serving TCKs worldwide" },
        { icon: "Globe", label: "Website", value: "www.tckwellness.com" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Contact section heading" },
      {
        key: "items",
        label: "Contact Items",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide name)", type: "text", placeholder: "e.g. MapPin, Mail, Phone" },
          { key: "label", label: "Label", type: "text", placeholder: "e.g. Email, Phone" },
          { key: "value", label: "Value", type: "text", placeholder: "Contact detail" },
        ],
      },
    ],
  },
  {
    type: "divider",
    label: "Divider / Spacer",
    iconName: "Minus",
    description: "Visual divider or empty spacing between sections",
    defaultProps: {
      style: "spacer",
      spacing: "md",
    },
    propDefs: [
      { key: "style", label: "Style", type: "select", options: DIVIDER_STYLE_OPTIONS },
      { key: "spacing", label: "Spacing", type: "select", options: SPACING_OPTIONS },
    ],
  },
];

export const DYNAMIC_BLOCK_TYPES: BlockDef[] = [
  {
    type: "therapist-map",
    label: "Global Therapist Map (Live Data)",
    iconName: "Map",
    description: "Interactive map showing all mental health professionals — populated from live data",
    isDynamic: true,
    defaultProps: {
      title: "Our Mental Health Professionals Around the World",
      subtitle: "Click a pin to learn more about a TCK-informed professional near you",
    },
    propDefs: [],
  },
  {
    type: "contact-form",
    label: "Contact Form (Live)",
    iconName: "Mail",
    description: "Contact form with validation and submission — managed automatically",
    isDynamic: true,
    defaultProps: {},
    propDefs: [],
  },
  {
    type: "join-registration-form",
    label: "Join / Registration Form (Live)",
    iconName: "UserPlus",
    description: "Registration and login forms for mental health professionals — managed automatically",
    isDynamic: true,
    defaultProps: {},
    propDefs: [],
  },
];

export const ALL_BLOCKS: BlockDef[] = [...BLOCK_REGISTRY, ...DYNAMIC_BLOCK_TYPES];

export function getBlockDef(type: string): BlockDef | undefined {
  return ALL_BLOCKS.find((b) => b.type === type);
}

export function isDynamicBlock(type: string): boolean {
  const def = getBlockDef(type);
  return def?.isDynamic === true;
}

export function createBlock(type: string): BlockInstance {
  const def = getBlockDef(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return {
    id: crypto.randomUUID(),
    type,
    props: { ...def.defaultProps },
  };
}
