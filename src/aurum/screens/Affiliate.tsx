import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { supabase } from "@/integrations/supabase/client";

export function Affiliate({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast } = useAurum();
  const [aff, setAff] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWd, setShowWd] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [country, setCountry] = useState(profile?.country_name || "");
  const [promoCode, setPromoCode] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [wdAmount, setWdAmount] = useState("");

  if (!user) {
    return (
      <ScreenShell title="Affiliate Program" onBack={() => nav("dashboard")}>
        <p style={{ color: G.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 22px" }}>
          Sign in or create an account to apply for the affiliate program.
        </p>
        <button style={{ ...s.btnGold, marginBottom: 10 }} onClick={() => nav("register")}>Create account</button>
        <button style={s.btnGhost} onClick={() => nav("login")}>Sign in</button>
      </ScreenShell>
    );
  }

  const load = async () => {
    setLoading(true);
    const { count } = await supabase.from("user_products").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setProductCount(count ?? 0);
    const { data: a } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
    setAff(a);
    const { data: ap } = await supabase.from("affiliate_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).maybeSingle();
    setApp(ap);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const eligible = productCount >= 5;

  const submitApplication = async () => {
    if (!fullName.trim() || !country.trim() || !promoCode.trim() || !paymentAccount.trim()) {
      toast("Fill all fields"); return;
    }
    const code = promoCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) { toast("Promo code: 4–12 letters/numbers"); return; }
    const { error } = await supabase.from("affiliate_applications").insert({
      user_id: user.id, full_name: fullName.trim(), country: country.trim(),
      promo_code: code, payment_account: paymentAccount.trim(), status: "pending",
    });
    if (error) { toast(error.message); return; }
    toast("Application submitted — admin will review");
    setShowForm(false); load();
  };

  const requestWithdraw = async () => {
    const amt = Number(wdAmount);
    if (!amt || amt < 30) { toast("Minimum withdrawal is $30"); return; }
    if (!aff?.payment_account) { toast("No payment account on file — contact admin"); return; }
    const { error } = await supabase.from("affiliate_withdrawals").insert({
      user_id: user.id, amount: amt, payment_account: aff.payment_account, status: "pending",
    });
    if (error) { toast(error.message); return; }
    toast("Withdrawal requested");
    setShowWd(false); setWdAmount(""); load();
  };

  if (loading) return <ScreenShell title="Affiliate" onBack={() => nav("dashboard")}><div style={{ color: G.muted, fontSize: 13 }}>Loading…</div></ScreenShell>;

  // CASE A: approved affiliate — show dashboard
  if (aff && app?.status === "approved") {
    const balance = Number(aff.available_balance || 0);
    const link = `${window.location.origin}/?ref=${aff.code}`;
    return (
      <ScreenShell title="Affiliate Dashboard" onBack={() => nav("dashboard")}>
        <div style={{ ...s.card, padding: 18, marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>AVAILABLE COMMISSION</div>
          <div style={{ ...s.serif, fontSize: 30, fontWeight: 700, color: G.gold, margin: "6px 0 4px" }}>${balance.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: G.muted }}>Withdraw at $30 or above</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
            <div style={{ ...s.serif, fontSize: 18, fontWeight: 700 }}>{aff.total_referrals ?? 0}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Referrals</div>
          </div>
          <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
            <div style={{ ...s.serif, fontSize: 18, fontWeight: 700, color: G.green }}>${Number(aff.total_commission || 0).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Total earned</div>
          </div>
        </div>

        <label style={s.label}>YOUR PROMO CODE</label>
        <div style={{ ...s.input, fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: G.gold, textAlign: "center", letterSpacing: 2 }}>{aff.code}</div>

        <label style={{ ...s.label, marginTop: 14 }}>SHARE LINK</label>
        <div style={{ ...s.input, fontSize: 12, color: G.muted, wordBreak: "break-all" }}>{link}</div>
        <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={async () => { try { await navigator.clipboard.writeText(link); toast("Copied"); } catch { toast("Copy failed"); } }}>Copy link</button>

        <label style={{ ...s.label, marginTop: 16 }}>PAYMENT ACCOUNT (LOCKED)</label>
        <div style={{ ...s.input, color: G.muted, fontSize: 13 }}>🔒 {aff.payment_account || "—"}</div>
        <p style={{ fontSize: 11, color: G.muted, margin: "6px 2px 0" }}>To change your payment account, contact admin.</p>

        {!showWd ? (
          <button style={{ ...s.btnGold, marginTop: 18 }} onClick={() => setShowWd(true)} disabled={balance < 30}>
            {balance < 30 ? `Need $${(30 - balance).toFixed(2)} more to withdraw` : "Withdraw commission"}
          </button>
        ) : (
          <div style={{ ...s.card, marginTop: 16 }}>
            <label style={s.label}>AMOUNT (USD)</label>
            <input style={s.input} type="number" min={30} max={balance} value={wdAmount} onChange={e => setWdAmount(e.target.value)} placeholder="30.00" />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={s.btnGhost} onClick={() => setShowWd(false)}>Cancel</button>
              <button style={s.btnGold} onClick={requestWithdraw}>Submit request</button>
            </div>
          </div>
        )}
      </ScreenShell>
    );
  }

  // CASE B: application pending or rejected
  if (app && app.status === "pending") {
    return (
      <ScreenShell title="Affiliate Application" onBack={() => nav("dashboard")}>
        <div style={{ ...s.card, padding: 22, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
          <div style={{ ...s.serif, fontSize: 18, fontWeight: 600 }}>Pending review</div>
          <p style={{ color: G.muted, fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
            Your application is being reviewed by our team. You'll be notified once approved.
          </p>
          <div style={{ fontSize: 12, color: G.muted, marginTop: 14, textAlign: "left" }}>
            <div>Promo code requested: <strong style={{ color: G.gold, fontFamily: "monospace" }}>{app.promo_code}</strong></div>
            <div style={{ marginTop: 4 }}>Submitted: {new Date(app.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </ScreenShell>
    );
  }
  if (app && app.status === "rejected") {
    return (
      <ScreenShell title="Affiliate Application" onBack={() => nav("dashboard")}>
        <div style={{ ...s.card, padding: 22 }}>
          <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, color: G.red }}>Application declined</div>
          {app.admin_note && <p style={{ color: G.muted, fontSize: 13, marginTop: 8, fontStyle: "italic" }}>{app.admin_note}</p>}
          <button style={{ ...s.btnGold, marginTop: 14 }} onClick={() => setShowForm(true)}>Re-apply</button>
        </div>
        {showForm && <ApplicationForm fullName={fullName} setFullName={setFullName} country={country} setCountry={setCountry} promoCode={promoCode} setPromoCode={setPromoCode} paymentAccount={paymentAccount} setPaymentAccount={setPaymentAccount} onSubmit={submitApplication} s={s} G={G} />}
      </ScreenShell>
    );
  }

  // CASE C: no application yet
  return (
    <ScreenShell title="Affiliate Program" onBack={() => nav("dashboard")}>
      <p style={{ color: G.muted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Become an Aurum affiliate. Share your promo code — earn <strong style={{ color: G.gold }}>$3</strong> for every referred user who makes their first deposit.
      </p>

      <div style={{ ...s.card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, letterSpacing: 0.4 }}>ELIGIBILITY</div>
        <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, marginTop: 4, color: eligible ? G.green : G.text }}>
          {productCount} / 5 products purchased
        </div>
        <div style={{ height: 6, background: G.bg, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (productCount / 5) * 100)}%`, height: "100%", background: eligible ? G.green : G.gold }} />
        </div>
        <p style={{ fontSize: 11, color: G.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
          {eligible ? "✓ You qualify! Apply below." : `Buy ${5 - productCount} more product${5 - productCount === 1 ? "" : "s"} to unlock the application.`}
        </p>
      </div>

      {eligible && !showForm && (
        <button style={s.btnGold} onClick={() => setShowForm(true)}>Apply for affiliate access</button>
      )}
      {eligible && showForm && (
        <ApplicationForm fullName={fullName} setFullName={setFullName} country={country} setCountry={setCountry} promoCode={promoCode} setPromoCode={setPromoCode} paymentAccount={paymentAccount} setPaymentAccount={setPaymentAccount} onSubmit={submitApplication} s={s} G={G} />
      )}
    </ScreenShell>
  );
}

function ApplicationForm({ fullName, setFullName, country, setCountry, promoCode, setPromoCode, paymentAccount, setPaymentAccount, onSubmit, s, G }: any) {
  return (
    <div style={{ ...s.card, marginTop: 16 }}>
      <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Application details</div>
      <label style={s.label}>FULL NAME</label>
      <input style={s.input} value={fullName} onChange={(e: any) => setFullName(e.target.value)} maxLength={80} />
      <label style={{ ...s.label, marginTop: 12 }}>COUNTRY</label>
      <input style={s.input} value={country} onChange={(e: any) => setCountry(e.target.value)} maxLength={60} />
      <label style={{ ...s.label, marginTop: 12 }}>PREFERRED PROMO CODE</label>
      <input style={{ ...s.input, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1.5 }} value={promoCode} onChange={(e: any) => setPromoCode(e.target.value.toUpperCase())} placeholder="e.g. JANE2025" maxLength={12} />
      <p style={{ fontSize: 10, color: G.muted, margin: "4px 2px 0" }}>4–12 letters and numbers. New users use this code at signup.</p>
      <label style={{ ...s.label, marginTop: 12 }}>PAYMENT ACCOUNT FOR COMMISSIONS</label>
      <textarea style={{ ...s.input, minHeight: 70, fontFamily: "inherit" }} value={paymentAccount} onChange={(e: any) => setPaymentAccount(e.target.value)} placeholder="PayPal email, mobile money number with provider, or bank details" />
      <p style={{ fontSize: 10, color: G.muted, margin: "4px 2px 0" }}>Locked once approved — contact admin to change.</p>
      <button style={{ ...s.btnGold, marginTop: 14 }} onClick={onSubmit}>Submit application</button>
    </div>
  );
}
