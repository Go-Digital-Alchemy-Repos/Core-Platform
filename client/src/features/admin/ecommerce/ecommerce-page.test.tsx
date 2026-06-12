// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import {
  CategoriesTab,
  IntegrationsTab,
  OrdersTab,
  ProductsTab,
  ShippingTab,
} from "@/features/admin/ecommerce/ecommerce-page";

const categories = [
  {
    id: "cat-guides",
    name: "Guides & Workbooks",
    slug: "guides-workbooks",
    description: null,
    parentId: null,
    image: null,
    sortOrder: 0,
    active: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "cat-training",
    name: "Professional Training",
    slug: "professional-training",
    description: "Courses and workshops",
    parentId: "cat-guides",
    image: "https://example.com/training.jpg",
    sortOrder: 1,
    active: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "cat-family",
    name: "Family Resources",
    slug: "family-resources",
    description: null,
    parentId: null,
    image: null,
    sortOrder: 2,
    active: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
];

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

const products = [
  {
    id: "prod-journal",
    name: "Belonging Reflection Journal",
    tagline: "A guided journal",
    description: "Reflective prompts",
    shortDescription: "A concise journal",
    productType: "Digital",
    vendor: "Core Platform",
    price: 2400,
    compareAtPrice: null,
    costPerItem: null,
    taxable: true,
    taxCategory: null,
    featured: true,
    visibility: "online",
    publishedAt: null,
    archivedAt: null,
    salePrice: null,
    status: "published",
    active: true,
    sku: "CP-JOURNAL-001",
    urlSlug: "belonging-reflection-journal",
    primaryImage: null,
    secondaryImages: [],
    features: ["30 prompts"],
    included: ["PDF"],
    tags: ["Journal"],
    metaTitle: "Belonging Reflection Journal",
    metaDescription: null,
    ogImage: null,
    physicalProduct: false,
    requiresShipping: false,
    weight: null,
    weightUnit: "oz",
    length: null,
    width: null,
    height: null,
    dimensionUnit: "in",
    shippingProfile: null,
    fulfillmentType: "merchant",
    badgeText: null,
    categories: [categories[0]],
    variants: [
      {
        id: "var-journal",
        productId: "prod-journal",
        title: "Default",
        sku: "CP-JOURNAL-001",
        barcode: null,
        price: 2400,
        salePrice: null,
        compareAtPrice: null,
        costPerItem: null,
        inventoryQuantity: 0,
        trackInventory: false,
        lowStockThreshold: null,
        allowBackorder: false,
        image: null,
        active: true,
        status: "active",
        isDefault: true,
      },
    ],
    media: [],
  },
];

const shippingProviders = [
  {
    provider: "shipstation",
    displayName: "ShipStation",
    type: "workflow",
    recommendedFor: "Operational shipping workflows.",
    capabilities: ["labels", "tracking"],
    setupFields: [
      { key: "apiKey", label: "API key", secret: true, hasValue: false },
      { key: "apiSecret", label: "API secret", secret: true, hasValue: false },
    ],
    active: false,
    testMode: true,
    connectedAt: null,
    configured: false,
    operational: false,
    readyCapabilities: [],
    missingCredentialLabels: ["API key", "API secret"],
  },
  {
    provider: "easypost",
    displayName: "EasyPost",
    type: "aggregator",
    recommendedFor: "Live carrier rates and labels.",
    capabilities: ["rates", "labels"],
    setupFields: [{ key: "apiKey", label: "API key", secret: true, hasValue: true }],
    active: false,
    testMode: true,
    connectedAt: null,
    configured: true,
    operational: false,
    readyCapabilities: [],
    missingCredentialLabels: [],
  },
];

const orders = [
  {
    id: "9fb5c5a2-79d0-447b-90cc-82c2f9f8395f",
    status: "paid",
    paymentStatus: "paid",
    totalAmount: 3311,
    subtotalAmount: 2900,
    shippingAmount: 695,
    taxAmount: 216,
    discountAmount: 500,
    createdAt: "2026-05-30T17:22:00.000Z",
    customer: { name: "Mike Dickerman", email: "mike@godigitalalchemy.com", phone: "704-608-5783" },
    shippingName: "Mike Dickerman",
    shippingCompany: null,
    shippingAddress: "3003 Trinity Church Rd",
    shippingLine2: null,
    shippingCity: "Monroe",
    shippingState: "NC",
    shippingZip: "28112",
    shippingCountry: "US",
    items: [{ id: "item-1", productName: "Family Transition Conversation Cards", quantity: 1, lineTotal: 2900 }],
    shipments: [],
    fulfillments: [],
    internalNotes: [],
  },
];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/features/admin/cms/components/cms-image-upload", () => ({
  CmsImageUpload: ({ label, value, onChange, "data-testid": testId }: { label?: string; value: string; onChange: (value: string) => void; "data-testid"?: string }) =>
    React.createElement(
      "div",
      { "data-testid": testId || "cms-image-upload" },
      React.createElement("span", null, label),
      React.createElement("input", {
        "aria-label": label,
        value,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
      }),
      React.createElement("button", { type: "button" }, "Pick from library"),
    ),
}));

