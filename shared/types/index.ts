export const UserRole = {
  ADMIN: "admin",
  THERAPIST: "therapist",
  CLIENT: "client",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PracticeMode = {
  IN_PERSON: "in_person",
  VIRTUAL: "virtual",
  BOTH: "both",
} as const;
export type PracticeMode = (typeof PracticeMode)[keyof typeof PracticeMode];

export const SubscriptionStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  TRIALING: "trialing",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const DocCategory = {
  GETTING_STARTED: "Getting Started",
  USER_MANAGEMENT: "User Management",
  THERAPIST_MANAGEMENT: "Therapist Management",
  SUBSCRIPTIONS_BILLING: "Subscriptions & Billing",
  DIRECTORY_SEARCH: "Directory & Search",
  EVENTS: "Events",
  API_REFERENCE: "API Reference",
  SYSTEM_ARCHITECTURE: "System Architecture",
} as const;
export type DocCategory = (typeof DocCategory)[keyof typeof DocCategory];

export const SPECIALIZATIONS = [
  "Anxiety",
  "Depression",
  "Trauma & PTSD",
  "Grief & Loss",
  "Identity & Belonging",
  "Cross-Cultural Transitions",
  "Third Culture Kids (TCK)",
  "Expatriate Adjustment",
  "Relationship Issues",
  "Family Therapy",
  "Couples Counseling",
  "Child & Adolescent",
  "Substance Abuse",
  "Eating Disorders",
  "Career Counseling",
  "Mindfulness & Meditation",
  "CBT",
  "EMDR",
  "Art Therapy",
  "Play Therapy",
  "Group Therapy",
] as const;

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
  "Korean",
  "Arabic",
  "Portuguese",
  "Hindi",
  "Dutch",
  "Italian",
  "Russian",
  "Swedish",
  "Thai",
  "Tagalog",
  "Swahili",
] as const;
