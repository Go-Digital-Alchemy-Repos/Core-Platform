import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { storage } from "../storage";
import { specializations } from "@shared/schema/specializations";
import { therapistProfiles, users } from "@shared/schema";
import {
  DIRECTORY_LABEL_PRESETS,
  type DirectoryMode,
} from "@shared/types/directory-settings";

type DemoListing = {
  mode: DirectoryMode;
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  specializations: string[];
  languages: string[];
  credentials: string;
  licenseNumber: string;
  practiceMode: "in_person" | "virtual" | "both";
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  latitude: string | null;
  longitude: string | null;
  phone: string | null;
  website: string | null;
  profileImageUrl: string;
};

const demoListings: DemoListing[] = [
  {
    mode: "real_estate",
    firstName: "Avery",
    lastName: "Morgan",
    title: "Residential Real Estate Advisor",
    bio: "Demo real estate listing for buyer representation, neighborhood guidance, and residential sales consultations.",
    specializations: ["Residential Sales", "Buyer Representation", "Neighborhood Guidance"],
    languages: ["English"],
    credentials: "Luxury residential specialist, relocation advisor",
    licenseNumber: "MLS-DEMO-1001",
    practiceMode: "both",
    addressLine1: "350 5th Ave",
    city: "New York",
    state: "NY",
    country: "United States",
    zipCode: "10118",
    latitude: "40.7484",
    longitude: "-73.9857",
    phone: "+1 (212) 555-0101",
    website: "https://example.com/avery-morgan",
    profileImageUrl: "/avatars/avatar-01.webp",
  },
  {
    mode: "real_estate",
    firstName: "Elena",
    lastName: "Santos",
    title: "Relocation Services Advisor",
    bio: "Demo advisor profile for international relocation, school-zone research, and move-ready property searches.",
    specializations: ["Relocation Planning", "Neighborhood Guidance", "Luxury Leasing"],
    languages: ["English", "Spanish"],
    credentials: "Certified relocation specialist",
    licenseNumber: "MLS-DEMO-1002",
    practiceMode: "both",
    addressLine1: "10 Downing St",
    city: "London",
    state: null,
    country: "United Kingdom",
    zipCode: "SW1A 2AA",
    latitude: "51.5034",
    longitude: "-0.1276",
    phone: "+44 20 5555 0102",
    website: "https://example.com/elena-santos",
    profileImageUrl: "/avatars/avatar-03.webp",
  },
  {
    mode: "real_estate",
    firstName: "Jordan",
    lastName: "Lee",
    title: "Commercial Property Specialist",
    bio: "Demo commercial listing profile for site selection, tenant representation, and mixed-use leasing.",
    specializations: ["Commercial Leasing", "Site Selection", "Investment Properties"],
    languages: ["English", "Korean"],
    credentials: "CCIM candidate, tenant representation",
    licenseNumber: "MLS-DEMO-1003",
    practiceMode: "both",
    addressLine1: "701 5th Ave",
    city: "Seattle",
    state: "WA",
    country: "United States",
    zipCode: "98104",
    latitude: "47.6040",
    longitude: "-122.3307",
    phone: "+1 (206) 555-0103",
    website: "https://example.com/jordan-lee",
    profileImageUrl: "/avatars/avatar-05.webp",
  },
  {
    mode: "real_estate",
    firstName: "Maya",
    lastName: "Patel",
    title: "Luxury Leasing Consultant",
    bio: "Demo property consultant profile for luxury rentals, investor relations, and private showing coordination.",
    specializations: ["Luxury Leasing", "Open Houses", "Investor Relations"],
    languages: ["English", "Hindi", "Gujarati"],
    credentials: "Luxury leasing advisor",
    licenseNumber: "MLS-DEMO-1004",
    practiceMode: "both",
    addressLine1: "801 Brickell Ave",
    city: "Miami",
    state: "FL",
    country: "United States",
    zipCode: "33131",
    latitude: "25.7650",
    longitude: "-80.1900",
    phone: "+1 (305) 555-0105",
    website: "https://example.com/maya-patel",
    profileImageUrl: "/avatars/avatar-07.webp",
  },
  {
    mode: "real_estate",
    firstName: "Noah",
    lastName: "Bennett",
    title: "Investment Property Advisor",
    bio: "Demo advisor profile for income properties, portfolio analysis, and investor tours.",
    specializations: ["Investment Properties", "Portfolio Analysis", "Residential Sales"],
    languages: ["English"],
    credentials: "Investor-focused buyer representation",
    licenseNumber: "MLS-DEMO-1005",
    practiceMode: "both",
    addressLine1: "401 Congress Ave",
    city: "Austin",
    state: "TX",
    country: "United States",
    zipCode: "78701",
    latitude: "30.2638",
    longitude: "-97.7431",
    phone: "+1 (512) 555-0105",
    website: "https://example.com/noah-bennett",
    profileImageUrl: "/avatars/avatar-08.webp",
  },
  {
    mode: "real_estate",
    firstName: "Camila",
    lastName: "Rossi",
    title: "New Development Specialist",
    bio: "Demo listing profile for pre-construction inventory, model-home tours, and developer relationships.",
    specializations: ["New Developments", "Luxury Leasing", "Open Houses"],
    languages: ["English", "Italian"],
    credentials: "New development sales advisor",
    licenseNumber: "MLS-DEMO-1006",
    practiceMode: "in_person",
    addressLine1: "Via Monte Napoleone 8",
    city: "Milan",
    state: null,
    country: "Italy",
    zipCode: "20121",
    latitude: "45.4682",
    longitude: "9.1957",
    phone: "+39 02 5555 0106",
    website: "https://example.com/camila-rossi",
    profileImageUrl: "/avatars/avatar-10.webp",
  },
  {
    mode: "real_estate",
    firstName: "Ethan",
    lastName: "Brooks",
    title: "Vacation Home Consultant",
    bio: "Demo advisor profile for second homes, short-term rental readiness, and resort market comparisons.",
    specializations: ["Vacation Homes", "Investment Properties", "Buyer Representation"],
    languages: ["English"],
    credentials: "Resort and second-home specialist",
    licenseNumber: "MLS-DEMO-1007",
    practiceMode: "both",
    addressLine1: "1300 Ocean Dr",
    city: "Miami Beach",
    state: "FL",
    country: "United States",
    zipCode: "33139",
    latitude: "25.7840",
    longitude: "-80.1300",
    phone: "+1 (305) 555-0107",
    website: "https://example.com/ethan-brooks",
    profileImageUrl: "/avatars/avatar-12.webp",
  },
  {
    mode: "real_estate",
    firstName: "Lina",
    lastName: "Kowalski",
    title: "Urban Leasing Advisor",
    bio: "Demo leasing profile for apartment searches, furnished rentals, and neighborhood comparisons.",
    specializations: ["Luxury Leasing", "Furnished Rentals", "Neighborhood Guidance"],
    languages: ["English", "Polish"],
    credentials: "Urban rental market advisor",
    licenseNumber: "MLS-DEMO-1008",
    practiceMode: "both",
    addressLine1: "Marszalkowska 99",
    city: "Warsaw",
    state: null,
    country: "Poland",
    zipCode: "00-693",
    latitude: "52.2297",
    longitude: "21.0122",
    phone: "+48 22 555 0108",
    website: "https://example.com/lina-kowalski",
    profileImageUrl: "/avatars/avatar-14.webp",
  },
  {
    mode: "real_estate",
    firstName: "Owen",
    lastName: "Price",
    title: "Land and Estate Broker",
    bio: "Demo broker profile for estate parcels, acreage, rural homes, and private showings.",
    specializations: ["Land", "Estate Properties", "Private Showings"],
    languages: ["English"],
    credentials: "Land and estate sales",
    licenseNumber: "MLS-DEMO-1009",
    practiceMode: "in_person",
    addressLine1: "1 King St W",
    city: "Toronto",
    state: "ON",
    country: "Canada",
    zipCode: "M5H 1A1",
    latitude: "43.6487",
    longitude: "-79.3780",
    phone: "+1 (416) 555-0109",
    website: "https://example.com/owen-price",
    profileImageUrl: "/avatars/avatar-16.webp",
  },
  {
    mode: "real_estate",
    firstName: "Zara",
    lastName: "Hassan",
    title: "International Buyer Agent",
    bio: "Demo buyer-agent profile for cross-border purchases, relocation timelines, and remote tours.",
    specializations: ["International Buyers", "Relocation Planning", "Virtual Tours"],
    languages: ["English", "Arabic"],
    credentials: "Cross-border buyer representation",
    licenseNumber: "MLS-DEMO-1010",
    practiceMode: "both",
    addressLine1: "Sheikh Zayed Rd",
    city: "Dubai",
    state: null,
    country: "UAE",
    zipCode: null,
    latitude: "25.2048",
    longitude: "55.2708",
    phone: "+971 4 555 0110",
    website: "https://example.com/zara-hassan",
    profileImageUrl: "/avatars/avatar-18.webp",
  },
  {
    mode: "real_estate",
    firstName: "Henry",
    lastName: "Walsh",
    title: "Historic Homes Specialist",
    bio: "Demo property advisor profile for heritage homes, preservation requirements, and renovation planning.",
    specializations: ["Historic Homes", "Renovation Planning", "Residential Sales"],
    languages: ["English"],
    credentials: "Historic property specialist",
    licenseNumber: "MLS-DEMO-1011",
    practiceMode: "both",
    addressLine1: "42 Beacon St",
    city: "Boston",
    state: "MA",
    country: "United States",
    zipCode: "02108",
    latitude: "42.3588",
    longitude: "-71.0636",
    phone: "+1 (617) 555-0111",
    website: "https://example.com/henry-walsh",
    profileImageUrl: "/avatars/avatar-20.webp",
  },
  {
    mode: "real_estate",
    firstName: "Iris",
    lastName: "Tan",
    title: "Condo Market Advisor",
    bio: "Demo condo specialist profile for building comparisons, HOA review, and downtown buyer tours.",
    specializations: ["Condos", "Buyer Representation", "Market Comparisons"],
    languages: ["English", "Mandarin"],
    credentials: "Condo and urban market specialist",
    licenseNumber: "MLS-DEMO-1012",
    practiceMode: "both",
    addressLine1: "6 Raffles Quay",
    city: "Singapore",
    state: null,
    country: "Singapore",
    zipCode: "048580",
    latitude: "1.2838",
    longitude: "103.8514",
    phone: "+65 6555 0112",
    website: "https://example.com/iris-tan",
    profileImageUrl: "/avatars/avatar-22.webp",
  },
  {
    mode: "locations",
    firstName: "Brookside",
    lastName: "Flagship",
    title: "Retail Store Location",
    bio: "Demo location listing for a flagship retail branch with showroom visits, pickup, and personal shopping.",
    specializations: ["Retail Pickup", "Personal Shopping", "Showroom"],
    languages: [],
    credentials: "Curbside pickup, showroom, alterations",
    licenseNumber: "STORE-DEMO-2001",
    practiceMode: "in_person",
    addressLine1: "1100 Congress Ave",
    city: "Austin",
    state: "TX",
    country: "United States",
    zipCode: "78701",
    latitude: "30.2747",
    longitude: "-97.7404",
    phone: "+1 (512) 555-0201",
    website: "https://example.com/brookside-flagship",
    profileImageUrl: "/avatars/avatar-09.webp",
  },
  {
    mode: "locations",
    firstName: "Harbor",
    lastName: "Clinic",
    title: "Wellness Service Location",
    bio: "Demo service-location listing for wellness visits, group sessions, and community programming.",
    specializations: ["Wellness Visits", "Group Sessions", "Private Rooms"],
    languages: ["English", "French"],
    credentials: "Accessible rooms, group studio, parking",
    licenseNumber: "LOC-DEMO-2002",
    practiceMode: "both",
    addressLine1: "100 Queens Quay W",
    city: "Toronto",
    state: "ON",
    country: "Canada",
    zipCode: "M5J 2N1",
    latitude: "43.6407",
    longitude: "-79.3806",
    phone: "+1 (416) 555-0202",
    website: "https://example.com/harbor-clinic",
    profileImageUrl: "/avatars/avatar-11.webp",
  },
  {
    mode: "locations",
    firstName: "Northstar",
    lastName: "Depot",
    title: "Service Branch",
    bio: "Demo branch listing for repair intake, field-service dispatch, and customer support appointments.",
    specializations: ["Repair Services", "Mobile Service", "Consultations"],
    languages: ["English"],
    credentials: "Repair counter, field dispatch, same-day appointments",
    licenseNumber: "BRANCH-DEMO-2003",
    practiceMode: "both",
    addressLine1: "200 S Biscayne Blvd",
    city: "Miami",
    state: "FL",
    country: "United States",
    zipCode: "33131",
    latitude: "25.7710",
    longitude: "-80.1889",
    phone: "+1 (305) 555-0203",
    website: "https://example.com/northstar-depot",
    profileImageUrl: "/avatars/avatar-13.webp",
  },
  {
    mode: "service_providers",
    firstName: "Priya",
    lastName: "Nair",
    title: "Executive Coach",
    bio: "Demo service-provider profile for leadership coaching, founder support, and strategic planning workshops.",
    specializations: ["Executive Coaching", "Leadership Workshops", "Strategic Planning"],
    languages: ["English", "Hindi"],
    credentials: "ICF PCC, MBA",
    licenseNumber: "COACH-DEMO-3001",
    practiceMode: "virtual",
    addressLine1: null,
    city: null,
    state: null,
    country: null,
    zipCode: null,
    latitude: null,
    longitude: null,
    phone: "+1 (555) 555-0301",
    website: "https://example.com/priya-nair",
    profileImageUrl: "/avatars/avatar-15.webp",
  },
  {
    mode: "service_providers",
    firstName: "Marcus",
    lastName: "Reed",
    title: "Implementation Consultant",
    bio: "Demo provider profile for onboarding, process design, staff training, and operational audits.",
    specializations: ["Implementation", "Training", "Operations Consulting"],
    languages: ["English"],
    credentials: "PMP, Lean Six Sigma Green Belt",
    licenseNumber: "CONSULT-DEMO-3002",
    practiceMode: "both",
    addressLine1: "1 Market St",
    city: "San Francisco",
    state: "CA",
    country: "United States",
    zipCode: "94105",
    latitude: "37.7936",
    longitude: "-122.3950",
    phone: "+1 (415) 555-0302",
    website: "https://example.com/marcus-reed",
    profileImageUrl: "/avatars/avatar-17.webp",
  },
  {
    mode: "service_providers",
    firstName: "Sofia",
    lastName: "Klein",
    title: "Brand Strategy Partner",
    bio: "Demo agency-style provider profile for positioning, messaging, campaign planning, and launch strategy.",
    specializations: ["Brand Strategy", "Messaging", "Campaign Planning"],
    languages: ["English", "German"],
    credentials: "Brand strategist, workshop facilitator",
    licenseNumber: "AGENCY-DEMO-3003",
    practiceMode: "both",
    addressLine1: "Unter den Linden 1",
    city: "Berlin",
    state: null,
    country: "Germany",
    zipCode: "10117",
    latitude: "52.5170",
    longitude: "13.3889",
    phone: "+49 30 5555 0303",
    website: "https://example.com/sofia-klein",
    profileImageUrl: "/avatars/avatar-19.webp",
  },
  {
    mode: "therapists",
    firstName: "Sarah",
    lastName: "Chen",
    title: "Licensed Clinical Psychologist",
    bio: "Demo therapist profile for cross-cultural identity, anxiety, belonging, and globally mobile families.",
    specializations: ["Anxiety", "Identity & Belonging", "Cross-Cultural Transitions"],
    languages: ["English", "Mandarin"],
    credentials: "PhD Clinical Psychology, Licensed Psychologist",
    licenseNumber: "PSY-DEMO-4001",
    practiceMode: "both",
    addressLine1: "123 Wellness Center Dr",
    city: "San Francisco",
    state: "CA",
    country: "United States",
    zipCode: "94102",
    latitude: "37.7749",
    longitude: "-122.4194",
    phone: "+1 (415) 555-0401",
    website: "https://example.com/sarah-chen",
    profileImageUrl: "/avatars/avatar-21.webp",
  },
  {
    mode: "therapists",
    firstName: "James",
    lastName: "Okonkwo",
    title: "Family Support Specialist",
    bio: "Demo provider profile for relocation support, grief support, family transitions, and community navigation.",
    specializations: ["Family Support", "Grief & Loss", "Expatriate Adjustment"],
    languages: ["English", "French", "Swahili"],
    credentials: "MA Family Support, Certified Family Specialist",
    licenseNumber: "LMFT-DEMO-4002",
    practiceMode: "virtual",
    addressLine1: null,
    city: null,
    state: null,
    country: null,
    zipCode: null,
    latitude: null,
    longitude: null,
    phone: "+1 (555) 555-0402",
    website: "https://example.com/james-okonkwo",
    profileImageUrl: "/avatars/avatar-23.webp",
  },
  {
    mode: "therapists",
    firstName: "Maria",
    lastName: "Gonzalez",
    title: "Community Wellness Professional",
    bio: "Demo provider profile for trauma-informed support, mindfulness, wellbeing, and bicultural identity.",
    specializations: ["Trauma-Informed Support", "Wellbeing", "Mindfulness"],
    languages: ["English", "Spanish"],
    credentials: "MS Community Wellness, Certified Support Professional",
    licenseNumber: "LPC-DEMO-4003",
    practiceMode: "both",
    addressLine1: "456 Global Wellness Suite",
    city: "New York",
    state: "NY",
    country: "United States",
    zipCode: "10001",
    latitude: "40.7128",
    longitude: "-74.0060",
    phone: "+1 (212) 555-0403",
    website: "https://example.com/maria-gonzalez",
    profileImageUrl: "/avatars/avatar-25.webp",
  },
];

