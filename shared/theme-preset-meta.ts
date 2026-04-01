export interface ThemePresetMeta {
  id: string;
  name: string;
  description: string;
  preview: { bg: string; primary: string; accent: string };
}

export const THEME_PRESET_META: ThemePresetMeta[] = [
  { id: "tck-default", name: "TCK Default", description: "The original TCK Wellness brand palette with Navy, Sage, Copper, and Teal", preview: { bg: "#FAF8F5", primary: "#1F2A44", accent: "#3B8A80" } },
  { id: "ocean-blue", name: "Ocean Blue", description: "Deep sea blues with fresh aqua accents — calming and professional", preview: { bg: "#F0F5FA", primary: "#1B3A5C", accent: "#2196A6" } },
  { id: "midnight", name: "Midnight", description: "Dark-first design with purple highlights — elegant and modern", preview: { bg: "#0F0F1A", primary: "#7C3AED", accent: "#A78BFA" } },
  { id: "minimal-light", name: "Minimal Light", description: "Ultra-clean whites and grays with black text — swiss design inspired", preview: { bg: "#FFFFFF", primary: "#111111", accent: "#666666" } },
  { id: "contrast-pro", name: "Contrast Pro", description: "High contrast black and white with bright blue accents — accessible and bold", preview: { bg: "#FAFAFA", primary: "#000000", accent: "#2563EB" } },
  { id: "warm-neutral", name: "Warm Neutral", description: "Earthy warm tones with terracotta accents — inviting and grounded", preview: { bg: "#FAF7F2", primary: "#3D2E1F", accent: "#C06535" } },
  { id: "slate-blue", name: "Slate & Blue", description: "Cool slate grays with steel blue highlights — corporate and trustworthy", preview: { bg: "#F4F6F8", primary: "#334155", accent: "#3B82F6" } },
  { id: "frost", name: "Frost", description: "Icy blues and soft silvers — light, airy, and refreshing", preview: { bg: "#F0F8FF", primary: "#1E40AF", accent: "#60A5FA" } },
  { id: "charcoal-gold", name: "Charcoal Gold", description: "Deep charcoal base with gold and amber accents — luxury and premium feel", preview: { bg: "#F5F3EF", primary: "#292524", accent: "#D97706" } },
  { id: "clean-clinical", name: "Clean Clinical", description: "Professional healthcare whites with soft teal — clinical and trustworthy", preview: { bg: "#FAFCFD", primary: "#0F766E", accent: "#14B8A6" } },
  { id: "energetic-blue-pop", name: "Energetic Blue Pop", description: "Vibrant electric blue with energetic accents — youthful and dynamic", preview: { bg: "#F5F7FF", primary: "#4F46E5", accent: "#F59E0B" } },
];
