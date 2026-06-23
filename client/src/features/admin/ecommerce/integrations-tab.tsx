import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ECOMMERCE_INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  IntegrationCard,
  type IntegrationConfig,
  type IntegrationLibraryCategory,
  type SettingsData,
} from "@/features/admin/settings-page";

const ECOMMERCE_LIBRARY_CATEGORIES: Array<"All" | IntegrationLibraryCategory> = [
  "All",
  "Payment Gateways",
  "POS & Merchant Services",
  "Shipping & Fulfillment",
  "Social Commerce",
  "Marketing & Analytics",
  "Product Feeds",
  "Inventory & Operations",
  "Tax & Compliance",
  "Marketplaces",
];

const ECOMMERCE_LIBRARY_CATEGORY_DETAILS: Record<IntegrationLibraryCategory, string> = {
  "Payment Gateways": "Cards, wallets, BNPL, and hosted checkout providers.",
  "POS & Merchant Services": "In-person payment and merchant service systems.",
  "Shipping & Fulfillment": "Carrier rates, labels, tracking, and fulfillment workflows.",
  "Social Commerce": "Social pixels, conversion APIs, and commerce campaign signals.",
  "Marketing & Analytics": "Measurement, audiences, attribution, and lifecycle tools.",
  "Product Feeds": "Catalog publishing and merchant feed readiness.",
  "Inventory & Operations": "Inventory, warehouse, and order operations tools.",
  "Tax & Compliance": "Tax calculation, nexus, exemption, and compliance workflows.",
  Marketplaces: "Marketplace listings, orders, catalog sync, and channel operations.",
  Other: "Additional ecommerce extension points.",
};

function getIntegrationCategory(config: IntegrationConfig): IntegrationLibraryCategory {
  if (config.libraryCategory) return config.libraryCategory;
  if (config.group === "commerce") return "Payment Gateways";
  if (config.group === "shipping") return "Shipping & Fulfillment";
  if (config.group === "marketing") return "Marketing & Analytics";
  return "Other";
}

function hasSavedIntegrationSettings(config: IntegrationConfig, settings: SettingsData): boolean {
  return config.fields.some((field) => {
    const setting = settings[config.category]?.[field.key];
    return Boolean(setting?.value && setting.value !== "");
  });
}

function getEcommerceIntegrationLibrary(): IntegrationConfig[] {
  return INTEGRATIONS.filter((config) => {
    if (ECOMMERCE_INTEGRATION_CATEGORIES.has(config.category)) return true;
    return (
      ["commerce", "shipping", "marketing"].includes(config.group) && config.category !== "crm"
    );
  });
}

export function IntegrationsTab() {
  const { data: settings = {} } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<(typeof ECOMMERCE_LIBRARY_CATEGORIES)[number]>("All");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const ecommerceIntegrations = getEcommerceIntegrationLibrary();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const configuredCount = ecommerceIntegrations.filter((config) =>
    hasSavedIntegrationSettings(config, settings),
  );
  const filteredIntegrations = ecommerceIntegrations.filter((config) => {
    const libraryCategory = getIntegrationCategory(config);
    if (activeCategory !== "All" && libraryCategory !== activeCategory) return false;
    if (!normalizedSearch) return true;

    const searchable = [
      config.title,
      config.description,
      libraryCategory,
      config.group,
      config.badge ?? "",
      ...(config.capabilities ?? []),
      ...(config.supportedCapabilities ?? []),
      ...(config.supportedEvents ?? []),
      config.requiresAdapter ? "setup ready requires adapter" : "",
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  return (
    <div className="space-y-6" data-testid="ecommerce-integrations-library">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">Ecommerce Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Browse payment, shipping, product feed, social commerce, and marketing extensions for
            this store. {configuredCount.length} of {ecommerceIntegrations.length} integrations have
            saved settings.
          </p>
        </div>
        <div className="relative w-full xl:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search integrations, capabilities, or categories"
            className="pl-9"
            data-testid="input-ecommerce-integration-search"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Ecommerce integration categories">
        {ECOMMERCE_LIBRARY_CATEGORIES.map((category) => {
          const count =
            category === "All"
              ? ecommerceIntegrations.length
              : ecommerceIntegrations.filter(
                  (config) => getIntegrationCategory(config) === category,
                ).length;
          if (count === 0 && category !== "All") return null;
          const isActive = category === activeCategory;
          return (
            <Button
              key={category}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category)}
              data-testid={`button-ecommerce-integration-category-${category
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`}
            >
              {category}
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className={cn("ml-2", isActive && "bg-background/20 text-primary-foreground")}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredIntegrations.map((config) => {
          const Icon = config.icon;
          const BrandIcon = config.brandIcon;
          const libraryCategory = getIntegrationCategory(config);
          const isConfigured = hasSavedIntegrationSettings(config, settings);

          return (
            <button
              key={config.category}
              type="button"
              onClick={() => setSelectedIntegration(config)}
              className="group flex h-full flex-col rounded-lg border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              data-testid={`button-ecommerce-integration-${config.category}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                    {BrandIcon ? (
                      <BrandIcon
                        aria-label={`${config.title} logo`}
                        className={cn("h-7 w-7", config.brandColor || "text-primary")}
                      />
                    ) : config.logoText ? (
                      <span
                        aria-label={`${config.title} logo`}
                        className={cn(
                          "px-1 text-center text-[10px] font-bold leading-tight tracking-normal",
                          config.brandColor || "text-primary",
                        )}
                      >
                        {config.logoText}
                      </span>
                    ) : (
                      <Icon className={cn("h-6 w-6", config.brandColor || "text-primary")} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {config.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={isConfigured ? "default" : "outline"}
                  className="flex-shrink-0"
                  data-testid={`badge-ecommerce-integration-status-${config.category}`}
                >
                  {isConfigured ? "Configured" : "Available"}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{libraryCategory}</Badge>
                {config.badge ? <Badge variant="outline">{config.badge}</Badge> : null}
                {config.requiresAdapter ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                    Setup ready
                  </Badge>
                ) : config.operational ? (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    Operational
                  </Badge>
                ) : null}
              </div>
              {config.capabilities?.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {config.capabilities.slice(0, 4).map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">
                {ECOMMERCE_LIBRARY_CATEGORY_DETAILS[libraryCategory]}
              </p>
            </button>
          );
        })}
      </div>

      {filteredIntegrations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">No integrations found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or choose another category.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Sheet
        open={Boolean(selectedIntegration)}
        onOpenChange={(open) => {
          if (!open) setSelectedIntegration(null);
        }}
      >
        <SheetContent side="right" size="full" className="overflow-y-auto">
          {selectedIntegration ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedIntegration.title}</SheetTitle>
                <SheetDescription>
                  Configure {getIntegrationCategory(selectedIntegration).toLowerCase()} settings for
                  ecommerce workflows.
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <IntegrationCard
                  key={selectedIntegration.category}
                  config={selectedIntegration}
                  settings={settings}
                />
              </SheetBody>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
