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

    // Pull lightweight user context for personalization
    const [{ data: profile }, { data: products }] = await Promise.all([
      admin.from("profiles").select("first_name,country_name,currency,invested,earned,withdrawn,locked_bonus").eq("user_id", userId).maybeSingle(),
      admin.from("user_products").select("status,purchase_price,days_paid,total_earned,product_id,cycle_start_at,products(name,cycle_days,daily_income,price)").eq("user_id", userId).limit(20),
    ]);

    const ctxLines: string[] = [];
    if (profile) {
      ctxLines.push(`User: ${profile.first_name ?? "investor"} (${profile.country_name ?? "—"}, currency ${profile.currency})`);
      ctxLines.push(`Wallet — invested: ${profile.invested}, earned: ${profile.earned}, withdrawn: ${profile.withdrawn}, locked bonus: ${profile.locked_bonus ?? 0} (all in ${profile.currency}).`);
    }
    if (products && products.length) {
      ctxLines.push("Active/owned products:");
      for (const p of products as any[]) {
        const name = p.products?.name ?? "Product";
        ctxLines.push(`- ${name} | status: ${p.status} | days paid: ${p.days_paid}/${p.products?.cycle_days ?? "?"} | total earned: ${p.total_earned}`);
      }
    } else {
      ctxLines.push("User currently owns no products.");
    }

    const systemPrompt = `You are Aurum's in-app investment consultant. You guide users on how Aurum's daily-earning products work and help them think through their investment choices. You DO NOT track external markets, give regulated financial advice, or promise returns. Always reference the user's own context below when relevant. Keep answers concise (under 220 words), warm, and practical. If asked about a specific product they own, explain how it works for them (cycle days, daily income, total earned so far). Never invent numbers — only use the context provided.\n\n--- USER CONTEXT ---\n${ctxLines.join("\n")}`;

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