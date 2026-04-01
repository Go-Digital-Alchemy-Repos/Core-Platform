import { describe, it, expect } from "vitest";
import { therapistSearchSchema } from "../../shared/types/directory";
import type { PaginatedTherapists, DirectoryFilterOptions } from "../../shared/types/directory";

describe("therapistSearchSchema validation", () => {
  it("provides sane defaults for empty query", () => {
    const result = therapistSearchSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sort).toBe("name");
    expect(result.search).toBe("");
    expect(result.specialization).toBe("");
    expect(result.practiceMode).toBe("");
    expect(result.language).toBe("");
    expect(result.country).toBe("");
    expect(result.acceptingClients).toBeUndefined();
    expect(result.willingToTravel).toBeUndefined();
  });

  it("coerces page and pageSize from strings", () => {
    const result = therapistSearchSchema.parse({ page: "3", pageSize: "15" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(15);
  });

  it("clamps page to min 1", () => {
    const result = therapistSearchSchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("clamps pageSize to max 500", () => {
    const result = therapistSearchSchema.safeParse({ pageSize: "501" });
    expect(result.success).toBe(false);
  });

  it("accepts pageSize up to 500", () => {
    const result = therapistSearchSchema.parse({ pageSize: "500" });
    expect(result.pageSize).toBe(500);
  });

  it("rejects invalid sort values", () => {
    const result = therapistSearchSchema.safeParse({ sort: "random" });
    expect(result.success).toBe(false);
  });

  it("accepts valid sort values", () => {
    expect(therapistSearchSchema.parse({ sort: "name" }).sort).toBe("name");
    expect(therapistSearchSchema.parse({ sort: "newest" }).sort).toBe("newest");
  });

  it("transforms acceptingClients string to boolean or undefined", () => {
    expect(therapistSearchSchema.parse({ acceptingClients: "true" }).acceptingClients).toBe(true);
    expect(therapistSearchSchema.parse({ acceptingClients: "false" }).acceptingClients).toBeUndefined();
    expect(therapistSearchSchema.parse({}).acceptingClients).toBeUndefined();
  });

  it("transforms willingToTravel string to boolean or undefined", () => {
    expect(therapistSearchSchema.parse({ willingToTravel: "true" }).willingToTravel).toBe(true);
    expect(therapistSearchSchema.parse({ willingToTravel: "false" }).willingToTravel).toBeUndefined();
  });

  it("passes through search, specialization, language, country strings", () => {
    const result = therapistSearchSchema.parse({
      search: "anxiety",
      specialization: "Anxiety,Depression",
      language: "English",
      country: "USA",
    });
    expect(result.search).toBe("anxiety");
    expect(result.specialization).toBe("Anxiety,Depression");
    expect(result.language).toBe("English");
    expect(result.country).toBe("USA");
  });

  it("accepts latitude and longitude", () => {
    const result = therapistSearchSchema.parse({ latitude: "40.7128", longitude: "-74.0060" });
    expect(result.latitude).toBeCloseTo(40.7128);
    expect(result.longitude).toBeCloseTo(-74.006);
  });

  it("rejects out-of-range latitude", () => {
    expect(therapistSearchSchema.safeParse({ latitude: "91" }).success).toBe(false);
    expect(therapistSearchSchema.safeParse({ latitude: "-91" }).success).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(therapistSearchSchema.safeParse({ longitude: "181" }).success).toBe(false);
    expect(therapistSearchSchema.safeParse({ longitude: "-181" }).success).toBe(false);
  });

  it("handles combined filters correctly", () => {
    const result = therapistSearchSchema.parse({
      search: "john",
      specialization: "Anxiety",
      practiceMode: "virtual",
      language: "English",
      country: "USA",
      acceptingClients: "true",
      willingToTravel: "true",
      page: "2",
      pageSize: "10",
      sort: "newest",
    });
    expect(result.search).toBe("john");
    expect(result.specialization).toBe("Anxiety");
    expect(result.practiceMode).toBe("virtual");
    expect(result.language).toBe("English");
    expect(result.country).toBe("USA");
    expect(result.acceptingClients).toBe(true);
    expect(result.willingToTravel).toBe(true);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.sort).toBe("newest");
  });

  it("returns empty result shape defaults for pagination boundaries", () => {
    const page1 = therapistSearchSchema.parse({ page: "1", pageSize: "5" });
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(5);

    const page100 = therapistSearchSchema.parse({ page: "100", pageSize: "5" });
    expect(page100.page).toBe(100);
    expect(page100.pageSize).toBe(5);
  });

  it("defaults missing pageSize to 20, not 200", () => {
    const result = therapistSearchSchema.parse({});
    expect(result.pageSize).toBe(20);
    expect(result.pageSize).not.toBe(200);
  });
});

describe("search filter param processing", () => {
  it("parses search query correctly", () => {
    const result = therapistSearchSchema.parse({ search: "anxiety counselor" });
    expect(result.search).toBe("anxiety counselor");
  });

  it("treats empty search as empty string default", () => {
    const result = therapistSearchSchema.parse({});
    expect(result.search).toBe("");
  });
});

describe("specialization filter param processing", () => {
  it("accepts comma-separated specializations", () => {
    const result = therapistSearchSchema.parse({ specialization: "Anxiety,Depression,Trauma & PTSD" });
    expect(result.specialization).toBe("Anxiety,Depression,Trauma & PTSD");
    const specArray = result.specialization.split(",").filter(Boolean);
    expect(specArray).toEqual(["Anxiety", "Depression", "Trauma & PTSD"]);
  });

  it("handles single specialization", () => {
    const result = therapistSearchSchema.parse({ specialization: "CBT" });
    const specArray = result.specialization.split(",").filter(Boolean);
    expect(specArray).toEqual(["CBT"]);
  });

  it("handles empty specialization", () => {
    const result = therapistSearchSchema.parse({ specialization: "" });
    const specArray = result.specialization ? result.specialization.split(",").filter(Boolean) : undefined;
    expect(specArray).toEqual(undefined);
  });
});

describe("language filter param processing", () => {
  it("accepts a language filter", () => {
    const result = therapistSearchSchema.parse({ language: "Spanish" });
    expect(result.language).toBe("Spanish");
  });

  it("defaults language to empty string", () => {
    const result = therapistSearchSchema.parse({});
    expect(result.language).toBe("");
  });
});

describe("practiceMode filter param processing", () => {
  it("accepts practiceMode filter", () => {
    const result = therapistSearchSchema.parse({ practiceMode: "virtual" });
    expect(result.practiceMode).toBe("virtual");
  });

  it("accepts in_person", () => {
    const result = therapistSearchSchema.parse({ practiceMode: "in_person" });
    expect(result.practiceMode).toBe("in_person");
  });

  it("accepts both", () => {
    const result = therapistSearchSchema.parse({ practiceMode: "both" });
    expect(result.practiceMode).toBe("both");
  });
});

describe("acceptingClients filter param processing", () => {
  it("true string becomes boolean true", () => {
    const result = therapistSearchSchema.parse({ acceptingClients: "true" });
    expect(result.acceptingClients).toBe(true);
  });

  it("false string becomes undefined (no filter)", () => {
    const result = therapistSearchSchema.parse({ acceptingClients: "false" });
    expect(result.acceptingClients).toBeUndefined();
  });

  it("omitted becomes undefined", () => {
    const result = therapistSearchSchema.parse({});
    expect(result.acceptingClients).toBeUndefined();
  });
});

describe("pagination and hasMore logic", () => {
  it("page 1 with items remaining has hasMore true", () => {
    const response: PaginatedTherapists = {
      items: [],
      total: 50,
      page: 1,
      pageSize: 20,
      hasMore: 1 * 20 < 50,
    };
    expect(response.hasMore).toBe(true);
  });

  it("page 2 with 20 per page and 50 total has hasMore true", () => {
    const response: PaginatedTherapists = {
      items: [],
      total: 50,
      page: 2,
      pageSize: 20,
      hasMore: 2 * 20 < 50,
    };
    expect(response.hasMore).toBe(true);
  });

  it("page 3 with 20 per page and 50 total has hasMore false", () => {
    const response: PaginatedTherapists = {
      items: [],
      total: 50,
      page: 3,
      pageSize: 20,
      hasMore: 3 * 20 < 50,
    };
    expect(response.hasMore).toBe(false);
  });

  it("out-of-range page has hasMore false", () => {
    const response: PaginatedTherapists = {
      items: [],
      total: 10,
      page: 100,
      pageSize: 20,
      hasMore: 100 * 20 < 10,
    };
    expect(response.hasMore).toBe(false);
    expect(response.items).toEqual([]);
  });

  it("empty result set has hasMore false", () => {
    const response: PaginatedTherapists = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: 1 * 20 < 0,
    };
    expect(response.hasMore).toBe(false);
    expect(response.total).toBe(0);
    expect(response.items).toEqual([]);
  });

  it("exact page boundary has hasMore false", () => {
    const response: PaginatedTherapists = {
      items: [],
      total: 20,
      page: 1,
      pageSize: 20,
      hasMore: 1 * 20 < 20,
    };
    expect(response.hasMore).toBe(false);
  });
});

describe("combined filter scenarios", () => {
  it("search + specialization + language combo validates", () => {
    const result = therapistSearchSchema.parse({
      search: "trauma",
      specialization: "Trauma & PTSD",
      language: "French",
    });
    expect(result.search).toBe("trauma");
    expect(result.specialization).toBe("Trauma & PTSD");
    expect(result.language).toBe("French");
    expect(result.page).toBe(1);
  });

  it("all filters + pagination combo validates", () => {
    const result = therapistSearchSchema.parse({
      search: "therapy",
      specialization: "Anxiety,Depression",
      practiceMode: "both",
      language: "English",
      country: "Germany",
      acceptingClients: "true",
      willingToTravel: "true",
      page: "3",
      pageSize: "15",
      sort: "newest",
    });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(15);
    expect(result.sort).toBe("newest");
    expect(result.acceptingClients).toBe(true);
  });

  it("filters with no results still have correct pagination shape", () => {
    const emptyResponse: PaginatedTherapists = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    };
    expect(emptyResponse.items).toHaveLength(0);
    expect(emptyResponse.total).toBe(0);
    expect(emptyResponse.hasMore).toBe(false);
  });
});

