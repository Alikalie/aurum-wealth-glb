import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const question = String(body?.question ?? "").trim();
    if (!question || question.length < 3) {
      return new Response(JSON.stringify({ error: "Question too short" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (question.length > 2000) {
      return new Response(JSON.stringify({ error: "Question too long (2000 chars max)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check admin role — admins have unlimited free usage
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    const isAdmin = (roleRows ?? []).length > 0;

    // Rate limit: 3 per UTC day (admins bypass)
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count } = await admin
      .from("ai_consultations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("used_at", since.toISOString());
    if (!isAdmin && (count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Daily limit reached (3 questions per day). Try again tomorrow." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull rich context: profile, owned products, catalogue, payment options, support contact
    const [{ data: profile }, { data: userProducts }, { data: catalogue }, { data: payAccounts }, { data: support }] = await Promise.all([
      admin.from("profiles").select("first_name,country_code,country_name,currency,invested,earned,withdrawn,locked_bonus").eq("user_id", userId).maybeSingle(),
      admin.from("user_products").select("status,purchase_price,days_paid,total_earned,product_id,cycle_start_at,products(name,cycle_days,daily_income,price)").eq("user_id", userId).limit(20),
      admin.from("products").select("name,price,daily_income,cycle_days,expected_return_pct,purchase_limit,is_active").eq("is_active", true).order("price", { ascending: true }).limit(30),
      admin.from("admin_payment_accounts").select("method_type,label,country_code,account_name,is_active").eq("is_active", true).limit(60),
      admin.from("support_content").select("body").eq("id", 1).maybeSingle(),
    ]);

    const ctxLines: string[] = [];
    if (profile) {
      ctxLines.push(`User: ${profile.first_name ?? "investor"} (${profile.country_name ?? "—"} / ${profile.country_code ?? "—"}, currency ${profile.currency})`);
      ctxLines.push(`Wallet — invested: ${profile.invested}, earned: ${profile.earned}, withdrawn: ${profile.withdrawn}, locked bonus: ${profile.locked_bonus ?? 0} (all in ${profile.currency}).`);
    }
    if (userProducts && userProducts.length) {
      ctxLines.push("User's owned products:");
      for (const p of userProducts as any[]) {
        const name = p.products?.name ?? "Product";
        ctxLines.push(`- ${name} | status: ${p.status} | days paid: ${p.days_paid}/${p.products?.cycle_days ?? "?"} | total earned: ${p.total_earned}`);
      }
    } else {
      ctxLines.push("User currently owns no products.");
    }
    if (catalogue && catalogue.length) {
      ctxLines.push("Available product catalogue (USD prices — starter products are the cheapest):");
      for (const p of catalogue as any[]) {
        ctxLines.push(`- ${p.name}: $${p.price} → $${p.daily_income}/day × ${p.cycle_days} days (≈${p.expected_return_pct}% total). Limit: ${p.purchase_limit || "unlimited"}.`);
      }
    }
    if (payAccounts && payAccounts.length) {
      const local = (payAccounts as any[]).filter(a => !profile?.country_code || !a.country_code || a.country_code === profile.country_code);
      ctxLines.push("Deposit options available to this user:");
      const seen = new Set<string>();
      for (const a of local) {
        const key = `${a.method_type}-${a.label}`;
        if (seen.has(key)) continue; seen.add(key);
        ctxLines.push(`- ${a.method_type} · ${a.label}${a.country_code ? ` (country: ${a.country_code})` : " (global)"}`);
      }
      if (!local.length) ctxLines.push("- No deposit accounts currently configured for this country — direct user to contact support.");
    }
    if (support?.body) {
      ctxLines.push("Support / contact information (use when user asks how to reach admin/support):");
      ctxLines.push(String(support.body).slice(0, 600));
    }

    const userSystemPrompt = `You are Aurum's in-app investment consultant for END USERS. Your job: help the user understand how Aurum products work, which deposit methods apply to their country, how withdrawals/affiliate work, and guide them to a sensible starter product if they own none. You DO NOT give regulated financial advice, do not track external markets, and never promise returns. If the user asks how to contact support or admins, give them the exact support details from the context. Keep answers warm, practical, under 220 words. Never invent numbers, prices, or accounts — only use the context below.\n\n--- CONTEXT ---\n${ctxLines.join("\n")}`;

    const adminSystemPrompt = `You are Aurum's internal operations assistant for an ADMINISTRATOR. The viewer is verified as an admin of the platform. Answer operational questions about: managing users, approving/rejecting deposits & withdrawals, crediting or debiting user balances (for double-payment-proof corrections), editing payment methods / products / admin payment accounts even after locks, audit logs, affiliate management, and platform settings. You can reference the same product catalogue, payment accounts and support content as the user-facing assistant, but you should respond in an operational, concise, neutral tone — not a sales/coaching tone. If asked an end-user question, answer it but flag that this is the admin view. Never invent platform features that aren't in the context. Keep answers under 260 words.\n\n--- CONTEXT ---\n${ctxLines.join("\n")}`;

    const systemPrompt = isAdmin ? adminSystemPrompt : userSystemPrompt;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });
    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "AI is busy, please try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiResp.json();
    const response = aiJson?.choices?.[0]?.message?.content ?? "(no response)";

    await admin.from("ai_consultations").insert({ user_id: userId, question, response });

    const remaining = isAdmin ? null : Math.max(0, 3 - ((count ?? 0) + 1));
    return new Response(JSON.stringify({ response, remaining, unlimited: isAdmin }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-consultant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});