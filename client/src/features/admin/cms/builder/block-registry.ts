export type PropType =
  | "text"
  | "textarea"
  | "richtext"
  | "image-url"
  | "url"
  | "page-select"
  | "select"
  | "form-select"
  | "boolean"
  | "number"
  | "color"
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

export type BlockCategory = "layout" | "hero" | "content" | "media" | "social-proof" | "conversion" | "data" | "dynamic";

export interface BlockDef {
  type: string;
  label: string;
  iconName: string;
  description: string;
  category: BlockCategory;
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

const LEGACY_BLOCK_TYPE_ALIASES: Record<string, string> = {
  "call-to-action": "cta",
  "cta-banner": "cta",
  "blog-feed": "blog-post-feed",
  "blog-archive": "blog-post-feed",
  "featured-articles": "blog-preview",
  "articles-preview": "blog-preview",
  "events-feed": "events-preview",
  "upcoming-events": "events-preview",
};

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

const FEATURE_LIST_COLUMNS_OPTIONS = [
  { label: "1 column", value: "1" },
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
];

const SPACING_OPTIONS = [
  { label: "Extra Small (16px)", value: "xs" },
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

const BUTTON_ACTION_OPTIONS = [
  { label: "Internal Link", value: "internal-link" },
  { label: "Custom Link", value: "custom-link" },
  { label: "Modal Form", value: "form-modal" },
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

const MOBILE_IMAGE_FIT_OPTIONS = [
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
];

const MOBILE_IMAGE_HEIGHT_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Short (240px)", value: "sm" },
  { label: "Medium (320px)", value: "md" },
  { label: "Tall (420px)", value: "lg" },
  { label: "Extra Tall (520px)", value: "xl" },
];

const DIVIDER_STYLE_OPTIONS = [
  { label: "Horizontal line", value: "line" },
  { label: "Spacer (invisible)", value: "spacer" },
  { label: "Dots", value: "dots" },
];

const HERO_LAYOUT_OPTIONS = [
  { label: "Stacked (centered)", value: "stacked" },
  { label: "Split (text left, image right)", value: "split" },
];

const HERO_MIN_HEIGHT_OPTIONS = [
  { label: "Small (320px)", value: "320" },
  { label: "Medium (420px)", value: "420" },
  { label: "Large (560px)", value: "560" },
  { label: "Extra Large (700px)", value: "700" },
  { label: "Full Screen", value: "100vh" },
];

const LINK_LIST_COLUMNS_OPTIONS = [
  { label: "1 column", value: "1" },
  { label: "2 columns", value: "2" },
];

const CALLOUT_VARIANT_OPTIONS = [
  { label: "Accent", value: "accent" },
  { label: "Neutral", value: "neutral" },
  { label: "Outline", value: "outline" },
];

const COLUMNS_EXTENDED_OPTIONS = [
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
  { label: "4 columns", value: "4" },
  { label: "5 columns", value: "5" },
];

const BENEFIT_LAYOUT_OPTIONS = [
  { label: "Stack", value: "stack" },
  { label: "Timeline", value: "timeline" },
];

const EXPERIENCE_LEVEL_OPTIONS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const HEADING_LEVEL_OPTIONS = [
  { label: "H2 (Section Heading)", value: "h2" },
  { label: "H1 (Main Page Heading)", value: "h1" },
];

const RADIAL_GRADIENT_POSITION_OPTIONS = [
  { label: "Top of Section", value: "top" },
  { label: "Bottom of Section", value: "bottom" },
];

const SECTION_PADDING_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Extra Small", value: "xs" },
  { label: "Small", value: "sm" },
  { label: "Default", value: "md" },
  { label: "Large", value: "lg" },
  { label: "Extra Large", value: "xl" },
];

const SHARED_SECTION_STYLE_DEFAULTS = {
  sectionBackgroundColor: "#ffffff",
  sectionBackgroundImageUrl: "",
  sectionBackgroundPositionX: 50,
  sectionBackgroundPositionY: 50,
  sectionBackgroundOverlayColor: "#000000",
  sectionBackgroundOverlayOpacity: 0,
  sectionShowRadialGradient: false,
  sectionRadialGradientColor: "#89cda1",
  sectionRadialGradientPosition: "top",
  sectionBorderTopWidth: 0,
  sectionBorderTopColor: "#d9e2dc",
  sectionBorderBottomWidth: 0,
  sectionBorderBottomColor: "#d9e2dc",
  sectionPaddingTop: "md",
  sectionPaddingBottom: "md",
};

const SHARED_SECTION_STYLE_PROP_DEFS: PropDef[] = [
  { key: "sectionBackgroundColor", label: "Background Color", type: "color", placeholder: "#ffffff" },
  { key: "sectionBackgroundImageUrl", label: "Background Image", type: "image-url", placeholder: "Upload or select image" },
  { key: "sectionBackgroundPositionX", label: "Image Position X (%)", type: "number", min: 0, max: 100 },
  { key: "sectionBackgroundPositionY", label: "Image Position Y (%)", type: "number", min: 0, max: 100 },
  { key: "sectionBackgroundOverlayColor", label: "Background Image Overlay Color", type: "color", placeholder: "#000000" },
  { key: "sectionBackgroundOverlayOpacity", label: "Background Image Overlay Opacity (%)", type: "number", min: 0, max: 100 },
  { key: "sectionShowRadialGradient", label: "Show Radial Gradient Overlay", type: "boolean" },
  { key: "sectionRadialGradientColor", label: "Radial Gradient Color", type: "color", placeholder: "#89cda1" },
  { key: "sectionRadialGradientPosition", label: "Radial Gradient Position", type: "select", options: RADIAL_GRADIENT_POSITION_OPTIONS },
  { key: "sectionBorderTopWidth", label: "Top Border Thickness (px)", type: "number", min: 0, max: 24 },
  { key: "sectionBorderTopColor", label: "Top Border Color", type: "color", placeholder: "#d9e2dc" },
  { key: "sectionBorderBottomWidth", label: "Bottom Border Thickness (px)", type: "number", min: 0, max: 24 },
  { key: "sectionBorderBottomColor", label: "Bottom Border Color", type: "color", placeholder: "#d9e2dc" },
];

const SHARED_SECTION_ACCENT_PROP_DEFS: PropDef[] = [
  { key: "sectionBackgroundColor", label: "Background Color", type: "color", placeholder: "#ffffff" },
  { key: "sectionShowRadialGradient", label: "Show Radial Gradient Overlay", type: "boolean" },
  { key: "sectionRadialGradientColor", label: "Radial Gradient Color", type: "color", placeholder: "#89cda1" },
  { key: "sectionRadialGradientPosition", label: "Radial Gradient Position", type: "select", options: RADIAL_GRADIENT_POSITION_OPTIONS },
  { key: "sectionBorderTopWidth", label: "Top Border Thickness (px)", type: "number", min: 0, max: 24 },
  { key: "sectionBorderTopColor", label: "Top Border Color", type: "color", placeholder: "#d9e2dc" },
  { key: "sectionBorderBottomWidth", label: "Bottom Border Thickness (px)", type: "number", min: 0, max: 24 },
  { key: "sectionBorderBottomColor", label: "Bottom Border Color", type: "color", placeholder: "#d9e2dc" },
];

const SHARED_SECTION_PADDING_PROP_DEFS: PropDef[] = [
  { key: "sectionPaddingTop", label: "Top Padding", type: "select", options: SECTION_PADDING_OPTIONS },
  { key: "sectionPaddingBottom", label: "Bottom Padding", type: "select", options: SECTION_PADDING_OPTIONS },
];

const SHARED_SECTION_HEADING_DEFAULTS = {
  sectionEyebrow: "",
  sectionHeadingLevel: "h2",
  sectionHeadingAlignment: "center",
};

const SHARED_SECTION_HEADING_PROP_DEFS: PropDef[] = [
  { key: "sectionEyebrow", label: "Eyebrow Label", type: "text", placeholder: "Small label above title" },
  { key: "sectionHeadingLevel", label: "Heading Level", type: "select", options: HEADING_LEVEL_OPTIONS },
  { key: "sectionHeadingAlignment", label: "Heading Alignment", type: "select", options: ALIGN_OPTIONS },
];

const SHARED_VISIBILITY_DEFAULTS = {
  isActive: true,
};

const SHARED_VISIBILITY_PROP_DEFS: PropDef[] = [
  { key: "isActive", label: "Active on Public Site", type: "boolean" },
];

const SHARED_MOBILE_IMAGE_DEFAULTS = {
  mobileImageFit: "cover",
  mobileImageHeight: "auto",
  mobileImagePositionX: 50,
  mobileImagePositionY: 50,
};

const SHARED_MOBILE_IMAGE_PROP_DEFS: PropDef[] = [
  { key: "mobileImageFit", label: "Mobile Image Fit", type: "select", options: MOBILE_IMAGE_FIT_OPTIONS },
  { key: "mobileImageHeight", label: "Mobile Image Height", type: "select", options: MOBILE_IMAGE_HEIGHT_OPTIONS },
  { key: "mobileImagePositionX", label: "Mobile Image Position X (%)", type: "number", min: 0, max: 100 },
  { key: "mobileImagePositionY", label: "Mobile Image Position Y (%)", type: "number", min: 0, max: 100 },
];

const OPTIONAL_SECTION_HEADING_PROP_DEFS: PropDef[] = [
  { key: "title", label: "Section Title", type: "text", placeholder: "Optional section heading" },
  { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional supporting description" },
];

const OPTIONAL_SECTION_HEADING_BLOCKS = new Set([
  "rich-text",
  "button-group",
  "image-block",
  "trust-bar",
  "stats-bar",
]);

function mergePropDefs(existing: PropDef[], additions: PropDef[]) {
  const seen = new Set(existing.map((prop) => prop.key));
  return [...existing, ...additions.filter((prop) => !seen.has(prop.key))];
}

function withSharedSectionStyles(
  block: BlockDef,
  options?: { includeImageControls?: boolean; includePaddingControls?: boolean }
): BlockDef {
  const includeImageControls = options?.includeImageControls ?? true;
  const includePaddingControls = options?.includePaddingControls ?? true;
  const sharedPropDefs = includeImageControls ? SHARED_SECTION_STYLE_PROP_DEFS : SHARED_SECTION_ACCENT_PROP_DEFS;
  const sharedDefaults = includeImageControls
    ? SHARED_SECTION_STYLE_DEFAULTS
    : {
        sectionBackgroundColor: SHARED_SECTION_STYLE_DEFAULTS.sectionBackgroundColor,
        sectionShowRadialGradient: SHARED_SECTION_STYLE_DEFAULTS.sectionShowRadialGradient,
        sectionRadialGradientColor: SHARED_SECTION_STYLE_DEFAULTS.sectionRadialGradientColor,
        sectionRadialGradientPosition: SHARED_SECTION_STYLE_DEFAULTS.sectionRadialGradientPosition,
      };

  const paddingDefaults = includePaddingControls
    ? {
        sectionPaddingTop: SHARED_SECTION_STYLE_DEFAULTS.sectionPaddingTop,
        sectionPaddingBottom: SHARED_SECTION_STYLE_DEFAULTS.sectionPaddingBottom,
      }
    : {};

  return {
    ...block,
    defaultProps: {
      ...sharedDefaults,
      ...paddingDefaults,
      ...block.defaultProps,
    },
    propDefs: mergePropDefs(
      block.propDefs,
      includePaddingControls ? [...sharedPropDefs, ...SHARED_SECTION_PADDING_PROP_DEFS] : sharedPropDefs
    ),
  };
}

function withSharedSectionHeading(block: BlockDef): BlockDef {
  const hasTitle = block.propDefs.some((prop) => prop.key === "title");
  const shouldAddHeading = hasTitle || OPTIONAL_SECTION_HEADING_BLOCKS.has(block.type);
  if (!shouldAddHeading || block.type === "section-header") return block;

  return {
    ...block,
    defaultProps: {
      ...SHARED_SECTION_HEADING_DEFAULTS,
      title: "",
      subtitle: "",
      ...block.defaultProps,
    },
    propDefs: mergePropDefs(block.propDefs, [
      ...OPTIONAL_SECTION_HEADING_PROP_DEFS,
      ...SHARED_SECTION_HEADING_PROP_DEFS,
    ]),
  };
}

function withSharedVisibility(block: BlockDef): BlockDef {
  return {
    ...block,
    defaultProps: {
      ...SHARED_VISIBILITY_DEFAULTS,
      ...block.defaultProps,
    },
    propDefs: mergePropDefs(block.propDefs, SHARED_VISIBILITY_PROP_DEFS),
  };
}

const BASE_BLOCK_REGISTRY: BlockDef[] = [
  {
    type: "hero",
    label: "Hero",
    iconName: "Sparkles",
    description: "Full-width hero with heading, subheading, and CTA buttons",
    category: "hero",
    defaultProps: {
      heading: "Welcome to Core Platform",
      accentHeading: "",
      headingColor: "",
      accentHeadingColor: "",
      subheading: "Connecting Third Culture Kids with mental health professionals who understand your world.",
      subheadingColor: "",
      ctaText: "Find a Mental Health Professional",
      ctaLink: "/directory",
      ctaAction: "internal-link",
      ctaOpenInNewTab: false,
      ctaFormSlug: "contact-form",
      ctaModalTitle: "",
      ctaModalDescription: "",
      ctaSecondaryText: "Learn More",
      ctaSecondaryLink: "/about",
      ctaSecondaryAction: "internal-link",
      ctaSecondaryOpenInNewTab: false,
      ctaSecondaryFormSlug: "contact-form",
      ctaSecondaryModalTitle: "",
      ctaSecondaryModalDescription: "",
      backgroundImageUrl: "",
      backgroundPositionX: 50,
      backgroundPositionY: 50,
      overlayColor: "#000000",
      overlayOpacity: 50,
      badge: "",
      layout: "stacked",
      videoBackgroundUrl: "",
      minHeight: "420",
    },
    propDefs: [
      { key: "badge", label: "Badge Text", type: "text", placeholder: "e.g. New, Coming Soon" },
      { key: "heading", label: "Heading", type: "text", placeholder: "Main heading" },
      { key: "accentHeading", label: "Accent Heading", type: "text", placeholder: "Optional highlighted heading text" },
      { key: "headingColor", label: "Heading Color", type: "color", placeholder: "#ffffff" },
      { key: "accentHeadingColor", label: "Accent Heading Color", type: "color", placeholder: "#89cda1" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Supporting text beneath the heading" },
      { key: "subheadingColor", label: "Subheading Color", type: "color", placeholder: "#ffffff" },
      { key: "ctaText", label: "Primary Button Text", type: "text", placeholder: "e.g. Find a Mental Health Professional" },
      { key: "ctaAction", label: "Primary Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "ctaLink", label: "Primary Button Link", type: "url", placeholder: "/directory" },
      { key: "ctaOpenInNewTab", label: "Primary Open In New Tab", type: "boolean" },
      { key: "ctaFormSlug", label: "Primary Button Form", type: "form-select" },
      { key: "ctaModalTitle", label: "Primary Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "ctaModalDescription", label: "Primary Modal Description", type: "textarea", placeholder: "Optional modal description" },
      { key: "ctaSecondaryText", label: "Secondary Button Text", type: "text", placeholder: "e.g. Learn More" },
      { key: "ctaSecondaryAction", label: "Secondary Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "ctaSecondaryLink", label: "Secondary Button Link", type: "url", placeholder: "/about" },
      { key: "ctaSecondaryOpenInNewTab", label: "Secondary Open In New Tab", type: "boolean" },
      { key: "ctaSecondaryFormSlug", label: "Secondary Button Form", type: "form-select" },
      { key: "ctaSecondaryModalTitle", label: "Secondary Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "ctaSecondaryModalDescription", label: "Secondary Modal Description", type: "textarea", placeholder: "Optional modal description" },
      { key: "backgroundImageUrl", label: "Background Image", type: "image-url", placeholder: "Upload or select image" },
      { key: "backgroundPositionX", label: "Image Position X (%)", type: "number", min: 0, max: 100 },
      { key: "backgroundPositionY", label: "Image Position Y (%)", type: "number", min: 0, max: 100 },
      { key: "videoBackgroundUrl", label: "Video Background URL", type: "url", placeholder: "https://example.com/video.mp4" },
      { key: "overlayColor", label: "Overlay Color", type: "color", placeholder: "#000000" },
      { key: "overlayOpacity", label: "Overlay Opacity (%)", type: "number", min: 0, max: 100 },
      { key: "layout", label: "Layout", type: "select", options: HERO_LAYOUT_OPTIONS },
      { key: "minHeight", label: "Min Height (px)", type: "select", options: HERO_MIN_HEIGHT_OPTIONS },
    ],
  },
  {
    type: "section-header",
    label: "Section Header",
    iconName: "Heading",
    description: "Title, optional eyebrow label, and subtitle",
    category: "layout",
    defaultProps: {
      eyebrow: "Our Approach",
      title: "Why Core Platform-Informed Care Matters",
      subtitle: "We match you with mental health professionals who understand the Core Platform experience.",
      alignment: "center",
      headingLevel: "h2",
    },
    propDefs: [
      { key: "eyebrow", label: "Eyebrow Label", type: "text", placeholder: "Small label above title" },
      { key: "title", label: "Title", type: "text", placeholder: "Section title" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Supporting description" },
      { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTIONS },
      { key: "headingLevel", label: "Heading Level", type: "select", options: HEADING_LEVEL_OPTIONS },
    ],
  },
  {
    type: "rich-text",
    label: "Rich Text",
    iconName: "FileText",
    description: "Free-form text content with alignment control",
    category: "content",
    defaultProps: {
      content: "<p>Enter your content here.</p>",
      alignment: "left",
    },
    propDefs: [
      { key: "content", label: "Content", type: "richtext", placeholder: "Enter content..." },
      { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTIONS },
    ],
  },
  {
    type: "text-image",
    label: "Text + Image",
    iconName: "LayoutTemplate",
    description: "Side-by-side text and image with configurable position",
    category: "content",
    defaultProps: {
      eyebrow: "Our Story",
      heading: "About Our Mission",
      subtitle: "Use this supporting introduction to frame the section before the main body copy begins.",
      body: "<p>We provide access to culturally informed mental health professionals who understand what it means to grow up between worlds.</p>",
      alignment: "left",
      headingLevel: "h2",
      imageUrl: "",
      imageAlt: "About Core Platform",
      imageCaption: "",
      imagePosition: "right",
      ...SHARED_MOBILE_IMAGE_DEFAULTS,
    },
    propDefs: [
      { key: "eyebrow", label: "Eyebrow Label", type: "text", placeholder: "Small label above title" },
      { key: "heading", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Supporting description" },
      { key: "alignment", label: "Alignment", type: "select", options: ALIGN_OPTIONS },
      { key: "headingLevel", label: "Heading Level", type: "select", options: HEADING_LEVEL_OPTIONS },
      { key: "body", label: "Body Text", type: "richtext", placeholder: "Main text content" },
      { key: "imageUrl", label: "Image", type: "image-url", placeholder: "Upload or select image" },
      { key: "imageAlt", label: "Image Alt Text", type: "text", placeholder: "Descriptive alt text" },
      { key: "imageCaption", label: "Image Caption", type: "text", placeholder: "Optional caption" },
      { key: "imagePosition", label: "Image Position", type: "select", options: IMAGE_POSITION_OPTIONS },
      ...SHARED_MOBILE_IMAGE_PROP_DEFS,
    ],
  },
  {
    type: "two-column-text",
    label: "Two Column Text",
    iconName: "LayoutTemplate",
    description: "Two side-by-side content columns with optional bullet lists",
    category: "content",
    defaultProps: {
      title: "Compare Your Options",
      subtitle: "",
      leftHeading: "Column One",
      leftBody: "<p>Use this space for supporting copy before the list.</p>",
      leftItems: [
        { text: "Bullet point one" },
        { text: "Bullet point two" },
      ],
      rightHeading: "Column Two",
      rightBody: "<p>Use this column for a second list or additional detail.</p>",
      rightItems: [
        { text: "Bullet point one" },
        { text: "Bullet point two" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional section heading" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional supporting description" },
      { key: "leftHeading", label: "Left Column Heading", type: "text", placeholder: "Left column title" },
      { key: "leftBody", label: "Left Column Body", type: "richtext", placeholder: "Optional supporting text" },
      {
        key: "leftItems",
        label: "Left Column Items",
        type: "array-items",
        itemSchema: [{ key: "text", label: "Item Text", type: "text", placeholder: "Bullet point" }],
      },
      { key: "rightHeading", label: "Right Column Heading", type: "text", placeholder: "Right column title" },
      { key: "rightBody", label: "Right Column Body", type: "richtext", placeholder: "Optional supporting text" },
      {
        key: "rightItems",
        label: "Right Column Items",
        type: "array-items",
        itemSchema: [{ key: "text", label: "Item Text", type: "text", placeholder: "Bullet point" }],
      },
    ],
  },
  {
    type: "callout-box",
    label: "Callout Box",
    iconName: "Quote",
    description: "Highlighted callout content with optional button",
    category: "content",
    defaultProps: {
      title: "Important Takeaway",
      subtitle: "",
      content: "<p>Use this callout to highlight a key message, important note, or short supporting explanation.</p>",
      variant: "accent",
      ctaText: "",
      ctaLink: "",
      ctaAction: "internal-link",
      ctaOpenInNewTab: false,
      ctaFormSlug: "contact-form",
      ctaModalTitle: "",
      ctaModalDescription: "",
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional section heading" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional supporting description" },
      { key: "content", label: "Content", type: "richtext", placeholder: "Add highlighted content..." },
      { key: "variant", label: "Style Variant", type: "select", options: CALLOUT_VARIANT_OPTIONS },
      { key: "ctaText", label: "Button Text", type: "text", placeholder: "Optional button label" },
      { key: "ctaAction", label: "Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "ctaLink", label: "Button Link", type: "url", placeholder: "/page or https://..." },
      { key: "ctaOpenInNewTab", label: "Open In New Tab", type: "boolean" },
      { key: "ctaFormSlug", label: "Assigned Form", type: "form-select" },
      { key: "ctaModalTitle", label: "Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "ctaModalDescription", label: "Modal Description", type: "textarea", placeholder: "Optional modal description" },
    ],
  },
  {
    type: "link-list",
    label: "Link List",
    iconName: "List",
    description: "Editorial list of resource links with optional descriptions",
    category: "content",
    defaultProps: {
      title: "Helpful Resources",
      subtitle: "",
      columns: "1",
      links: [
        { label: "Resource title", description: "Short supporting description", url: "#" },
        { label: "Another resource", description: "Optional summary text", url: "#" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional section heading" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional supporting description" },
      { key: "columns", label: "Columns", type: "select", options: LINK_LIST_COLUMNS_OPTIONS },
      {
        key: "links",
        label: "Links",
        type: "array-items",
        itemSchema: [
          { key: "label", label: "Label", type: "text", placeholder: "Link title" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Optional supporting text" },
          { key: "url", label: "URL", type: "url", placeholder: "/page or https://..." },
        ],
      },
    ],
  },
  {
    type: "cta",
    label: "Call to Action",
    iconName: "Megaphone",
    description: "Bold call-to-action section with one or two buttons",
    category: "conversion",
    defaultProps: {
      heading: "Ready to Get Started?",
      subheading: "Find a Core Platform-informed mental health professional and begin your journey today.",
      primaryText: "Browse Mental Health Professionals",
      primaryLink: "/directory",
      primaryAction: "internal-link",
      primaryOpenInNewTab: false,
      primaryFormSlug: "contact-form",
      primaryModalTitle: "",
      primaryModalDescription: "",
      secondaryText: "Join the Network",
      secondaryLink: "/join",
      secondaryAction: "internal-link",
      secondaryOpenInNewTab: false,
      secondaryFormSlug: "contact-form",
      secondaryModalTitle: "",
      secondaryModalDescription: "",
      variant: "dark",
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "CTA heading" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Supporting text" },
      { key: "primaryText", label: "Primary Button", type: "text", placeholder: "Button label" },
      { key: "primaryAction", label: "Primary Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "primaryLink", label: "Primary Button Link", type: "url", placeholder: "/directory" },
      { key: "primaryOpenInNewTab", label: "Primary Open In New Tab", type: "boolean" },
      { key: "primaryFormSlug", label: "Primary Button Form", type: "form-select" },
      { key: "primaryModalTitle", label: "Primary Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "primaryModalDescription", label: "Primary Modal Description", type: "textarea", placeholder: "Optional modal description" },
      { key: "secondaryText", label: "Secondary Button", type: "text", placeholder: "Optional secondary button" },
      { key: "secondaryAction", label: "Secondary Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "secondaryLink", label: "Secondary Button Link", type: "url", placeholder: "/about" },
      { key: "secondaryOpenInNewTab", label: "Secondary Open In New Tab", type: "boolean" },
      { key: "secondaryFormSlug", label: "Secondary Button Form", type: "form-select" },
      { key: "secondaryModalTitle", label: "Secondary Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "secondaryModalDescription", label: "Secondary Modal Description", type: "textarea", placeholder: "Optional modal description" },
      { key: "variant", label: "Style Variant", type: "select", options: CTA_VARIANT_OPTIONS },
    ],
  },
  {
    type: "cards-grid",
    label: "Cards Grid",
    iconName: "LayoutGrid",
    description: "A configurable grid of icon + text cards",
    category: "content",
    defaultProps: {
      title: "Why Choose Core Platform",
      subtitle: "",
      columns: "3",
      cards: [
        { title: "Culturally Informed", description: "Mental health professionals who understand the Core Platform experience.", icon: "Globe" },
        { title: "Specialized Support", description: "Targeted help for unique Core Platform challenges.", icon: "Heart" },
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
    category: "content",
    defaultProps: {
      title: "Frequently Asked Questions",
      items: [
        { question: "What is a Third Culture Kid?", answer: "A Core Platform is someone who spent a significant part of their developmental years in a culture different from their parents'." },
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
    category: "social-proof",
    defaultProps: {
      title: "What Our Community Says",
      items: [
        { quote: "Finding a mental health professional who truly understood my Core Platform experience was life-changing.", name: "Sarah M.", role: "Core Platform Client", location: "Singapore" },
        { quote: "I finally feel seen and understood in a way I never did before.", name: "James T.", role: "Core Platform Client", location: "Germany" },
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
          { key: "role", label: "Role", type: "text", placeholder: "e.g. Core Platform Client" },
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
    category: "data",
    defaultProps: {
      title: "Meet Our Mental Health Professionals",
      subtitle: "Browse our network of Core Platform-informed mental health professionals.",
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
    category: "data",
    defaultProps: {
      title: "Meet Our Mental Health Professionals",
      subtitle: "Browse our network of Core Platform-informed mental health professionals.",
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
    category: "data",
    defaultProps: {
      title: "Upcoming Events",
      subtitle: "Join our community events and webinars.",
      limit: 4,
      ctaText: "",
      ctaLink: "",
      ctaAction: "internal-link",
      ctaOpenInNewTab: false,
      ctaFormSlug: "contact-form",
      ctaModalTitle: "",
      ctaModalDescription: "",
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Supporting text" },
      { key: "limit", label: "Max Events to Show", type: "number", min: 1, max: 12 },
      { key: "ctaText", label: "Button Text", type: "text", placeholder: "Optional button label" },
      { key: "ctaAction", label: "Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "ctaLink", label: "Button Link", type: "url", placeholder: "/events or https://..." },
      { key: "ctaOpenInNewTab", label: "Open In New Tab", type: "boolean" },
      { key: "ctaFormSlug", label: "Assigned Form", type: "form-select" },
      { key: "ctaModalTitle", label: "Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "ctaModalDescription", label: "Modal Description", type: "textarea", placeholder: "Optional modal description" },
    ],
  },
  {
    type: "blog-preview",
    label: "Blog Preview",
    iconName: "BookOpen",
    description: "Live featured blog/insights articles",
    category: "data",
    defaultProps: {
      title: "Latest Insights",
      subtitle: "Resources and perspectives for the Core Platform community.",
      limit: 5,
      enableHoverMotion: true,
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Supporting text" },
      { key: "limit", label: "Max Articles to Show", type: "number", min: 1, max: 12 },
      { key: "enableHoverMotion", label: "Enable Hover Motion", type: "boolean" },
    ],
  },
  {
    type: "button-group",
    label: "Button Group",
    iconName: "MousePointerClick",
    description: "One or more buttons in a row",
    category: "conversion",
    defaultProps: {
      alignment: "center",
      buttons: [
        { text: "Get Started", action: "url", link: "/directory", formSlug: "contact-form", modalTitle: "", modalDescription: "", variant: "default" },
        { text: "Learn More", action: "url", link: "/about", formSlug: "contact-form", modalTitle: "", modalDescription: "", variant: "outline" },
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
          { key: "action", label: "Action", type: "select", options: BUTTON_ACTION_OPTIONS },
          { key: "link", label: "Link", type: "url", placeholder: "/page or https://..." },
          { key: "openInNewTab", label: "Open In New Tab", type: "boolean" },
          { key: "formSlug", label: "Assigned Form", type: "form-select" },
          { key: "modalTitle", label: "Modal Title", type: "text", placeholder: "Optional modal title override" },
          { key: "modalDescription", label: "Modal Description", type: "textarea", placeholder: "Optional modal description" },
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
    category: "media",
    defaultProps: {
      imageUrl: "",
      alt: "",
      caption: "",
      width: "contained",
      ...SHARED_MOBILE_IMAGE_DEFAULTS,
    },
    propDefs: [
      { key: "imageUrl", label: "Image", type: "image-url", placeholder: "Upload or select image" },
      { key: "alt", label: "Alt Text", type: "text", placeholder: "Descriptive alt text for accessibility" },
      { key: "caption", label: "Caption", type: "text", placeholder: "Optional image caption" },
      { key: "width", label: "Image Width", type: "select", options: IMAGE_WIDTH_OPTIONS },
      ...SHARED_MOBILE_IMAGE_PROP_DEFS,
    ],
  },
  {
    type: "video-embed",
    label: "Video Embed",
    iconName: "Play",
    description: "Embed a YouTube or Vimeo video",
    category: "media",
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
    type: "raw-html",
    label: "Raw HTML / Embed",
    iconName: "FileText",
    description: "Trusted raw HTML, scripts, iframes, or 3rd-party embed code",
    category: "media",
    defaultProps: {
      title: "",
      subtitle: "",
      html: "<div class=\"rounded-xl border p-6 text-center text-sm text-muted-foreground\">Paste trusted embed code here.</div>",
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional section heading" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Optional supporting description" },
      { key: "html", label: "HTML / Embed Code", type: "textarea", placeholder: "<iframe ...></iframe>" },
    ],
  },
  {
    type: "contact-info",
    label: "Contact Info",
    iconName: "Phone",
    description: "A list of contact details with icons",
    category: "content",
    defaultProps: {
      title: "Get in Touch",
      items: [
        { icon: "MapPin", label: "Location", value: "Global — serving Core Platforms worldwide" },
        { icon: "Globe", label: "Website", value: "www.coreplatform.com" },
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
    category: "layout",
    defaultProps: {
      style: "spacer",
      spacing: "md",
    },
    propDefs: [
      { key: "style", label: "Style", type: "select", options: DIVIDER_STYLE_OPTIONS },
      { key: "spacing", label: "Spacing", type: "select", options: SPACING_OPTIONS },
    ],
  },
  {
    type: "feature-list",
    label: "Feature List",
    iconName: "List",
    description: "Icon + title + description features in a configurable column layout",
    category: "content",
    defaultProps: {
      title: "Key Features",
      subtitle: "",
      columns: "3",
      features: [
        { icon: "CheckCircle", title: "Vetted Professionals", description: "Every professional is carefully reviewed and verified." },
        { icon: "Globe", title: "Global Reach", description: "Connect with professionals worldwide." },
        { icon: "Heart", title: "Culturally Informed", description: "Professionals who understand the Core Platform experience." },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      { key: "columns", label: "Columns", type: "select", options: FEATURE_LIST_COLUMNS_OPTIONS },
      {
        key: "features",
        label: "Features",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide)", type: "text", placeholder: "e.g. CheckCircle, Globe" },
          { key: "title", label: "Title", type: "text", placeholder: "Feature title" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Feature description" },
        ],
      },
    ],
  },
  {
    type: "objection-busters",
    label: "Objection Busters",
    iconName: "ShieldCheck",
    description: "Address common concerns with reassuring responses",
    category: "conversion",
    defaultProps: {
      title: "Common Questions & Concerns",
      subtitle: "",
      items: [
        { concern: "Will the professional understand my background?", response: "Every professional in our directory has specific training or lived experience with cross-cultural populations." },
        { concern: "Is online therapy effective?", response: "Research consistently shows that online therapy can be as effective as in-person sessions for many conditions." },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      {
        key: "items",
        label: "Objections",
        type: "array-items",
        itemSchema: [
          { key: "concern", label: "Concern", type: "text", placeholder: "What they worry about" },
          { key: "response", label: "Response", type: "textarea", placeholder: "Reassuring answer" },
        ],
      },
    ],
  },
  {
    type: "before-after",
    label: "Before & After",
    iconName: "ArrowRight",
    description: "Timeline-style milestones showing transformation or progress",
    category: "social-proof",
    defaultProps: {
      title: "Your Journey",
      subtitle: "",
      items: [
        { before: "Feeling isolated and misunderstood", after: "Connected with a professional who gets it", milestone: "Week 1" },
        { before: "Struggling to articulate cross-cultural grief", after: "Learning frameworks to process your experience", milestone: "Month 1" },
        { before: "Navigating identity confusion alone", after: "Building confidence in your multicultural identity", milestone: "Month 3" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      {
        key: "items",
        label: "Milestones",
        type: "array-items",
        itemSchema: [
          { key: "milestone", label: "Milestone Label", type: "text", placeholder: "e.g. Week 1, Step 1" },
          { key: "before", label: "Before", type: "text", placeholder: "Starting point" },
          { key: "after", label: "After", type: "text", placeholder: "Outcome" },
        ],
      },
    ],
  },
  {
    type: "trust-bar",
    label: "Trust Bar",
    iconName: "Shield",
    description: "Row of trust signals with icons and labels",
    category: "social-proof",
    defaultProps: {
      items: [
        { icon: "ShieldCheck", label: "Verified Professionals" },
        { icon: "Lock", label: "Secure & Confidential" },
        { icon: "Globe", label: "Global Network" },
        { icon: "Heart", label: "Core Platform-Informed Care" },
      ],
    },
    propDefs: [
      {
        key: "items",
        label: "Trust Signals",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide)", type: "text", placeholder: "e.g. ShieldCheck, Lock" },
          { key: "label", label: "Label", type: "text", placeholder: "Trust signal text" },
        ],
      },
    ],
  },
  {
    type: "press-mentions",
    label: "Press Mentions",
    iconName: "Newspaper",
    description: "Display media logos with optional links",
    category: "social-proof",
    defaultProps: {
      title: "As Seen In",
      items: [
        { name: "Publication Name", logoUrl: "", link: "" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "e.g. As Seen In, Featured By" },
      {
        key: "items",
        label: "Press Items",
        type: "array-items",
        itemSchema: [
          { key: "name", label: "Publication Name", type: "text", placeholder: "e.g. CNN, Forbes" },
          { key: "logoUrl", label: "Logo Image", type: "image-url", placeholder: "Upload logo" },
          { key: "link", label: "Link (optional)", type: "url", placeholder: "https://..." },
        ],
      },
    ],
  },
  {
    type: "social-proof-stats",
    label: "Social Proof Stats",
    iconName: "TrendingUp",
    description: "Key statistics with values, labels, and optional disclaimer",
    category: "social-proof",
    defaultProps: {
      title: "",
      stats: [
        { value: "500+", label: "Professionals in Network" },
        { value: "40+", label: "Countries Represented" },
        { value: "10,000+", label: "Core Platforms Connected" },
      ],
      disclaimer: "",
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional heading" },
      {
        key: "stats",
        label: "Statistics",
        type: "array-items",
        itemSchema: [
          { key: "value", label: "Value", type: "text", placeholder: "e.g. 500+, 98%" },
          { key: "label", label: "Label", type: "text", placeholder: "What the stat represents" },
        ],
      },
      { key: "disclaimer", label: "Disclaimer", type: "text", placeholder: "Optional disclaimer text" },
    ],
  },
  {
    type: "image-grid",
    label: "Image Grid",
    iconName: "Grid3X3",
    description: "Multi-image grid with configurable columns",
    category: "media",
    defaultProps: {
      title: "",
      columns: "3",
      gap: "md",
      images: [],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional heading" },
      { key: "columns", label: "Columns", type: "select", options: COLUMNS_OPTIONS },
      { key: "gap", label: "Gap Size", type: "select", options: SPACING_OPTIONS },
      {
        key: "images",
        label: "Images",
        type: "array-items",
        itemSchema: [
          { key: "url", label: "Image", type: "image-url", placeholder: "Upload image" },
          { key: "alt", label: "Alt Text", type: "text", placeholder: "Image description" },
          { key: "caption", label: "Caption", type: "text", placeholder: "Optional caption" },
        ],
      },
    ],
  },
  {
    type: "slider",
    label: "Content Slider",
    iconName: "GalleryHorizontal",
    description: "Image or content slider with navigation controls",
    category: "media",
    defaultProps: {
      title: "",
      slides: [
        { imageUrl: "", heading: "Slide 1", description: "First slide description" },
        { imageUrl: "", heading: "Slide 2", description: "Second slide description" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional heading" },
      {
        key: "slides",
        label: "Slides",
        type: "array-items",
        itemSchema: [
          { key: "imageUrl", label: "Image", type: "image-url", placeholder: "Upload slide image" },
          { key: "heading", label: "Heading", type: "text", placeholder: "Slide heading" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Slide description" },
        ],
      },
    ],
  },
  {
    type: "stats-bar",
    label: "Stats Bar",
    iconName: "BarChart3",
    description: "Horizontal row of stats with icons, values, and labels",
    category: "data",
    defaultProps: {
      items: [
        { icon: "Users", value: "1,000+", label: "Active Members" },
        { icon: "Globe", value: "45+", label: "Countries" },
        { icon: "Star", value: "4.9", label: "Average Rating" },
      ],
    },
    propDefs: [
      {
        key: "items",
        label: "Stats",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide)", type: "text", placeholder: "e.g. Users, Globe" },
          { key: "value", label: "Value", type: "text", placeholder: "e.g. 1,000+" },
          { key: "label", label: "Label", type: "text", placeholder: "Stat description" },
        ],
      },
    ],
  },
  {
    type: "icon-grid",
    label: "Icon Grid",
    iconName: "Grid2X2",
    description: "Icon + title cards in a configurable grid",
    category: "content",
    defaultProps: {
      title: "",
      subtitle: "",
      columns: "4",
      items: [
        { icon: "Globe", title: "International" },
        { icon: "Heart", title: "Compassionate" },
        { icon: "Users", title: "Community" },
        { icon: "ShieldCheck", title: "Trusted" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Optional heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      { key: "columns", label: "Columns", type: "select", options: COLUMNS_EXTENDED_OPTIONS },
      {
        key: "items",
        label: "Items",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide)", type: "text", placeholder: "e.g. Globe, Heart" },
          { key: "title", label: "Title", type: "text", placeholder: "Item title" },
        ],
      },
    ],
  },
  {
    type: "benefit-stack",
    label: "Benefit Stack",
    iconName: "ListChecks",
    description: "Benefits list in a stack or timeline layout",
    category: "content",
    defaultProps: {
      title: "Benefits",
      subtitle: "",
      layout: "stack",
      items: [
        { icon: "CheckCircle", title: "Expert Guidance", description: "Work with professionals who specialize in cross-cultural challenges." },
        { icon: "Globe", title: "Global Accessibility", description: "Find support no matter where you are in the world." },
        { icon: "Heart", title: "Cultural Understanding", description: "Be understood without having to explain your background." },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      { key: "layout", label: "Layout", type: "select", options: BENEFIT_LAYOUT_OPTIONS },
      {
        key: "items",
        label: "Benefits",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide)", type: "text", placeholder: "e.g. CheckCircle" },
          { key: "title", label: "Title", type: "text", placeholder: "Benefit title" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Benefit description" },
        ],
      },
    ],
  },
  {
    type: "science-explainer",
    label: "Science Explainer",
    iconName: "FlaskConical",
    description: "Evidence-based content with citations and sources",
    category: "content",
    defaultProps: {
      title: "The Research Behind Our Approach",
      body: "",
      citations: [
        { text: "Core Platform Training Research Study, 2024", url: "" },
      ],
    },
    propDefs: [
      { key: "title", label: "Title", type: "text", placeholder: "Section heading" },
      { key: "body", label: "Content", type: "richtext", placeholder: "Explain the evidence..." },
      {
        key: "citations",
        label: "Citations",
        type: "array-items",
        itemSchema: [
          { key: "text", label: "Citation Text", type: "text", placeholder: "Author, Year, Title" },
          { key: "url", label: "Link (optional)", type: "url", placeholder: "https://..." },
        ],
      },
    ],
  },
  {
    type: "safety-checklist",
    label: "Safety Checklist",
    iconName: "ClipboardCheck",
    description: "Required and optional items with disclaimer",
    category: "content",
    defaultProps: {
      title: "Safety & Quality Standards",
      disclaimer: "",
      items: [
        { text: "Licensed mental health professional", required: true },
        { text: "Cross-cultural training or experience", required: true },
        { text: "Background verification completed", required: true },
        { text: "Specialized in Core Platform-related challenges", required: false },
      ],
    },
    propDefs: [
      { key: "title", label: "Title", type: "text", placeholder: "Section heading" },
      { key: "disclaimer", label: "Disclaimer", type: "textarea", placeholder: "Optional legal disclaimer" },
      {
        key: "items",
        label: "Checklist Items",
        type: "array-items",
        itemSchema: [
          { key: "text", label: "Item Text", type: "text", placeholder: "Checklist item" },
          { key: "required", label: "Required?", type: "boolean" },
        ],
      },
    ],
  },
  {
    type: "guarantee-warranty",
    label: "Guarantee & Assurance",
    iconName: "BadgeCheck",
    description: "Guarantee points with a support CTA",
    category: "conversion",
    defaultProps: {
      title: "Our Commitment to You",
      subtitle: "",
      items: [
        { text: "Every professional is individually vetted and verified" },
        { text: "Your privacy and confidentiality are always protected" },
        { text: "Support team available if you need help finding the right match" },
      ],
      ctaText: "Contact Support",
      ctaLink: "/contact",
      ctaAction: "internal-link",
      ctaOpenInNewTab: false,
      ctaFormSlug: "contact-form",
      ctaModalTitle: "",
      ctaModalDescription: "",
    },
    propDefs: [
      { key: "title", label: "Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      {
        key: "items",
        label: "Guarantee Points",
        type: "array-items",
        itemSchema: [
          { key: "text", label: "Point", type: "text", placeholder: "Guarantee bullet point" },
        ],
      },
      { key: "ctaText", label: "CTA Button Text", type: "text", placeholder: "Button label" },
      { key: "ctaAction", label: "CTA Button Action", type: "select", options: BUTTON_ACTION_OPTIONS },
      { key: "ctaLink", label: "CTA Link", type: "url", placeholder: "/contact" },
      { key: "ctaOpenInNewTab", label: "Open In New Tab", type: "boolean" },
      { key: "ctaFormSlug", label: "Assigned Form", type: "form-select" },
      { key: "ctaModalTitle", label: "Modal Title", type: "text", placeholder: "Optional modal title override" },
      { key: "ctaModalDescription", label: "Modal Description", type: "textarea", placeholder: "Optional modal description" },
    ],
  },
  {
    type: "delivery-setup",
    label: "Process Steps",
    iconName: "Workflow",
    description: "Step-by-step process with optional included items list",
    category: "content",
    defaultProps: {
      title: "How It Works",
      subtitle: "",
      steps: [
        { step: "1", title: "Browse the Directory", description: "Search by specialty, location, or language." },
        { step: "2", title: "Review Profiles", description: "Read about their approach and qualifications." },
        { step: "3", title: "Make Contact", description: "Reach out directly through their profile." },
      ],
      includedItems: [],
    },
    propDefs: [
      { key: "title", label: "Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      {
        key: "steps",
        label: "Steps",
        type: "array-items",
        itemSchema: [
          { key: "step", label: "Step Number/Label", type: "text", placeholder: "e.g. 1, Step A" },
          { key: "title", label: "Title", type: "text", placeholder: "Step title" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Step details" },
        ],
      },
      {
        key: "includedItems",
        label: "What's Included (optional)",
        type: "array-items",
        itemSchema: [
          { key: "text", label: "Item", type: "text", placeholder: "Included item" },
        ],
      },
    ],
  },
  {
    type: "recovery-use-cases",
    label: "Use Cases",
    iconName: "Users",
    description: "Persona-based messaging showing who this is for",
    category: "content",
    defaultProps: {
      title: "Who Is Core Platform For?",
      subtitle: "",
      personas: [
        { title: "Adult Core Platforms", description: "Adults who grew up across cultures and need support navigating identity, belonging, and transitions.", icon: "User" },
        { title: "Expat Families", description: "Parents raising children between cultures who want proactive mental health support.", icon: "Users" },
        { title: "Organizations", description: "Companies and schools supporting internationally mobile employees and students.", icon: "Building2" },
      ],
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      {
        key: "personas",
        label: "Personas",
        type: "array-items",
        itemSchema: [
          { key: "icon", label: "Icon (Lucide)", type: "text", placeholder: "e.g. User, Users" },
          { key: "title", label: "Persona Title", type: "text", placeholder: "e.g. Adult Core Platforms" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Who they are and what they need" },
        ],
      },
    ],
  },
  {
    type: "protocol-builder",
    label: "Protocol Builder",
    iconName: "ListOrdered",
    description: "Step-by-step protocols organized by experience level",
    category: "content",
    defaultProps: {
      title: "Getting Started Guide",
      subtitle: "",
      level: "beginner",
      steps: [
        { title: "Create Your Account", description: "Sign up for free and set your preferences." },
        { title: "Explore the Directory", description: "Use filters to find professionals matching your needs." },
        { title: "Schedule a Session", description: "Contact a professional and book your first appointment." },
      ],
    },
    propDefs: [
      { key: "title", label: "Title", type: "text", placeholder: "Protocol title" },
      { key: "subtitle", label: "Subtitle", type: "text", placeholder: "Optional subtitle" },
      { key: "level", label: "Experience Level", type: "select", options: EXPERIENCE_LEVEL_OPTIONS },
      {
        key: "steps",
        label: "Steps",
        type: "array-items",
        itemSchema: [
          { key: "title", label: "Step Title", type: "text", placeholder: "Step title" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Step details" },
        ],
      },
    ],
  },
];

const FULL_WIDTH_BLOCK_TYPES = new Set([
  "hero",
  "join-hero",
  "join-registration-form",
  "events-archive",
  "video-archives",
  "directory-browser",
  "cta",
  "trust-bar",
  "divider",
  "slider",
  "stats-bar",
]);

export const BLOCK_REGISTRY: BlockDef[] = BASE_BLOCK_REGISTRY.map((block) => {
  const blockWithHeading = withSharedSectionHeading(block);
  if (block.type === "hero") {
    return withSharedVisibility(blockWithHeading);
  }
  return withSharedVisibility(withSharedSectionStyles(blockWithHeading, {
    includeImageControls: true,
    includePaddingControls: !FULL_WIDTH_BLOCK_TYPES.has(block.type),
  }));
});

const BASE_DYNAMIC_BLOCK_TYPES: BlockDef[] = [
  {
    type: "therapist-map",
    label: "Global Therapist Map (Live Data)",
    iconName: "Map",
    description: "Interactive map showing all mental health professionals — populated from live data",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      title: "Our Mental Health Professionals Around the World",
      subtitle: "Click a pin to learn more about a Core Platform-informed professional near you",
    },
    propDefs: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Section heading" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Supporting text" },
    ],
  },
  {
    type: "blog-post-feed",
    label: "Blog Post Feed (Live)",
    iconName: "Rss",
    description: "Paginated blog post grid with search and category filters",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      postsPerPage: 9,
      gridColumns: "3",
      feedStyle: "pagination",
      showSearch: true,
      showCategoryFilter: true,
      showTagFilter: true,
      enableHoverMotion: true,
    },
    propDefs: [
      { key: "postsPerPage", label: "Posts Per Page", type: "number", min: 3, max: 24 },
      { key: "gridColumns", label: "Grid Columns", type: "select", options: COLUMNS_OPTIONS },
      {
        key: "feedStyle",
        label: "Archive Navigation",
        type: "select",
        options: [
          { label: "Pagination", value: "pagination" },
          { label: "Load More", value: "load-more" },
        ],
      },
      { key: "showSearch", label: "Show Search", type: "boolean" },
      { key: "showCategoryFilter", label: "Show Category Filter", type: "boolean" },
      { key: "showTagFilter", label: "Show Tag Filter", type: "boolean" },
      { key: "enableHoverMotion", label: "Enable Hover Motion", type: "boolean" },
    ],
  },
  {
    type: "blog-featured-post",
    label: "Blog Featured Post (Live)",
    iconName: "FileText",
    description: "Large featured blog post card from latest published post",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      layout: "split",
      enableHoverMotion: true,
    },
    propDefs: [
      {
        key: "layout",
        label: "Featured Layout",
        type: "select",
        options: [
          { label: "Split Card", value: "split" },
          { label: "Stacked Card", value: "stacked" },
        ],
      },
      { key: "enableHoverMotion", label: "Enable Hover Motion", type: "boolean" },
    ],
  },
  {
    type: "standard-blog-page",
    label: "Standard Blog Page (Live)",
    iconName: "Newspaper",
    description: "Combined blog archive with filters, featured post, and article feed in one reusable live block",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      layout: "split",
      postsPerPage: 9,
      gridColumns: "3",
      feedStyle: "pagination",
      showSearch: true,
      showCategoryFilter: true,
      showTagFilter: true,
      enableHoverMotion: true,
    },
    propDefs: [
      {
        key: "layout",
        label: "Featured Layout",
        type: "select",
        options: [
          { label: "Split Card", value: "split" },
          { label: "Stacked Card", value: "stacked" },
        ],
      },
      { key: "postsPerPage", label: "Posts Per Page", type: "number", min: 3, max: 24 },
      { key: "gridColumns", label: "Grid Columns", type: "select", options: COLUMNS_OPTIONS },
      {
        key: "feedStyle",
        label: "Archive Navigation",
        type: "select",
        options: [
          { label: "Pagination", value: "pagination" },
          { label: "Load More", value: "load-more" },
        ],
      },
      { key: "showSearch", label: "Show Search", type: "boolean" },
      { key: "showCategoryFilter", label: "Show Category Filter", type: "boolean" },
      { key: "showTagFilter", label: "Show Tag Filter", type: "boolean" },
      { key: "enableHoverMotion", label: "Enable Hover Motion", type: "boolean" },
    ],
  },
  {
    type: "events-archive",
    label: "Events Archive (Live)",
    iconName: "CalendarDays",
    description: "Upcoming events listing with list/calendar views powered by the live events system",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      heading: "Upcoming Events",
      subheading: "We offer quarterly Core Platform-informed trainings for professional providers. All of our members get free registration to the events below.",
      defaultView: "list",
      showViewToggle: true,
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Section heading" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Supporting text" },
      {
        key: "defaultView",
        label: "Default View",
        type: "select",
        options: [
          { label: "List", value: "list" },
          { label: "Calendar", value: "calendar" },
        ],
      },
      { key: "showViewToggle", label: "Show View Toggle", type: "boolean" },
    ],
  },
  {
    type: "video-archives",
    label: "Video Archives (Live)",
    iconName: "Video",
    description: "On-demand recording archive with search and purchase/access controls powered by live event recordings",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      heading: "Video Archives",
      subheading: "Browse our collection of past trainings and webinars.",
      showSearch: true,
      showYearFilter: true,
      showAccessFilter: true,
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Section heading" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Supporting text" },
      { key: "showSearch", label: "Show Search", type: "boolean" },
      { key: "showYearFilter", label: "Show Year Filter", type: "boolean" },
      { key: "showAccessFilter", label: "Show Access Filter", type: "boolean" },
    ],
  },
  {
    type: "directory-browser",
    label: "Professional Directory (Live)",
    iconName: "Map",
    description: "Interactive therapist directory with filters, results, and map powered by the live directory data",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      heading: "Find a Mental Health Professional",
      subheading: "",
      showCategoryChips: true,
      showMap: true,
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Section heading" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Optional supporting text" },
      { key: "showCategoryChips", label: "Show Category Chips", type: "boolean" },
      { key: "showMap", label: "Show Map", type: "boolean" },
    ],
  },
  {
    type: "contact-form",
    label: "Contact Form (Live)",
    iconName: "Mail",
    description: "Contact form with validation and submission — managed automatically",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {},
    propDefs: [],
  },
  {
    type: "form-embed",
    label: "Form Embed",
    iconName: "FileText",
    description: "Reusable form selected from the Forms library, embeddable in pages and widgets",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      formSlug: "contact-form",
    },
    propDefs: [
      { key: "formSlug", label: "Assigned Form", type: "form-select" },
    ],
  },
  {
    type: "join-hero",
    label: "Join Hero (Live)",
    iconName: "UserPlus",
    description: "Join page hero heading for mental health professionals — managed automatically",
    isDynamic: true,
    category: "hero",
    defaultProps: {
      heading: "Are you a Core Platform-Informed Mental Health Professional?",
      accentHeading: "Join the Network!",
      headingColor: "",
      accentHeadingColor: "",
      subheading: "",
      subheadingColor: "",
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Main heading" },
      { key: "accentHeading", label: "Accent Heading", type: "text", placeholder: "Highlighted heading text" },
      { key: "headingColor", label: "Heading Color", type: "color", placeholder: "#ffffff" },
      { key: "accentHeadingColor", label: "Accent Heading Color", type: "color", placeholder: "#89cda1" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Optional supporting text" },
      { key: "subheadingColor", label: "Subheading Color", type: "color", placeholder: "#ffffff" },
    ],
  },
  {
    type: "join-registration-form",
    label: "Join Hero + Application Status (Live)",
    iconName: "UserPlus",
    description: "Combined Join page hero, application status, and member login prompt — managed automatically",
    isDynamic: true,
    category: "dynamic",
    defaultProps: {
      heading: "Are you a Core Platform-Informed Mental Health Professional?",
      accentHeading: "Join the Network!",
      headingColor: "",
      accentHeadingColor: "",
      subheading: "",
      subheadingColor: "",
      applicationStatusText: "Applications open in June.",
      loginPromptPrefix: "If you're already a member click here to",
      loginLinkText: "Log in",
      loginPromptSuffix: "to your profile!",
    },
    propDefs: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Main heading" },
      { key: "accentHeading", label: "Accent Heading", type: "text", placeholder: "Highlighted heading text" },
      { key: "headingColor", label: "Heading Color", type: "color", placeholder: "#ffffff" },
      { key: "accentHeadingColor", label: "Accent Heading Color", type: "color", placeholder: "#89cda1" },
      { key: "subheading", label: "Subheading", type: "textarea", placeholder: "Optional supporting text" },
      { key: "subheadingColor", label: "Subheading Color", type: "color", placeholder: "#ffffff" },
      { key: "applicationStatusText", label: "Button Status Text", type: "text", placeholder: "Applications open in June." },
      { key: "loginPromptPrefix", label: "Login Prompt Prefix", type: "text", placeholder: "If you're already a member click here to" },
      { key: "loginLinkText", label: "Login Link Text", type: "text", placeholder: "Log in" },
      { key: "loginPromptSuffix", label: "Login Prompt Suffix", type: "text", placeholder: "to your profile!" },
    ],
  },
];

export const DYNAMIC_BLOCK_TYPES: BlockDef[] = BASE_DYNAMIC_BLOCK_TYPES.map((block) =>
  withSharedVisibility(withSharedSectionStyles(withSharedSectionHeading(block), {
    includePaddingControls: !FULL_WIDTH_BLOCK_TYPES.has(block.type),
  }))
);

export const ALL_BLOCKS: BlockDef[] = [...BLOCK_REGISTRY, ...DYNAMIC_BLOCK_TYPES];

export function normalizeBlockType(type: string): string {
  return LEGACY_BLOCK_TYPE_ALIASES[type] ?? type;
}

export function getBlockDef(type: string): BlockDef | undefined {
  const normalizedType = normalizeBlockType(type);
  return ALL_BLOCKS.find((b) => b.type === normalizedType);
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
