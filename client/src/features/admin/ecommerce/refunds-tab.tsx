import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

function cents(value: string): number {
  return Math.round((Number(value) || 0) * 100);
}

export function RefundsTab() {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/ecommerce/refunds", {
        orderId,
        amount: cents(amount),
        source: "manual",
        type: "partial",
      }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2 className="h-5 w-5" /> Refunds
        </CardTitle>
        <CardDescription>
          Create a manual refund record or Stripe refund when a payment intent exists.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_180px_auto]">
        <Input
          placeholder="Order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Create refund
        </Button>
      </CardContent>
    </Card>
  );
}
