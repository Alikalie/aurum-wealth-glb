import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = (Deno.env.get("PAYPAL_MODE") ?? "sandbox").toLowerCase() === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${id}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = await res.json();
  if (!res.ok) throw new Error("PayPal auth failed: " + JSON.stringify(json));
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const amountUsd = Number(body?.amount_usd);
    const returnUrl: string = body?.return_url;
    const cancelUrl: string = body?.cancel_url;
    if (!amountUsd || amountUsd <= 0) return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!returnUrl || !cancelUrl) return new Response(JSON.stringify({ error: "Missing return URLs" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getAccessToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: amountUsd.toFixed(2) },
          custom_id: user.id,
          description: "Aurum deposit",
        }],
        application_context: {
          brand_name: "Aurum",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error("Create order failed: " + JSON.stringify(order));
    const approve = order.links?.find((l: any) => l.rel === "approve")?.href;
    return new Response(JSON.stringify({ order_id: order.id, approve_url: approve }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});