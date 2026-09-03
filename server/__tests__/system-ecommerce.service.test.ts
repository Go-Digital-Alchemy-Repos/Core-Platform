import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCategories = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockGetProducts = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();

vi.mock("../storage", () => ({
  storage: {
    ecommerce: {
      getCategories: mockGetCategories,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      getProducts: mockGetProducts,
      createProduct: mockCreateProduct,
      updateProduct: mockUpdateProduct,
    },
  },
}));

describe("ensureSystemEcommerce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves merchant edits to existing seeded categories and products", async () => {
    mockGetCategories.mockResolvedValue([
      {
        id: "category-id",
        name: "Merchant Category Name",
        slug: "guides-workbooks",
        description: "Merchant category description",
        sortOrder: 99,
      },
    ]);
    mockGetProducts.mockResolvedValue([
      {
        id: "product-id",
        name: "Merchant Product Name",
        sku: "CP-WORKBOOK-001",
        urlSlug: "merchant-product-url",
        price: 12345,
      },
    ]);
    mockCreateCategory.mockImplementation(async (category) => ({
      id: `category-${category.slug}`,
      ...category,
    }));
    mockCreateProduct.mockResolvedValue({ id: "created-product" });

    const { ensureSystemEcommerce } = await import("../services/system-ecommerce.service");
    await ensureSystemEcommerce();

    expect(mockUpdateCategory).not.toHaveBeenCalled();
    expect(mockUpdateProduct).not.toHaveBeenCalled();
    expect(mockCreateProduct).not.toHaveBeenCalledWith(
      expect.objectContaining({ sku: "CP-WORKBOOK-001" }),
      expect.anything(),
    );
  });

  it("creates missing seeded categories and products", async () => {
    mockGetCategories.mockResolvedValue([]);
    mockGetProducts.mockResolvedValue([]);
    mockCreateCategory.mockImplementation(async (category) => ({
      id: `category-${category.slug}`,
      ...category,
    }));
    mockCreateProduct.mockResolvedValue({ id: "created-product" });

    const { ensureSystemEcommerce } = await import("../services/system-ecommerce.service");
    await ensureSystemEcommerce();

    expect(mockCreateCategory).toHaveBeenCalledTimes(3);
    expect(mockCreateProduct).toHaveBeenCalledTimes(5);
  });
});