vi.mock("@/features/admin/cms/builder/cms-rich-text-editor", () => ({
  CmsRichTextEditor: ({ value, onChange, "data-testid": testId }: { value: string; onChange: (value: string) => void; "data-testid"?: string }) =>
    React.createElement("textarea", {
      "data-testid": testId || "cms-rich-text-editor",
      value,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value),
    }),
}));

describe("Ecommerce IntegrationsTab", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockReturnValue({
      data: {
        stripe: {
          stripe_publishable_key: { value: "pk_test_saved", isSecret: false },
        },
      },
      isLoading: false,
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    (globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    container.remove();
    document.body.innerHTML = "";
  });

  it("renders a searchable categorized integration library and opens setup details", () => {
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(IntegrationsTab));
    });

    expect(container.querySelector('[data-testid="ecommerce-integrations-library"]')).toBeTruthy();
    expect(container.textContent).toContain("Payment Gateways");
    expect(container.textContent).toContain("Shipping & Fulfillment");
    expect(container.querySelector('[data-testid="button-ecommerce-integration-stripe"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="badge-ecommerce-integration-status-stripe"]')?.textContent).toContain("Configured");

    const shippingFilter = container.querySelector(
      '[data-testid="button-ecommerce-integration-category-shipping-fulfillment"]',
    );
    act(() => {
      shippingFilter?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="button-ecommerce-integration-shipstation"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="button-ecommerce-integration-stripe"]')).toBeFalsy();

    const searchInput = container.querySelector(
      '[data-testid="input-ecommerce-integration-search"]',
    ) as HTMLInputElement | null;
    act(() => {
      if (searchInput) {
        searchInput.value = "international";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(container.querySelector('[data-testid="button-ecommerce-integration-easyship"]')).toBeTruthy();

    const easyshipTile = container.querySelector('[data-testid="button-ecommerce-integration-easyship"]');
    act(() => {
      easyshipTile?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Configure shipping & fulfillment settings");
    expect(document.body.textContent).toContain("Open Easyship Account");
    expect(document.body.textContent).toContain("Save");
  });
});

describe("Ecommerce CategoriesTab", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockReturnValue({ data: categories, isLoading: false });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    (globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    container.remove();
  });

  function renderCategoriesTab() {
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(CategoriesTab));
    });
  }

  it("renders parent and child categories in a manageable table", () => {
    renderCategoriesTab();

    expect(container.textContent).toContain("Guides & Workbooks");
    expect(container.textContent).toContain("Professional Training");
    expect(container.textContent).toContain("Family Resources");
    expect(container.textContent).toContain("Edit existing categories or add child categories under any parent.");
    expect(container.textContent).toContain("Subcategories");
  });

  it("filters the category table by search term", () => {
    renderCategoriesTab();

    const searchInput = Array.from(container.querySelectorAll("input")).find(
      (input) => input.placeholder === "Search categories, slugs, descriptions, or parents",
    );

    expect(searchInput).toBeTruthy();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    act(() => {
      if (searchInput) {
        valueSetter?.call(searchInput, "family");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const tableRows = Array.from(container.querySelectorAll("tbody tr"));
    expect(tableRows.some((row) => row.textContent?.includes("Family Resources"))).toBe(true);
    expect(tableRows.some((row) => row.textContent?.includes("Professional Training"))).toBe(false);
  });

  it("hydrates the editor when an existing category is selected", () => {
    renderCategoriesTab();

    const editButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Edit",
    );

    act(() => {
      editButtons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const inputs = Array.from(container.querySelectorAll("input"));
    expect(container.textContent).toContain("Edit category");
    expect(inputs[0].value).toBe("Professional Training");
    expect(inputs[1].value).toBe("professional-training");
    expect(container.querySelector("textarea")?.value).toBe("Courses and workshops");
  });

  it("uses the CMS media selector for category images", () => {
    renderCategoriesTab();

    expect(container.querySelector('[data-testid="ecommerce-category-image"]')).toBeTruthy();
    expect(container.textContent).toContain("Pick from library");
  });

  it("blocks shipping provider activation until required credentials are saved", () => {
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/ecommerce/shipping/providers") {
        return { data: shippingProviders, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    act(() => {
      root = createRoot(container);
      root.render(React.createElement(ShippingTab));
    });

    expect(container.textContent).toContain("Missing API key, API secret in encrypted credential storage.");
    const providerCards = Array.from(container.querySelectorAll(".rounded-lg.border.p-4"));
    const shipStationCard = providerCards.find((card) => card.textContent?.includes("ShipStation"));
    const easyPostCard = providerCards.find((card) => card.textContent?.includes("EasyPost"));
    const shipStationEnabledSwitch = shipStationCard?.querySelector('[role="switch"]') as HTMLButtonElement | null;
    const easyPostEnabledSwitch = easyPostCard?.querySelector('[role="switch"]') as HTMLButtonElement | null;

    expect(shipStationEnabledSwitch?.disabled).toBe(true);
    expect(easyPostEnabledSwitch?.disabled).toBe(false);
  });
});

describe("Ecommerce ProductsTab", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockImplementation((options: { queryKey?: string[] }) => {
      if (options.queryKey?.[0] === "/api/admin/ecommerce/products") return { data: products, isLoading: false };
      if (options.queryKey?.[0] === "/api/admin/ecommerce/categories") return { data: categories, isLoading: false };
      return { data: [], isLoading: false };
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    (globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    container.remove();
    document.body.innerHTML = "";
  });

  it("opens product editing in a tabbed drawer", () => {
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(ProductsTab));
    });

    const editButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Edit"),
    );

    expect(editButton).toBeTruthy();
    act(() => {
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Edit product");
    expect(document.body.textContent).toContain("Content");
    expect(document.body.textContent).toContain("Media");
    expect(document.body.textContent).toContain("Pricing");
    expect(document.body.textContent).toContain("Inventory");
    expect(document.body.textContent).toContain("Shipping");
    expect(document.body.textContent).toContain("Settings");
    expect(document.body.textContent).toContain("SEO");
  });

  it("uses CMS rich text and media controls in the product editor", () => {
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(ProductsTab));
    });

    const editButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Edit"),
    );

    act(() => {
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector('[data-testid="ecommerce-product-description-editor"]')).toBeTruthy();

    const mediaTab = Array.from(document.body.querySelectorAll('[role="tab"]')).find(
      (button) => button.textContent?.includes("Media"),
    );
    act(() => {
      mediaTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      mediaTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector('[data-testid="ecommerce-product-primary-image"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="ecommerce-product-gallery-image"]')).toBeTruthy();

    const seoTab = Array.from(document.body.querySelectorAll('[role="tab"]')).find(
      (button) => button.textContent?.includes("SEO"),
    );
    act(() => {
      seoTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      seoTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.querySelector('[data-testid="ecommerce-product-og-image"]')).toBeTruthy();
  });
});

