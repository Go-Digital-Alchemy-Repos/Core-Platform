import { logger } from "../utils/logger";

type NullableString = string | null | undefined;

export interface TherapistLocationFields {
  addressLine1?: NullableString;
  addressLine2?: NullableString;
  city?: NullableString;
  state?: NullableString;
  country?: NullableString;
  zipCode?: NullableString;
  latitude?: NullableString;
  longitude?: NullableString;
}

interface GeocodedCoordinates {
  latitude: string;
  longitude: string;
}

interface NominatimSearchResult {
  lat?: string;
  lon?: string;
}

const ADDRESS_KEYS = [
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "country",
  "zipCode",
] as const;

function trimOptional(value: NullableString): string | null {
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildAddressParts(data: TherapistLocationFields): string[] {
  return ADDRESS_KEYS
    .map((key) => trimOptional(data[key]))
    .filter((part): part is string => !!part);
}

function hasAddress(data: TherapistLocationFields): boolean {
  return buildAddressParts(data).length > 0;
}

function addressFieldsChanged(input: TherapistLocationFields): boolean {
  return ADDRESS_KEYS.some((key) => key in input);
}

function hasExplicitCoordinates(input: TherapistLocationFields): boolean {
  return "latitude" in input || "longitude" in input;
}

async function geocodeAddress(data: TherapistLocationFields): Promise<GeocodedCoordinates | null> {
  const addressParts = buildAddressParts(data);
  if (addressParts.length === 0) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", addressParts.join(", "));

  const userAgent = "Core-Platform/1.0 (support@coreplatform.org)";
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed with ${response.status}`);
  }

  const results = (await response.json()) as NominatimSearchResult[];
  const first = results[0];
  if (!first?.lat || !first?.lon) return null;

  return {
    latitude: first.lat,
    longitude: first.lon,
  };
}

export async function enrichTherapistLocationFields<T extends TherapistLocationFields>(
  input: T,
  existing?: TherapistLocationFields | null,
): Promise<T> {
  if (hasExplicitCoordinates(input)) {
    return {
      ...input,
      latitude: trimOptional(input.latitude),
      longitude: trimOptional(input.longitude),
    };
  }

  const merged = {
    ...(existing ?? {}),
    ...input,
  };

  if (!hasAddress(merged)) {
    if (addressFieldsChanged(input) || existing?.latitude != null || existing?.longitude != null) {
      return {
        ...input,
        latitude: null,
        longitude: null,
      };
    }
    return input;
  }

  const shouldGeocode =
    !existing ||
    addressFieldsChanged(input) ||
    existing.latitude == null ||
    existing.longitude == null;

  if (!shouldGeocode) {
    return input;
  }

  try {
    const coords = await geocodeAddress(merged);
    if (!coords) {
      logger.app.warn("No geocoding results for therapist address", {
        address: buildAddressParts(merged).join(", "),
      });
      return {
        ...input,
        latitude: null,
        longitude: null,
      };
    }

    return {
      ...input,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  } catch (error) {
    logger.app.warn("Failed to geocode therapist address", {
      error: error instanceof Error ? error.message : String(error),
      address: buildAddressParts(merged).join(", "),
    });

    if (addressFieldsChanged(input)) {
      return {
        ...input,
        latitude: null,
        longitude: null,
      };
    }

    return input;
  }
}
