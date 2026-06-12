import { and, desc, eq, gte, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../db";
import { requiresAtomicInventoryStockGuard } from "../services/ecommerce-inventory.service";
import { isEcommerceOrderLookupAuthorized } from "../services/ecommerce-order-lookup.service";
import {
  ecommerceCategories,
  ecommerceCouponRedemptions,
  ecommerceCoupons,
  ecommerceCustomerAddresses,
  ecommerceCustomers,
  ecommerceFulfillmentItems,
  ecommerceFulfillmentLocations,
  ecommerceFulfillments,
  ecommerceOrderItems,
  ecommerceOrderNotes,
  ecommerceOrders,
  ecommercePaymentRequests,
  ecommerceProcessedWebhookEvents,
  ecommerceProductCategories,
  ecommerceInventoryAdjustments,
  ecommerceProductMedia,
  ecommerceProductVariants,
  ecommerceProducts,
  ecommerceRefunds,
  ecommerceShipments,
  ecommerceShippingProviders,
  ecommerceShippingRates,
  ecommerceShippingZones,
  users,
  type EcommerceCategory,
  type EcommerceCoupon,
  type EcommerceCustomerAddress,
  type EcommerceCustomer,
  type EcommerceFulfillment,
  type EcommerceFulfillmentItem,
  type EcommerceFulfillmentLocation,
  type EcommerceOrder,
  type EcommerceOrderItem,
  type EcommerceOrderNote,
  type EcommercePaymentRequest,
  type EcommerceProduct,
  type EcommerceProductMedia,
  type EcommerceProductVariant,
  type EcommerceRefund,
  type EcommerceShipment,
  type EcommerceShippingProvider,
  type EcommerceShippingRate,
  type EcommerceShippingZone,
  type InsertEcommerceCategory,
  type InsertEcommerceCoupon,
  type InsertEcommerceCustomerAddress,
  type InsertEcommerceCustomer,
  type InsertEcommerceFulfillment,
  type InsertEcommerceFulfillmentItem,
  type InsertEcommerceFulfillmentLocation,
  type InsertEcommerceOrder,
  type InsertEcommerceOrderItem,
  type InsertEcommerceOrderNote,
  type InsertEcommercePaymentRequest,
  type InsertEcommerceProduct,
  type InsertEcommerceProductMedia,
  type InsertEcommerceProductVariant,
  type InsertEcommerceRefund,
  type InsertEcommerceShipment,
  type InsertEcommerceShippingProvider,
  type InsertEcommerceShippingRate,
  type InsertEcommerceShippingZone,
} from "@shared/schema";

export interface EcommerceProductWithCategories extends EcommerceProduct {
  categories: EcommerceCategory[];
  variants: EcommerceProductVariant[];
  media: EcommerceProductMedia[];
}

export interface EcommerceOrderWithDetails extends EcommerceOrder {
  customer: EcommerceCustomer | null;
  items: EcommerceOrderItem[];
  refunds: EcommerceRefund[];
  shipments: EcommerceShipment[];
  fulfillments: EcommerceFulfillment[];
  internalNotes: EcommerceOrderNoteWithAuthor[];
}

export interface EcommercePaymentRequestWithCustomer extends EcommercePaymentRequest {
  customer: EcommerceCustomer | null;
}

export interface EcommerceOrderNoteWithAuthor extends EcommerceOrderNote {
  author: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface EcommerceFulfillmentWithItems extends EcommerceFulfillment {
  items: EcommerceFulfillmentItem[];
}

export interface EcommerceCouponReport {
  coupon: EcommerceCoupon;
  totalUses: number;
  totalDiscountGiven: number;
  totalRevenue: number;
  remainingUses: number | null;
  recentOrders: Array<{
    orderId: string;
    customerEmail: string | null;
    totalAmount: number;
    discountAmount: number;
    redeemedAt: Date;
  }>;
}

export class EcommerceStorage {
  async getProducts(options: { publicOnly?: boolean; search?: string; includeArchived?: boolean } = {}): Promise<EcommerceProduct[]> {
    const clauses = [];
    if (!options.includeArchived) clauses.push(isNull(ecommerceProducts.archivedAt));
    if (options.publicOnly) {
      clauses.push(
        eq(ecommerceProducts.active, true),
        eq(ecommerceProducts.status, "published"),
        eq(ecommerceProducts.visibility, "online"),
      );
    }
    if (options.search) clauses.push(ilike(ecommerceProducts.name, `%${options.search}%`));
    const query = db.select().from(ecommerceProducts).orderBy(desc(ecommerceProducts.createdAt));
    return clauses.length ? query.where(and(...clauses)) : query;
  }

  async getProduct(id: string): Promise<EcommerceProduct | undefined> {
    const [product] = await db.select().from(ecommerceProducts).where(eq(ecommerceProducts.id, id));
    return product;
  }

  async getProductBySlug(slug: string): Promise<EcommerceProduct | undefined> {
    const [product] = await db.select().from(ecommerceProducts).where(eq(ecommerceProducts.urlSlug, slug));
    return product;
  }

  async createProduct(data: InsertEcommerceProduct, categoryIds: string[] = []): Promise<EcommerceProduct> {
    return db.transaction(async (tx) => {
      const [product] = await tx.insert(ecommerceProducts).values(data).returning();
      await tx.insert(ecommerceProductVariants).values({
        productId: product.id,
        title: "Default",
        optionSignature: "default",
        optionValues: {},
        sku: product.sku,
        price: product.price,
        salePrice: product.salePrice,
        compareAtPrice: product.compareAtPrice,
        image: product.primaryImage,
        active: product.active,
        status: product.active ? "active" : "inactive",
        isDefault: true,
      });
      if (categoryIds.length) {
        await tx.insert(ecommerceProductCategories).values(
          categoryIds.map((categoryId) => ({ productId: product.id, categoryId })),
        ).onConflictDoNothing();
      }
      return product;
    });
  }

  async updateProduct(id: string, data: Partial<InsertEcommerceProduct>, categoryIds?: string[]): Promise<EcommerceProduct | undefined> {
    return db.transaction(async (tx) => {
      const [product] = await tx
        .update(ecommerceProducts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ecommerceProducts.id, id))
        .returning();
      if (!product) return undefined;
      await tx
        .update(ecommerceProductVariants)
        .set({
          sku: data.sku ?? product.sku,
          price: data.price ?? product.price,
          salePrice: data.salePrice ?? product.salePrice,
          compareAtPrice: data.compareAtPrice ?? product.compareAtPrice,
          image: data.primaryImage ?? product.primaryImage,
          active: data.active ?? product.active,
          status: (data.active ?? product.active) ? "active" : "inactive",
          updatedAt: new Date(),
        })
        .where(and(eq(ecommerceProductVariants.productId, id), eq(ecommerceProductVariants.isDefault, true)));
      if (categoryIds) {
        await tx.delete(ecommerceProductCategories).where(eq(ecommerceProductCategories.productId, id));
        if (categoryIds.length) {
          await tx.insert(ecommerceProductCategories).values(
            categoryIds.map((categoryId) => ({ productId: id, categoryId })),
          ).onConflictDoNothing();
        }
      }
      return product;
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(ecommerceProducts)
        .set({
          active: false,
          featured: false,
          status: "archived",
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ecommerceProducts.id, id));
      await tx
        .update(ecommerceProductVariants)
        .set({ active: false, status: "inactive", updatedAt: new Date() })
        .where(eq(ecommerceProductVariants.productId, id));
    });
  }

  async getProductCategories(productId: string): Promise<EcommerceCategory[]> {
    return db
      .select({
        id: ecommerceCategories.id,
        name: ecommerceCategories.name,
        slug: ecommerceCategories.slug,
        description: ecommerceCategories.description,
        parentId: ecommerceCategories.parentId,
        image: ecommerceCategories.image,
        sortOrder: ecommerceCategories.sortOrder,
        active: ecommerceCategories.active,
        createdAt: ecommerceCategories.createdAt,
        updatedAt: ecommerceCategories.updatedAt,
      })
      .from(ecommerceProductCategories)
      .innerJoin(ecommerceCategories, eq(ecommerceProductCategories.categoryId, ecommerceCategories.id))
      .where(eq(ecommerceProductCategories.productId, productId));
  }

  async getProductVariants(productId: string): Promise<EcommerceProductVariant[]> {
    return db
      .select()
      .from(ecommerceProductVariants)
      .where(eq(ecommerceProductVariants.productId, productId))
      .orderBy(ecommerceProductVariants.sortOrder, ecommerceProductVariants.title);
  }

  async getProductMedia(productId: string): Promise<EcommerceProductMedia[]> {
    return db
      .select()
      .from(ecommerceProductMedia)
      .where(eq(ecommerceProductMedia.productId, productId))
      .orderBy(ecommerceProductMedia.sortOrder);
  }

  async getProductVariant(id: string): Promise<EcommerceProductVariant | undefined> {
    const [variant] = await db.select().from(ecommerceProductVariants).where(eq(ecommerceProductVariants.id, id));
    return variant;
  }

  async getDefaultProductVariant(productId: string): Promise<EcommerceProductVariant | undefined> {
    const [variant] = await db
      .select()
      .from(ecommerceProductVariants)
      .where(and(eq(ecommerceProductVariants.productId, productId), eq(ecommerceProductVariants.isDefault, true)))
      .limit(1);
    return variant;
  }

  async createProductVariant(data: InsertEcommerceProductVariant): Promise<EcommerceProductVariant> {
    const [variant] = await db.insert(ecommerceProductVariants).values(data).returning();
    return variant;
  }

  async updateProductVariant(id: string, data: Partial<InsertEcommerceProductVariant>): Promise<EcommerceProductVariant | undefined> {
    const [variant] = await db
      .update(ecommerceProductVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceProductVariants.id, id))
      .returning();
    return variant;
  }

  async createProductMedia(data: InsertEcommerceProductMedia): Promise<EcommerceProductMedia> {
    const [media] = await db.insert(ecommerceProductMedia).values(data).returning();
    return media;
  }

  async getCategory(id: string): Promise<EcommerceCategory | undefined> {
    const [category] = await db.select().from(ecommerceCategories).where(eq(ecommerceCategories.id, id));
    return category;
  }

  async getCategories(publicOnly = false): Promise<EcommerceCategory[]> {
    const query = db.select().from(ecommerceCategories).orderBy(ecommerceCategories.sortOrder, ecommerceCategories.name);
    return publicOnly ? query.where(eq(ecommerceCategories.active, true)) : query;
  }

  async createCategory(data: InsertEcommerceCategory): Promise<EcommerceCategory> {
    const [category] = await db.insert(ecommerceCategories).values(data).returning();
    return category;
  }

  async updateCategory(id: string, data: Partial<InsertEcommerceCategory>): Promise<EcommerceCategory | undefined> {
    const [category] = await db
      .update(ecommerceCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceCategories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(ecommerceCategories)
        .set({ parentId: null, updatedAt: new Date() })
        .where(eq(ecommerceCategories.parentId, id));
      await tx
        .update(ecommerceCategories)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(ecommerceCategories.id, id));
    });
  }

  async findOrCreateCustomer(data: InsertEcommerceCustomer): Promise<EcommerceCustomer> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<InsertEcommerceCustomer>;
    const [existing] = await db
      .select()
      .from(ecommerceCustomers)
      .where(eq(ecommerceCustomers.email, normalizedEmail))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(ecommerceCustomers)
        .set({ ...updateData, email: normalizedEmail, updatedAt: new Date() })
        .where(eq(ecommerceCustomers.id, existing.id))
        .returning();
      return updated;
    }
    const [customer] = await db.insert(ecommerceCustomers).values({ ...data, email: normalizedEmail }).returning();
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<EcommerceCustomer | undefined> {
    const [customer] = await db
      .select()
      .from(ecommerceCustomers)
      .where(eq(ecommerceCustomers.email, email.trim().toLowerCase()))
      .limit(1);
    return customer;
  }

  async getCustomerByUserId(userId: string): Promise<EcommerceCustomer | undefined> {
    const [customer] = await db
      .select()
      .from(ecommerceCustomers)
      .where(eq(ecommerceCustomers.userId, userId))
      .limit(1);
    return customer;
  }

  async getCustomer(id: string): Promise<EcommerceCustomer | undefined> {
    const [customer] = await db.select().from(ecommerceCustomers).where(eq(ecommerceCustomers.id, id));
    return customer;
  }

  async searchCustomers(search?: string): Promise<EcommerceCustomer[]> {
    const term = search?.trim();
    const clauses = term
      ? or(
          ilike(ecommerceCustomers.email, `%${term}%`),
          ilike(ecommerceCustomers.name, `%${term}%`),
          ilike(ecommerceCustomers.phone, `%${term}%`),
        )
      : undefined;
    return db
      .select()
      .from(ecommerceCustomers)
      .where(clauses)
      .orderBy(desc(ecommerceCustomers.updatedAt))
      .limit(25);
  }

  async updateCustomer(id: string, data: Partial<InsertEcommerceCustomer>): Promise<EcommerceCustomer | undefined> {
    const [customer] = await db
      .update(ecommerceCustomers)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof ecommerceCustomers.$inferInsert>)
      .where(eq(ecommerceCustomers.id, id))
      .returning();
    return customer;
  }

  async getCustomerAddresses(customerId: string): Promise<EcommerceCustomerAddress[]> {
    return db
      .select()
      .from(ecommerceCustomerAddresses)
      .where(and(eq(ecommerceCustomerAddresses.customerId, customerId), isNull(ecommerceCustomerAddresses.archivedAt)))
      .orderBy(desc(ecommerceCustomerAddresses.isDefault), desc(ecommerceCustomerAddresses.updatedAt));
  }

  async getCustomerAddress(customerId: string, addressId: string): Promise<EcommerceCustomerAddress | undefined> {
    const [address] = await db
      .select()
      .from(ecommerceCustomerAddresses)
      .where(and(
        eq(ecommerceCustomerAddresses.customerId, customerId),
        eq(ecommerceCustomerAddresses.id, addressId),
        isNull(ecommerceCustomerAddresses.archivedAt),
      ))
      .limit(1);
    return address;
  }

  async createCustomerAddress(data: InsertEcommerceCustomerAddress): Promise<EcommerceCustomerAddress> {
    return db.transaction(async (tx) => {
      const existingActiveAddresses = await tx
        .select({ id: ecommerceCustomerAddresses.id })
        .from(ecommerceCustomerAddresses)
        .where(and(eq(ecommerceCustomerAddresses.customerId, data.customerId), isNull(ecommerceCustomerAddresses.archivedAt)))
        .limit(1);
      const shouldBeDefault = data.isDefault === true || existingActiveAddresses.length === 0;
      if (shouldBeDefault) {
        await tx
          .update(ecommerceCustomerAddresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(ecommerceCustomerAddresses.customerId, data.customerId));
      }
      const [address] = await tx
        .insert(ecommerceCustomerAddresses)
        .values({ ...data, isDefault: shouldBeDefault })
        .returning();
      if (address.isDefault) {
        await tx.update(ecommerceCustomers).set({
          address: address.address,
          line2: address.line2,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
          updatedAt: new Date(),
        }).where(eq(ecommerceCustomers.id, address.customerId));
      }
      return address;
    });
  }

  async updateCustomerAddress(
    customerId: string,
    addressId: string,
    data: Partial<InsertEcommerceCustomerAddress>,
  ): Promise<EcommerceCustomerAddress | undefined> {
    return db.transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx
          .update(ecommerceCustomerAddresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(ecommerceCustomerAddresses.customerId, customerId));
      }
      const [address] = await tx
        .update(ecommerceCustomerAddresses)
        .set({ ...data, customerId, updatedAt: new Date() } as Partial<typeof ecommerceCustomerAddresses.$inferInsert>)
        .where(and(
          eq(ecommerceCustomerAddresses.customerId, customerId),
          eq(ecommerceCustomerAddresses.id, addressId),
          isNull(ecommerceCustomerAddresses.archivedAt),
        ))
        .returning();
      if (address?.isDefault) {
        await tx.update(ecommerceCustomers).set({
          address: address.address,
          line2: address.line2,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
          updatedAt: new Date(),
        }).where(eq(ecommerceCustomers.id, customerId));
      }
      return address;
    });
  }

  async deleteCustomerAddress(customerId: string, addressId: string): Promise<EcommerceCustomerAddress | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(ecommerceCustomerAddresses)
        .where(and(
          eq(ecommerceCustomerAddresses.customerId, customerId),
          eq(ecommerceCustomerAddresses.id, addressId),
          isNull(ecommerceCustomerAddresses.archivedAt),
        ))
        .limit(1);
      if (!existing) return undefined;
      const [archived] = await tx
        .update(ecommerceCustomerAddresses)
        .set({ archivedAt: new Date(), isDefault: false, updatedAt: new Date() })
        .where(and(
          eq(ecommerceCustomerAddresses.customerId, customerId),
          eq(ecommerceCustomerAddresses.id, addressId),
          isNull(ecommerceCustomerAddresses.archivedAt),
        ))
        .returning();
      if (existing.isDefault) {
        const [fallback] = await tx
          .select()
          .from(ecommerceCustomerAddresses)
          .where(and(eq(ecommerceCustomerAddresses.customerId, customerId), isNull(ecommerceCustomerAddresses.archivedAt)))
          .orderBy(desc(ecommerceCustomerAddresses.updatedAt))
          .limit(1);
        if (fallback) {
          await tx
            .update(ecommerceCustomerAddresses)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(ecommerceCustomerAddresses.id, fallback.id));
          await tx.update(ecommerceCustomers).set({
            address: fallback.address,
            line2: fallback.line2,
            city: fallback.city,
            state: fallback.state,
            zipCode: fallback.zipCode,
            country: fallback.country,
            updatedAt: new Date(),
          }).where(eq(ecommerceCustomers.id, customerId));
        } else {
          await tx.update(ecommerceCustomers).set({
            address: null,
            line2: null,
            city: null,
            state: null,
            zipCode: null,
            country: "US",
            updatedAt: new Date(),
          }).where(eq(ecommerceCustomers.id, customerId));
        }
      }
      return archived;
    });
  }

  async setDefaultCustomerAddress(customerId: string, addressId: string): Promise<EcommerceCustomerAddress | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(ecommerceCustomerAddresses)
        .where(and(
          eq(ecommerceCustomerAddresses.customerId, customerId),
          eq(ecommerceCustomerAddresses.id, addressId),
          isNull(ecommerceCustomerAddresses.archivedAt),
        ))
        .limit(1);
      if (!existing) return undefined;
      await tx
        .update(ecommerceCustomerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(ecommerceCustomerAddresses.customerId, customerId));
      const [address] = await tx
        .update(ecommerceCustomerAddresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(ecommerceCustomerAddresses.id, addressId))
        .returning();
      await tx.update(ecommerceCustomers).set({
        address: address.address,
        line2: address.line2,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        updatedAt: new Date(),
      }).where(eq(ecommerceCustomers.id, customerId));
      return address;
    });
  }

  async getCoupons(options: { includeArchived?: boolean; search?: string } = {}): Promise<EcommerceCoupon[]> {
    const clauses = [];
    if (!options.includeArchived) clauses.push(isNull(ecommerceCoupons.archivedAt));
    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      clauses.push(sql`(${ecommerceCoupons.code} ILIKE ${term} OR ${ecommerceCoupons.name} ILIKE ${term})`);
    }
    const query = db.select().from(ecommerceCoupons).orderBy(desc(ecommerceCoupons.createdAt));
    return clauses.length ? query.where(and(...clauses)) : query;
  }

  async getCoupon(id: string): Promise<EcommerceCoupon | undefined> {
    const [coupon] = await db.select().from(ecommerceCoupons).where(eq(ecommerceCoupons.id, id));
    return coupon;
  }

  async getCouponByCode(code: string): Promise<EcommerceCoupon | undefined> {
    const [coupon] = await db
      .select()
      .from(ecommerceCoupons)
      .where(eq(ecommerceCoupons.code, code.trim().toUpperCase()));
    return coupon;
  }

  async createCoupon(data: InsertEcommerceCoupon): Promise<EcommerceCoupon> {
    const [coupon] = await db
      .insert(ecommerceCoupons)
      .values({ ...data, code: data.code.trim().toUpperCase() })
      .returning();
    return coupon;
  }

  async updateCoupon(id: string, data: Partial<InsertEcommerceCoupon>): Promise<EcommerceCoupon | undefined> {
    const [coupon] = await db
      .update(ecommerceCoupons)
      .set({ ...data, code: data.code ? data.code.trim().toUpperCase() : undefined, updatedAt: new Date() })
      .where(eq(ecommerceCoupons.id, id))
      .returning();
    return coupon;
  }

  async deleteCoupon(id: string): Promise<void> {
    await db
      .update(ecommerceCoupons)
      .set({ active: false, archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(ecommerceCoupons.id, id));
  }

  async duplicateCoupon(id: string, code: string): Promise<EcommerceCoupon | undefined> {
    const coupon = await this.getCoupon(id);
    if (!coupon) return undefined;
    const [copy] = await db
      .insert(ecommerceCoupons)
      .values({
        ...coupon,
        id: undefined,
        code: code.trim().toUpperCase(),
        name: coupon.name ? `${coupon.name} copy` : null,
        timesUsed: 0,
        archivedAt: null,
        createdAt: undefined,
        updatedAt: undefined,
      })
      .returning();
    return copy;
  }

  async countCouponRedemptions(couponId: string, customerId?: string | null, customerEmail?: string | null): Promise<number> {
    const clauses = [eq(ecommerceCouponRedemptions.couponId, couponId)];
    if (customerId) clauses.push(eq(ecommerceCouponRedemptions.customerId, customerId));
    else if (customerEmail) clauses.push(eq(ecommerceCouponRedemptions.customerEmail, customerEmail.trim().toLowerCase()));

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ecommerceCouponRedemptions)
      .where(and(...clauses));
    return row?.count ?? 0;
  }

  async getCouponReport(id: string): Promise<EcommerceCouponReport | undefined> {
    const coupon = await this.getCoupon(id);
    if (!coupon) return undefined;

    const [summary] = await db
      .select({
        totalUses: sql<number>`count(${ecommerceCouponRedemptions.id})::int`,
        totalDiscountGiven: sql<number>`coalesce(sum(${ecommerceCouponRedemptions.discountAmount}), 0)::int`,
        totalRevenue: sql<number>`coalesce(sum(${ecommerceOrders.totalAmount}), 0)::int`,
      })
      .from(ecommerceCouponRedemptions)
      .leftJoin(ecommerceOrders, eq(ecommerceCouponRedemptions.orderId, ecommerceOrders.id))
      .where(eq(ecommerceCouponRedemptions.couponId, id));

    const recentOrders = await db
      .select({
        orderId: ecommerceOrders.id,
        customerEmail: ecommerceCouponRedemptions.customerEmail,
        totalAmount: ecommerceOrders.totalAmount,
        discountAmount: ecommerceCouponRedemptions.discountAmount,
        redeemedAt: ecommerceCouponRedemptions.redeemedAt,
      })
      .from(ecommerceCouponRedemptions)
      .leftJoin(ecommerceOrders, eq(ecommerceCouponRedemptions.orderId, ecommerceOrders.id))
      .where(eq(ecommerceCouponRedemptions.couponId, id))
      .orderBy(desc(ecommerceCouponRedemptions.redeemedAt))
      .limit(10);

    return {
      coupon,
      totalUses: summary?.totalUses ?? 0,
      totalDiscountGiven: summary?.totalDiscountGiven ?? 0,
      totalRevenue: summary?.totalRevenue ?? 0,
      remainingUses: coupon.maxRedemptions == null ? null : Math.max(0, coupon.maxRedemptions - coupon.timesUsed),
      recentOrders: recentOrders
        .filter((order) => order.orderId)
        .map((order) => ({
          orderId: order.orderId!,
          customerEmail: order.customerEmail,
          totalAmount: order.totalAmount ?? 0,
          discountAmount: order.discountAmount,
          redeemedAt: order.redeemedAt,
        })),
    };
  }

  async recordCouponRedemptionForOrder(orderId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(ecommerceOrders).where(eq(ecommerceOrders.id, orderId));
      if (!order?.couponCode || order.discountAmount <= 0) return;

      const [existing] = await tx
        .select()
        .from(ecommerceCouponRedemptions)
        .where(eq(ecommerceCouponRedemptions.orderId, orderId))
        .limit(1);
      if (existing) return;

      const [coupon] = await tx
        .select()
        .from(ecommerceCoupons)
        .where(eq(ecommerceCoupons.code, order.couponCode));
      if (!coupon) return;

      const [customer] = await tx.select().from(ecommerceCustomers).where(eq(ecommerceCustomers.id, order.customerId));
      await tx
        .update(ecommerceCoupons)
        .set({ timesUsed: sql`${ecommerceCoupons.timesUsed} + 1`, updatedAt: new Date() })
        .where(eq(ecommerceCoupons.id, coupon.id));
      await tx.insert(ecommerceCouponRedemptions).values({
        couponId: coupon.id,
        orderId: order.id,
        customerId: order.customerId,
        couponCode: coupon.code,
        customerEmail: customer?.email.trim().toLowerCase(),
        discountAmount: order.discountAmount,
      });
    });
  }

  async createOrder(data: InsertEcommerceOrder, items: InsertEcommerceOrderItem[]): Promise<EcommerceOrderWithDetails> {
    return db.transaction(async (tx) => {
      const [order] = await tx.insert(ecommerceOrders).values(data as typeof ecommerceOrders.$inferInsert).returning();
      if (items.length) {
        await tx
          .insert(ecommerceOrderItems)
          .values(items.map((item) => ({ ...item, orderId: order.id })) as Array<typeof ecommerceOrderItems.$inferInsert>);
      }
      const orderItems = await tx.select().from(ecommerceOrderItems).where(eq(ecommerceOrderItems.orderId, order.id));
      const [customer] = await tx.select().from(ecommerceCustomers).where(eq(ecommerceCustomers.id, order.customerId));
      return { ...order, customer: customer ?? null, items: orderItems, refunds: [], shipments: [], fulfillments: [], internalNotes: [] };
    });
  }

  async getOrders(): Promise<EcommerceOrderWithDetails[]> {
    const orders = await db.select().from(ecommerceOrders).orderBy(desc(ecommerceOrders.createdAt));
    return Promise.all(orders.map((order) => this.getOrderWithDetails(order.id))).then((rows) =>
      rows.filter((row): row is EcommerceOrderWithDetails => Boolean(row)),
    );
  }

  async getOrdersForCustomer(customerId: string): Promise<EcommerceOrderWithDetails[]> {
    const orders = await db
      .select()
      .from(ecommerceOrders)
      .where(eq(ecommerceOrders.customerId, customerId))
      .orderBy(desc(ecommerceOrders.createdAt));
    return Promise.all(orders.map((order) => this.getOrderWithDetails(order.id))).then((rows) =>
      rows.filter((row): row is EcommerceOrderWithDetails => Boolean(row)),
    );
  }

  async getOrder(id: string): Promise<EcommerceOrder | undefined> {
    const [order] = await db.select().from(ecommerceOrders).where(eq(ecommerceOrders.id, id));
    return order;
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<EcommerceOrder | undefined> {
    const [order] = await db
      .select()
      .from(ecommerceOrders)
      .where(eq(ecommerceOrders.stripePaymentIntentId, paymentIntentId));
    return order;
  }

  async getOrderForLookup(params: { orderId: string; email: string; token: string }): Promise<EcommerceOrderWithDetails | undefined> {
    const details = await this.getOrderWithDetails(params.orderId);
    if (!details || !isEcommerceOrderLookupAuthorized(details, params)) return undefined;
    return details;
  }

  async getOrderWithDetails(id: string): Promise<EcommerceOrderWithDetails | undefined> {
    const [order] = await db.select().from(ecommerceOrders).where(eq(ecommerceOrders.id, id));
    if (!order) return undefined;
    const [customer, items, refunds, shipments, fulfillments, internalNotes] = await Promise.all([
      this.getCustomer(order.customerId),
      db.select().from(ecommerceOrderItems).where(eq(ecommerceOrderItems.orderId, id)),
      db.select().from(ecommerceRefunds).where(eq(ecommerceRefunds.orderId, id)),
      db.select().from(ecommerceShipments).where(eq(ecommerceShipments.orderId, id)),
      db.select().from(ecommerceFulfillments).where(eq(ecommerceFulfillments.orderId, id)),
      this.getOrderNotes(id),
    ]);
    return { ...order, customer: customer ?? null, items, refunds, shipments, fulfillments, internalNotes };
  }

  async getOrderNotes(orderId: string): Promise<EcommerceOrderNoteWithAuthor[]> {
    const rows = await db
      .select({
        id: ecommerceOrderNotes.id,
        orderId: ecommerceOrderNotes.orderId,
        authorId: ecommerceOrderNotes.authorId,
        body: ecommerceOrderNotes.body,
        createdAt: ecommerceOrderNotes.createdAt,
        authorEmail: users.email,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(ecommerceOrderNotes)
      .leftJoin(users, eq(ecommerceOrderNotes.authorId, users.id))
      .where(eq(ecommerceOrderNotes.orderId, orderId))
      .orderBy(desc(ecommerceOrderNotes.createdAt));

    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt,
      author: row.authorEmail
        ? {
            id: row.authorId ?? "",
            email: row.authorEmail,
            firstName: row.authorFirstName,
            lastName: row.authorLastName,
          }
        : null,
    }));
  }

  async createOrderNote(data: InsertEcommerceOrderNote): Promise<EcommerceOrderNote> {
    const [note] = await db.insert(ecommerceOrderNotes).values(data).returning();
    return note;
  }

  async updateOrder(id: string, data: Partial<InsertEcommerceOrder>): Promise<EcommerceOrder | undefined> {
    const [order] = await db
      .update(ecommerceOrders)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof ecommerceOrders.$inferInsert>)
      .where(eq(ecommerceOrders.id, id))
      .returning();
    return order;
  }

  async updateOrderByPaymentIntent(paymentIntentId: string, data: Partial<InsertEcommerceOrder>): Promise<EcommerceOrder | undefined> {
    const [order] = await db
      .update(ecommerceOrders)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof ecommerceOrders.$inferInsert>)
      .where(eq(ecommerceOrders.stripePaymentIntentId, paymentIntentId))
      .returning();
    return order;
  }

  async markOrderPaidIfUnpaid(id: string, paymentIntentId: string): Promise<EcommerceOrder | undefined> {
    const [order] = await db
      .update(ecommerceOrders)
      .set({
        status: "paid",
        paymentStatus: "paid",
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(ecommerceOrders.id, id),
        or(
          isNull(ecommerceOrders.stripePaymentIntentId),
          eq(ecommerceOrders.stripePaymentIntentId, paymentIntentId),
        ),
        or(
          ne(ecommerceOrders.status, "paid"),
          ne(ecommerceOrders.paymentStatus, "paid"),
        ),
      ))
      .returning();
    return order;
  }

  async createPaymentRequest(data: InsertEcommercePaymentRequest): Promise<EcommercePaymentRequest> {
    const [request] = await db.insert(ecommercePaymentRequests).values(data).returning();
    return request;
  }

  async getPaymentRequest(id: string): Promise<EcommercePaymentRequest | undefined> {
    const [request] = await db.select().from(ecommercePaymentRequests).where(eq(ecommercePaymentRequests.id, id));
    return request;
  }

  async getPaymentRequestBySessionId(sessionId: string): Promise<EcommercePaymentRequest | undefined> {
    const [request] = await db
      .select()
      .from(ecommercePaymentRequests)
      .where(eq(ecommercePaymentRequests.stripeSessionId, sessionId));
    return request;
  }

  async updatePaymentRequest(id: string, data: Partial<InsertEcommercePaymentRequest> & { paidAt?: Date | null }): Promise<EcommercePaymentRequest | undefined> {
    const [request] = await db
      .update(ecommercePaymentRequests)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof ecommercePaymentRequests.$inferInsert>)
      .where(eq(ecommercePaymentRequests.id, id))
      .returning();
    return request;
  }

  async markPaymentRequestPaidBySession(sessionId: string, paymentIntentId?: string | null): Promise<EcommercePaymentRequest | undefined> {
    const [request] = await db
      .update(ecommercePaymentRequests)
      .set({
        status: "paid",
        stripePaymentIntentId: paymentIntentId ?? null,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ecommercePaymentRequests.stripeSessionId, sessionId))
      .returning();
    return request;
  }

  async getProductsByIds(ids: string[]): Promise<EcommerceProduct[]> {
    if (ids.length === 0) return [];
    return db.select().from(ecommerceProducts).where(inArray(ecommerceProducts.id, ids));
  }

  async deductInventoryForPaidOrder(orderId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(ecommerceOrderItems).where(eq(ecommerceOrderItems.orderId, orderId));
      for (const item of items) {
        if (!item.variantId) continue;
        const [existingAdjustment] = await tx
          .select()
          .from(ecommerceInventoryAdjustments)
          .where(and(
            eq(ecommerceInventoryAdjustments.orderId, orderId),
            eq(ecommerceInventoryAdjustments.variantId, item.variantId),
            eq(ecommerceInventoryAdjustments.reason, "order_paid"),
          ))
          .limit(1);
        if (existingAdjustment) continue;

        const [variant] = await tx
          .select()
          .from(ecommerceProductVariants)
          .where(eq(ecommerceProductVariants.id, item.variantId))
          .limit(1);
        if (!variant?.trackInventory) continue;

        const whereClause = requiresAtomicInventoryStockGuard(variant)
          ? and(eq(ecommerceProductVariants.id, variant.id), gte(ecommerceProductVariants.inventoryQuantity, item.quantity))
          : eq(ecommerceProductVariants.id, variant.id);
        const [updatedVariant] = await tx
          .update(ecommerceProductVariants)
          .set({
            inventoryQuantity: sql`${ecommerceProductVariants.inventoryQuantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(whereClause)
          .returning({ inventoryQuantity: ecommerceProductVariants.inventoryQuantity });
        if (!updatedVariant) {
          throw new Error(`Insufficient inventory for variant ${variant.id}`);
        }
        await tx.insert(ecommerceInventoryAdjustments).values({
          productId: item.productId,
          variantId: variant.id,
          orderId,
          delta: -item.quantity,
          quantityAfter: updatedVariant.inventoryQuantity,
          reason: "order_paid",
          note: `Order ${orderId}`,
        });
      }
    });
  }

  async createRefund(data: InsertEcommerceRefund): Promise<EcommerceRefund> {
    const [refund] = await db.insert(ecommerceRefunds).values(data).returning();
    return refund;
  }

  async updateRefund(id: string, data: Partial<InsertEcommerceRefund>): Promise<EcommerceRefund | undefined> {
    const [refund] = await db
      .update(ecommerceRefunds)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceRefunds.id, id))
      .returning();
    return refund;
  }

  async getRefundByStripeRefundId(stripeRefundId: string): Promise<EcommerceRefund | undefined> {
    const [refund] = await db
      .select()
      .from(ecommerceRefunds)
      .where(eq(ecommerceRefunds.stripeRefundId, stripeRefundId));
    return refund;
  }

  async getShippingZones(): Promise<EcommerceShippingZone[]> {
    return db.select().from(ecommerceShippingZones).orderBy(ecommerceShippingZones.name);
  }

  async createShippingZone(data: InsertEcommerceShippingZone): Promise<EcommerceShippingZone> {
    const [zone] = await db.insert(ecommerceShippingZones).values(data).returning();
    return zone;
  }

  async updateShippingZone(id: string, data: Partial<InsertEcommerceShippingZone>): Promise<EcommerceShippingZone | undefined> {
    const [zone] = await db
      .update(ecommerceShippingZones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceShippingZones.id, id))
      .returning();
    return zone;
  }

  async deleteShippingZone(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(ecommerceShippingZones)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(ecommerceShippingZones.id, id));
      await tx
        .update(ecommerceShippingRates)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(ecommerceShippingRates.zoneId, id));
    });
  }

  async getShippingRates(zoneId?: string): Promise<EcommerceShippingRate[]> {
    const query = db.select().from(ecommerceShippingRates).orderBy(ecommerceShippingRates.amount);
    return zoneId ? query.where(eq(ecommerceShippingRates.zoneId, zoneId)) : query;
  }

  async createShippingRate(data: InsertEcommerceShippingRate): Promise<EcommerceShippingRate> {
    const [rate] = await db.insert(ecommerceShippingRates).values(data).returning();
    return rate;
  }

  async updateShippingRate(id: string, data: Partial<InsertEcommerceShippingRate>): Promise<EcommerceShippingRate | undefined> {
    const [rate] = await db
      .update(ecommerceShippingRates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceShippingRates.id, id))
      .returning();
    return rate;
  }

  async deleteShippingRate(id: string): Promise<void> {
    await db
      .update(ecommerceShippingRates)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(ecommerceShippingRates.id, id));
  }

  async createShipment(data: InsertEcommerceShipment): Promise<EcommerceShipment> {
    const [shipment] = await db.insert(ecommerceShipments).values(data).returning();
    return shipment;
  }

  async updateShipment(id: string, data: Partial<InsertEcommerceShipment>): Promise<EcommerceShipment | undefined> {
    const [shipment] = await db
      .update(ecommerceShipments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceShipments.id, id))
      .returning();
    return shipment;
  }

  async getFulfillmentLocations(): Promise<EcommerceFulfillmentLocation[]> {
    return db
      .select()
      .from(ecommerceFulfillmentLocations)
      .orderBy(desc(ecommerceFulfillmentLocations.isPrimary), ecommerceFulfillmentLocations.name);
  }

  async createFulfillmentLocation(data: InsertEcommerceFulfillmentLocation): Promise<EcommerceFulfillmentLocation> {
    const [location] = await db.insert(ecommerceFulfillmentLocations).values(data).returning();
    return location;
  }

  async updateFulfillmentLocation(
    id: string,
    data: Partial<InsertEcommerceFulfillmentLocation>,
  ): Promise<EcommerceFulfillmentLocation | undefined> {
    const [location] = await db
      .update(ecommerceFulfillmentLocations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceFulfillmentLocations.id, id))
      .returning();
    return location;
  }

  async getShippingProviders(): Promise<EcommerceShippingProvider[]> {
    return db.select().from(ecommerceShippingProviders).orderBy(ecommerceShippingProviders.displayName);
  }

  async upsertShippingProvider(data: InsertEcommerceShippingProvider): Promise<EcommerceShippingProvider> {
    const [provider] = await db
      .insert(ecommerceShippingProviders)
      .values(data)
      .onConflictDoUpdate({
        target: ecommerceShippingProviders.provider,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return provider;
  }

  async createFulfillment(
    data: InsertEcommerceFulfillment,
    items: Array<Omit<InsertEcommerceFulfillmentItem, "fulfillmentId">> = [],
  ): Promise<EcommerceFulfillmentWithItems> {
    return db.transaction(async (tx) => {
      const [fulfillment] = await tx.insert(ecommerceFulfillments).values(data).returning();
      if (items.length) {
        await tx.insert(ecommerceFulfillmentItems).values(items.map((item) => ({
          ...item,
          fulfillmentId: fulfillment.id,
        })));
      }
      const fulfillmentItems = await tx
        .select()
        .from(ecommerceFulfillmentItems)
        .where(eq(ecommerceFulfillmentItems.fulfillmentId, fulfillment.id));
      return { ...fulfillment, items: fulfillmentItems };
    });
  }

  async getFulfillmentsForOrder(orderId: string): Promise<EcommerceFulfillmentWithItems[]> {
    const fulfillments = await db
      .select()
      .from(ecommerceFulfillments)
      .where(eq(ecommerceFulfillments.orderId, orderId))
      .orderBy(desc(ecommerceFulfillments.createdAt));

    return Promise.all(fulfillments.map(async (fulfillment) => ({
      ...fulfillment,
      items: await db
        .select()
        .from(ecommerceFulfillmentItems)
        .where(eq(ecommerceFulfillmentItems.fulfillmentId, fulfillment.id)),
    })));
  }

  async hasProcessedWebhook(provider: string, eventId: string): Promise<boolean> {
    const [event] = await db
      .select({ id: ecommerceProcessedWebhookEvents.id })
      .from(ecommerceProcessedWebhookEvents)
      .where(and(
        eq(ecommerceProcessedWebhookEvents.provider, provider),
        eq(ecommerceProcessedWebhookEvents.eventId, eventId),
      ))
      .limit(1);
    return Boolean(event);
  }

  async markWebhookProcessed(provider: string, eventId: string, eventType: string): Promise<boolean> {
    const inserted = await db
      .insert(ecommerceProcessedWebhookEvents)
      .values({ provider, eventId, eventType })
      .onConflictDoNothing()
      .returning();
    return inserted.length > 0;
  }
}