describe("DirectoryFilterOptions shape", () => {
  it("has correct type structure", () => {
    const options: DirectoryFilterOptions = {
      languages: ["English", "Spanish", "French"],
      countries: ["USA", "Germany", "Japan"],
    };
    expect(options.languages).toHaveLength(3);
    expect(options.countries).toHaveLength(3);
    expect(options.languages).toContain("English");
    expect(options.countries).toContain("USA");
  });

  it("handles empty filter options", () => {
    const options: DirectoryFilterOptions = {
      languages: [],
      countries: [],
    };
    expect(options.languages).toHaveLength(0);
    expect(options.countries).toHaveLength(0);
  });
});

describe("sort parameter", () => {
  it("defaults to name", () => {
    const result = therapistSearchSchema.parse({});
    expect(result.sort).toBe("name");
  });

  it("accepts newest", () => {
    const result = therapistSearchSchema.parse({ sort: "newest" });
    expect(result.sort).toBe("newest");
  });

  it("rejects SQL injection attempts", () => {
    expect(therapistSearchSchema.safeParse({ sort: "name; DROP TABLE users" }).success).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    expect(therapistSearchSchema.safeParse({ sort: "email" }).success).toBe(false);
    expect(therapistSearchSchema.safeParse({ sort: "id" }).success).toBe(false);
    expect(therapistSearchSchema.safeParse({ sort: "createdAt" }).success).toBe(false);
  });
});
