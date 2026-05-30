import { Link, useSearch } from "wouter";
import { CheckCircle } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OrderSuccessPage() {
  const params = new URLSearchParams(useSearch());
  const orderId = params.get("orderId") || "";
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const statusHref = `/orders/status?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Card>
          <CardContent className="space-y-6 p-10 text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-emerald-600" />
            <div>
              <h1 className="font-heading text-3xl font-semibold">Order created</h1>
              <p className="mt-2 text-muted-foreground">Your secure payment has been initialized. Save your order lookup details.</p>
            </div>
            {orderId ? <p className="rounded-md bg-muted p-3 font-mono text-sm">#{orderId}</p> : null}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild><Link href={statusHref}>View order status</Link></Button>
              <Button asChild variant="outline"><Link href="/shop">Continue shopping</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