describe("Ecommerce OrdersTab", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockImplementation((options: { queryKey?: string[] }) => {
      if (options.queryKey?.[0] === "/api/admin/ecommerce/orders") return { data: orders, isLoading: false };
      if (options.queryKey?.[0] === "/api/admin/ecommerce/settings/store") {
        return { data: { storeTimezone: "America/New_York" }, isLoading: false };
      }
      if (options.queryKey?.[0] === "/api/admin/ecommerce/shipping/locations") return { data: [], isLoading: false };
      return { data: [], isLoading: false };
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    (globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    container.remove();
    document.body.innerHTML = "";
  });

  it("opens the order detail drawer from the row and shows customer and shipping data", () => {
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(OrdersTab));
    });

    const orderRow = Array.from(container.querySelectorAll("tbody tr")).find((row) =>
      row.textContent?.includes("#9FB5C5A2"),
    );

    expect(orderRow).toBeTruthy();
    act(() => {
      orderRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Order detail");
    expect(document.body.textContent).toContain("Customer");
    expect(document.body.textContent).toContain("Ship to");
    expect(document.body.textContent).toContain("Mike Dickerman");
    expect(document.body.textContent).toContain("3003 Trinity Church Rd");
    expect(document.body.textContent).toContain("Family Transition Conversation Cards");
  });
});