async function upsertDirectorySetting(key: string, value: string) {
  await storage.settings.upsertSetting(key, value, "directory_settings", false);
}

async function applyPreset(mode: DirectoryMode) {
  const preset = DIRECTORY_LABEL_PRESETS[mode];
  await upsertDirectorySetting("directory_mode", mode);
  await upsertDirectorySetting("directory_label_singular", preset.directoryLabelSingular);
  await upsertDirectorySetting("directory_label_plural", preset.directoryLabelPlural);
  await upsertDirectorySetting("listing_label_singular", preset.listingLabelSingular);
  await upsertDirectorySetting("listing_label_plural", preset.listingLabelPlural);
  await upsertDirectorySetting("participant_label_singular", preset.participantLabelSingular);
  await upsertDirectorySetting("participant_label_plural", preset.participantLabelPlural);
  await upsertDirectorySetting("specialty_label_plural", preset.specialtyLabelPlural);
}

async function seedSpecializations() {
  const categoryNames = Array.from(new Set(demoListings.flatMap((listing) => listing.specializations)));
  for (let i = 0; i < categoryNames.length; i += 1) {
    await db
      .insert(specializations)
      .values({ name: categoryNames[i], sortOrder: 1000 + i })
      .onConflictDoNothing();
  }
}

async function upsertListing(listing: DemoListing, index: number, password: string) {
  const email = `demo-directory-${listing.mode}-${String(index + 1).padStart(2, "0")}@coreplatform.test`;
  const [user] = await db
    .insert(users)
    .values({
      email,
      password,
      firstName: listing.firstName,
      lastName: listing.lastName,
      role: "therapist",
      profileImageUrl: listing.profileImageUrl,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        firstName: listing.firstName,
        lastName: listing.lastName,
        role: "therapist",
        profileImageUrl: listing.profileImageUrl,
        isSuspended: false,
        updatedAt: new Date(),
      },
    })
    .returning();

  const values = {
    userId: user.id,
    directoryMode: listing.mode,
    title: listing.title,
    bio: listing.bio,
    specializations: listing.specializations,
    languages: listing.languages,
    credentials: listing.credentials,
    licenseNumber: listing.licenseNumber,
    practiceMode: listing.practiceMode,
    addressLine1: listing.addressLine1,
    city: listing.city,
    state: listing.state,
    country: listing.country,
    zipCode: listing.zipCode,
    latitude: listing.latitude,
    longitude: listing.longitude,
    phone: listing.phone,
    website: listing.website,
    acceptingClients: true,
    willingToTravel: listing.practiceMode !== "virtual",
    isFeatured: index < 2,
    isApproved: true,
    isActive: true,
  };

  const [existingProfile] = await db
    .select({ id: therapistProfiles.id })
    .from(therapistProfiles)
    .where(eq(therapistProfiles.userId, user.id));

  if (existingProfile) {
    await db
      .update(therapistProfiles)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(therapistProfiles.id, existingProfile.id));
  } else {
    await db.insert(therapistProfiles).values(values);
  }
}

async function main() {
  const targetMode = process.env.DIRECTORY_DEMO_MODE as DirectoryMode | undefined;
  if (targetMode && targetMode in DIRECTORY_LABEL_PRESETS) {
    await applyPreset(targetMode);
    console.log(`Applied ${targetMode} directory preset.`);
  }

  await seedSpecializations();
  const password = await bcrypt.hash("DemoDirectory123!", 12);
  for (let i = 0; i < demoListings.length; i += 1) {
    await upsertListing(demoListings[i], i, password);
  }

  console.log(`Seeded ${demoListings.length} directory demo listings across preset templates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
