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
  return (await res.json()).access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getAccessToken();
    const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const cap = await capRes.json();
    if (!capRes.ok) {
      return new Response(JSON.stringify({ error: "Capture failed", details: cap }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const pu = cap.purchase_units?.[0];
    const capture = pu?.payments?.captures?.[0];
    const status = capture?.status;
    const amountUsd = Number(capture?.amount?.value ?? 0);
    const customId = pu?.payments?.captures?.[0]?.custom_id ?? pu?.custom_id;

    if (status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Payment not completed", status }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (customId && customId !== user.id) {
      return new Response(JSON.stringify({ error: "User mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotency: skip if this PayPal capture was already recorded.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const note = `PayPal capture ${capture.id}`;
    const { data: existing } = await admin.from("deposits").select("id").eq("admin_note", note).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, deposit_id: existing.id, already: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Convert USD to user's local currency for the deposit amount stored
    const { data: profile } = await admin.from("profiles").select("currency").eq("user_id", user.id).maybeSingle();
    const currency = profile?.currency ?? "USD";
    const { data: fx } = await admin.from("fx_rates").select("rate").eq("currency", currency).maybeSingle();
    const rate = Number(fx?.rate ?? 1) || 1;
    const amountLocal = Math.round(amountUsd * rate * 100) / 100;

    // Insert deposit as pending then approve (so on_deposit_approved trigger runs and credits balance)
    const { data: dep, error: depErr } = await admin.from("deposits").insert({
      user_id: user.id,
      amount: amountLocal,
      method_type: "paypal",
      status: "pending",
      admin_note: note,
    }).select("id").single();
    if (depErr) throw depErr;

    const { error: updErr } = await admin.from("deposits").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      admin_note: note + " (auto-approved)",
    }).eq("id", dep.id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true, deposit_id: dep.id, amount_usd: amountUsd, amount_local: amountLocal, currency }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});