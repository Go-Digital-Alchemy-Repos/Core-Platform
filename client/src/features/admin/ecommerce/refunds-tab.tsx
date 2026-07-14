import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

function cents(value: string): number {
  return Math.round((Number(value) || 0) * 100);
}

export function RefundsTab() {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("manual");
  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/ecommerce/refunds", {
        orderId,
        amount: cents(amount),
        source,
        type: "partial",
      }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2 className="h-5 w-5 text-rose-600" /> Refunds
        </CardTitle>
        <CardDescription>
          Record external refunds or process a gateway-backed refund when that payment provider has
          an operational adapter.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Gateway refund readiness</p>
              <p className="mt-1">
                Stripe refunds are operational through the Refunds API. PayPal, Square,
                Authorize.net, Braintree, Adyen, Amazon Pay, Klarna, and Afterpay are
                credential-ready but blocked until their provider-specific refund adapters are
                implemented and tested. Apple Pay and Google Pay refunds run through the underlying
                processor.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_260px_auto]">
          <div className="space-y-2">
            <Label>Order ID</Label>
            <Input
              placeholder="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Refund source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual / external record</SelectItem>
                <SelectItem value="stripe">
                  Stripe API <Badge className="ml-2">Operational</Badge>
                </SelectItem>
                <SelectItem value="paypal">PayPal API - adapter pending</SelectItem>
                <SelectItem value="square">Square API - adapter pending</SelectItem>
                <SelectItem value="authorize_net">Authorize.net API - adapter pending</SelectItem>
                <SelectItem value="braintree">Braintree API - adapter pending</SelectItem>
                <SelectItem value="adyen">Adyen API - adapter pending</SelectItem>
                <SelectItem value="amazon_pay">Amazon Pay API - adapter pending</SelectItem>
                <SelectItem value="klarna">Klarna API - adapter pending</SelectItem>
                <SelectItem value="afterpay">Afterpay API - adapter pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              Create refund
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
