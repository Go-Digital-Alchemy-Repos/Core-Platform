import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  ecommerceCategories,
  ecommerceCouponRedemptions,
  ecommerceCoupons,
  ecommerceCustomers,
  ecommerceOrderItems,
  ecommerceOrders,
  ecommerceProcessedWebhookEvents,
  ecommerceProductCategories,
  ecommerceProducts,
  ecommerceRefunds,
  ecommerceShipments,
  ecommerceShippingRates,
  ecommerceShippingZones,
  type EcommerceCategory,
  type EcommerceCoupon,
  type EcommerceCustomer,
  type EcommerceOrder,
  type EcommerceOrderItem,
  type EcommerceProduct,
  type EcommerceRefund,
  type EcommerceShipment,
  type EcommerceShippingRate,
  type EcommerceShippingZone,
  type InsertEcommerceCategory,
  type InsertEcommerceCoupon,
  type InsertEcommerceCustomer,
  type InsertEcommerceOrder,
  type InsertEcommerceOrderItem,
  type InsertEcommerceProduct,
  type InsertEcommerceRefund,
  type InsertEcommerceShipment,
  type InsertEcommerceShippingRate,
  type InsertEcommerceShippingZone,
} from "@shared/schema";

export interface EcommerceProductWithCategories extends EcommerceProduct {
  categories: EcommerceCategory[];
}

export interface EcommerceOrderWithDetails extends EcommerceOrder {
  customer: EcommerceCustomer | null;
  items: EcommerceOrderItem[];
  refunds: EcommerceRefund[];
  shipments: EcommerceShipment[];
}

export class EcommerceStorage {
  async getProducts(options: { publicOnly?: boolean; search?: string } = {}): Promise<EcommerceProduct[]> {
    const clauses = [];
    if (options.publicOnly) {
      clauses.push(eq(ecommerceProducts.active, true), eq(ecommerceProducts.status, "published"));
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
    await db.delete(ecommerceProducts).where(eq(ecommerceProducts.id, id));
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
    await db.delete(ecommerceCategories).where(eq(ecommerceCategories.id, id));
  }

  async findOrCreateCustomer(data: InsertEcommerceCustomer): Promise<EcommerceCustomer> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const [existing] = await db
      .select()
      .from(ecommerceCustomers)
      .where(eq(ecommerceCustomers.email, normalizedEmail))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(ecommerceCustomers)
        .set({ ...data, email: normalizedEmail, updatedAt: new Date() })
        .where(eq(ecommerceCustomers.id, existing.id))
        .returning();
      return updated;
    }
    const [customer] = await db.insert(ecommerceCustomers).values({ ...data, email: normalizedEmail }).returning();
    return customer;
  }

  async getCustomer(id: string): Promise<EcommerceCustomer | undefined> {
    const [customer] = await db.select().from(ecommerceCustomers).where(eq(ecommerceCustomers.id, id));
    return customer;
  }

  async getCoupons(): Promise<EcommerceCoupon[]> {
    return db.select().from(ecommerceCoupons).orderBy(desc(ecommerceCoupons.createdAt));
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
    await db.delete(ecommerceCoupons).where(eq(ecommerceCoupons.id, id));
  }

  async createOrder(data: InsertEcommerceOrder, items: InsertEcommerceOrderItem[]): Promise<EcommerceOrderWithDetails> {
    return db.transaction(async (tx) => {
      const [order] = await tx.insert(ecommerceOrders).values(data).returning();
      if (items.length) {
        await tx.insert(ecommerceOrderItems).values(items.map((item) => ({ ...item, orderId: order.id })));
      }
      if (data.couponCode) {
        const [coupon] = await tx
          .select()
          .from(ecommerceCoupons)
          .where(eq(ecommerceCoupons.code, data.couponCode));
        if (coupon) {
          await tx
            .update(ecommerceCoupons)
            .set({ timesUsed: sql`${ecommerceCoupons.timesUsed} + 1`, updatedAt: new Date() })
            .where(eq(ecommerceCoupons.id, coupon.id));
          await tx.insert(ecommerceCouponRedemptions).values({
            couponId: coupon.id,
            orderId: order.id,
            customerId: order.customerId,
            discountAmount: data.discountAmount ?? 0,
          });
        }
      }
      const orderItems = await tx.select().from(ecommerceOrderItems).where(eq(ecommerceOrderItems.orderId, order.id));
      const [customer] = await tx.select().from(ecommerceCustomers).where(eq(ecommerceCustomers.id, order.customerId));
      return { ...order, customer: customer ?? null, items: orderItems, refunds: [], shipments: [] };
    });
  }

  async getOrders(): Promise<EcommerceOrderWithDetails[]> {
    const orders = await db.select().from(ecommerceOrders).orderBy(desc(ecommerceOrders.createdAt));
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

  async getOrderForLookup(params: { orderId: string; email: string; token?: string }): Promise<EcommerceOrderWithDetails | undefined> {
    const details = await this.getOrderWithDetails(params.orderId);
    if (!details?.customer) return undefined;
    if (details.customer.email.toLowerCase() !== params.email.trim().toLowerCase()) return undefined;
    if (params.token && details.lookupToken !== params.token) return undefined;
    return details;
  }

  async getOrderWithDetails(id: string): Promise<EcommerceOrderWithDetails | undefined> {
    const [order] = await db.select().from(ecommerceOrders).where(eq(ecommerceOrders.id, id));
    if (!order) return undefined;
    const [customer, items, refunds, shipments] = await Promise.all([
      this.getCustomer(order.customerId),
      db.select().from(ecommerceOrderItems).where(eq(ecommerceOrderItems.orderId, id)),
      db.select().from(ecommerceRefunds).where(eq(ecommerceRefunds.orderId, id)),
      db.select().from(ecommerceShipments).where(eq(ecommerceShipments.orderId, id)),
    ]);
    return { ...order, customer: customer ?? null, items, refunds, shipments };
  }

  async updateOrder(id: string, data: Partial<InsertEcommerceOrder>): Promise<EcommerceOrder | undefined> {
    const [order] = await db
      .update(ecommerceOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceOrders.id, id))
      .returning();
    return order;
  }

  async updateOrderByPaymentIntent(paymentIntentId: string, data: Partial<InsertEcommerceOrder>): Promise<EcommerceOrder | undefined> {
    const [order] = await db
      .update(ecommerceOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ecommerceOrders.stripePaymentIntentId, paymentIntentId))
      .returning();
    return order;
  }

  async getProductsByIds(ids: string[]): Promise<EcommerceProduct[]> {
    if (ids.length === 0) return [];
    return db.select().from(ecommerceProducts).where(inArray(ecommerceProducts.id, ids));
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
    await db.delete(ecommerceShippingZones).where(eq(ecommerceShippingZones.id, id));
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
    await db.delete(ecommerceShippingRates).where(eq(ecommerceShippingRates.id, id));
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

  async markWebhookProcessed(provider: string, eventId: string, eventType: string): Promise<boolean> {
    const inserted = await db
      .insert(ecommerceProcessedWebhookEvents)
      .values({ provider, eventId, eventType })
      .onConflictDoNothing()
      .returning();
    return inserted.length > 0;
  }
}
