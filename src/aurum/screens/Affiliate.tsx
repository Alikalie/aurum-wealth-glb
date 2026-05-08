import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { MOBILE_MONEY, BANKS } from "../data";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Building2, CreditCard, AlertTriangle, Lock } from "lucide-react";

export function Affiliate({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast } = useAurum();
  const [aff, setAff] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWd, setShowWd] = useState(false);
  const [confirmWd, setConfirmWd] = useState(false);
  const [pmList, setPmList] = useState<any[]>([]);
  const [wdPmId, setWdPmId] = useState<string>("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [wdHistory, setWdHistory] = useState<any[]>([]);

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [country, setCountry] = useState(profile?.country_name || "");
  const [promoCode, setPromoCode] = useState("");
  const [payMethod, setPayMethod] = useState<"mobile_money" | "bank" | "paypal">("mobile_money");
  const [payProvider, setPayProvider] = useState("");
  const [payNumber, setPayNumber] = useState("");
  const [payHolder, setPayHolder] = useState(profile?.full_name || "");
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
    if (a) {
      const { data: simpleRefs } = await supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }).limit(20);
      const refList = simpleRefs ?? [];
      if (refList.length > 0) {
        const ids = refList.map(r => r.referred_user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
        const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
        setReferrals(refList.map(r => ({ ...r, _profile: pmap.get(r.referred_user_id) })));
      } else setReferrals([]);
      const { data: tx } = await supabase
        .from("transactions")
        .select("id,amount,note,created_at,kind")
        .eq("user_id", user.id)
        .eq("kind", "admin_credit")
        .ilike("note", "%Affiliate%")
        .order("created_at", { ascending: false })
        .limit(20);
      setCommissions(tx ?? []);
      const { data: wds } = await supabase
        .from("affiliate_withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setWdHistory(wds ?? []);
      const { data: pms } = await supabase.from("payment_methods").select("*").eq("user_id", user.id);
      setPmList(pms ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const eligible = productCount >= 5;

  const submitApplication = async () => {
    if (!fullName.trim() || !country.trim() || !promoCode.trim()) {
      toast("Fill all fields"); return;
    }
    const code = promoCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) { toast("Promo code: 4–12 letters/numbers"); return; }
    if (!payHolder.trim()) { toast("Enter account holder name"); return; }
    if (payMethod !== "paypal" && !payProvider.trim()) { toast("Select a provider"); return; }
    if (!payNumber.trim()) { toast(payMethod === "paypal" ? "Enter PayPal email" : "Enter account number"); return; }
    if (payMethod === "paypal" && !payNumber.includes("@")) { toast("Enter valid PayPal email"); return; }
    const methodLabel = payMethod === "mobile_money" ? "Mobile Money" : payMethod === "bank" ? "Bank" : "PayPal";
    const paymentAccount = `${methodLabel} — ${payMethod === "paypal" ? "PayPal" : payProvider} | ${payNumber.trim()} | ${payHolder.trim()}`;
    const ok = window.confirm(`⚠️ FINAL WARNING\n\nYour commission account will be LOCKED for 365 days.\n\n${paymentAccount}\n\nIs every detail correct?`);
    if (!ok) return;
    const { error } = await supabase.from("affiliate_applications").insert({
      user_id: user.id, full_name: fullName.trim(), country: country.trim(),
      promo_code: code, payment_account: paymentAccount, status: "pending",
    });
    if (error) { toast(error.message); return; }
    toast("Application submitted — admin will review");
    setShowForm(false); load();
  };

  const requestWithdraw = async () => {
    const amt = Number(wdAmount);
    if (!amt || amt < 30) { toast("Minimum withdrawal is $30"); return; }
    const account = wdPmId
      ? (() => { const p = pmList.find(x => x.id === wdPmId); return p ? `${p.method_type} — ${p.provider_name || ""} | ${p.account_number || p.paypal_email} | ${p.account_holder_name}` : aff?.payment_account; })()
      : aff?.payment_account;
    if (!account) { toast("No payment account on file — contact admin"); return; }
    const { error } = await supabase.from("affiliate_withdrawals").insert({
      user_id: user.id, amount: amt, payment_account: account, status: "pending",
    });
    if (error) { toast(error.message); return; }
    toast("Withdrawal requested");
    setShowWd(false); setConfirmWd(false); setWdAmount(""); setWdPmId(""); load();
  };

  if (loading) return <ScreenShell title="Affiliate" onBack={() => nav("dashboard")}><div style={{ color: G.muted, fontSize: 13 }}>Loading…</div></ScreenShell>;

  // CASE A: approved affiliate — show dashboard (treat presence of an `aff` row as approved)
  if (aff) {
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
        ) : !confirmWd ? (
          <div style={{ ...s.card, marginTop: 16 }}>
            <div style={{ ...s.serif, fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Withdraw commission</div>
            <label style={s.label}>AMOUNT (USD)</label>
            <input style={s.input} type="number" min={30} max={balance} value={wdAmount} onChange={e => setWdAmount(e.target.value)} placeholder="30.00" />
            <label style={{ ...s.label, marginTop: 12 }}>SEND TO</label>
            <select style={{ ...s.input, appearance: "none" }} value={wdPmId} onChange={e => setWdPmId(e.target.value)}>
              <option value="">Locked affiliate account ({aff.payment_account?.slice(0, 32)}…)</option>
              {pmList.map(p => (
                <option key={p.id} value={p.id}>{p.method_type} — {p.provider_name || ""} {p.account_number || p.paypal_email}</option>
              ))}
            </select>
            <p style={{ fontSize: 10, color: G.muted, margin: "6px 2px 0" }}>Default uses your locked affiliate account. Pick a saved wallet to override.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={s.btnGhost} onClick={() => { setShowWd(false); setWdAmount(""); }}>Cancel</button>
              <button style={s.btnGold} onClick={() => {
                const amt = Number(wdAmount);
                if (!amt || amt < 30) { toast("Minimum withdrawal is $30"); return; }
                if (amt > balance) { toast("Amount exceeds available balance"); return; }
                setConfirmWd(true);
              }}>Review</button>
            </div>
          </div>
        ) : (
          <div style={{ ...s.card, marginTop: 16 }}>
            <div style={{ ...s.serif, fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Confirm withdrawal</div>
            <div style={{ background: G.bg, borderRadius: 10, padding: 12, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ color: G.muted }}>Amount</span><strong>${Number(wdAmount).toFixed(2)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12 }}><span style={{ color: G.muted, flexShrink: 0 }}>To</span><span style={{ textAlign: "right", wordBreak: "break-word" }}>{wdPmId ? (() => { const p = pmList.find(x => x.id === wdPmId); return p ? `${p.method_type} · ${p.account_number || p.paypal_email}` : ""; })() : aff.payment_account}</span></div>
            </div>
            <p style={{ fontSize: 11, color: G.muted, margin: "10px 2px" }}>Once submitted, an admin will review and approve. Make sure the destination is correct.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button style={s.btnGhost} onClick={() => setConfirmWd(false)}>Back</button>
              <button style={s.btnGold} onClick={requestWithdraw}>Confirm & submit</button>
            </div>
          </div>
        )}

        {/* Referrals list */}
        <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Your referrals ({referrals.length})</div>
        {referrals.length === 0 ? (
          <div style={{ ...s.card, padding: 14, fontSize: 12, color: G.muted }}>No referrals yet — share your code to earn commission.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {referrals.map((r: any) => (
              <div key={r.id} style={{ ...s.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r._profile?.full_name || r._profile?.email || "User"}</div>
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right", marginLeft: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.first_deposit_bonus_paid ? G.green : G.muted }}>
                    {r.first_deposit_bonus_paid ? "Paid" : "Pending"}
                  </div>
                  <div style={{ fontSize: 11, color: G.gold, marginTop: 2 }}>${Number(r.total_commission || 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Commission history */}
        <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, marginTop: 22, marginBottom: 8 }}>Commission history</div>
        {commissions.length === 0 ? (
          <div style={{ ...s.card, padding: 14, fontSize: 12, color: G.muted }}>No commissions yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {commissions.map((c: any) => (
              <div key={c.id} style={{ ...s.card, padding: 10, display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: G.muted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.note || "Commission"}<div style={{ fontSize: 10, marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString()}</div></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.green }}>+${Number(c.amount).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Withdrawal history */}
        <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, marginTop: 22, marginBottom: 8 }}>Withdrawal requests</div>
        {wdHistory.length === 0 ? (
          <div style={{ ...s.card, padding: 14, fontSize: 12, color: G.muted }}>No withdrawal requests yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {wdHistory.map((w: any) => (
              <div key={w.id} style={{ ...s.card, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>${Number(w.amount).toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{new Date(w.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: w.status === "approved" ? G.green : w.status === "rejected" ? G.red : G.gold, textTransform: "uppercase" }}>{w.status}</div>
              </div>
            ))}
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
        {showForm && <ApplicationForm fullName={fullName} setFullName={setFullName} country={country} setCountry={setCountry} promoCode={promoCode} setPromoCode={setPromoCode} payMethod={payMethod} setPayMethod={setPayMethod} payProvider={payProvider} setPayProvider={setPayProvider} payNumber={payNumber} setPayNumber={setPayNumber} payHolder={payHolder} setPayHolder={setPayHolder} countryCode={profile?.country_code || ""} onSubmit={submitApplication} s={s} G={G} />}
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
        <ApplicationForm fullName={fullName} setFullName={setFullName} country={country} setCountry={setCountry} promoCode={promoCode} setPromoCode={setPromoCode} payMethod={payMethod} setPayMethod={setPayMethod} payProvider={payProvider} setPayProvider={setPayProvider} payNumber={payNumber} setPayNumber={setPayNumber} payHolder={payHolder} setPayHolder={setPayHolder} countryCode={profile?.country_code || ""} onSubmit={submitApplication} s={s} G={G} />
      )}
    </ScreenShell>
  );
}

function ApplicationForm({ fullName, setFullName, country, setCountry, promoCode, setPromoCode, payMethod, setPayMethod, payProvider, setPayProvider, payNumber, setPayNumber, payHolder, setPayHolder, countryCode, onSubmit, s, G }: any) {
  const providerOptions = payMethod === "mobile_money" ? MOBILE_MONEY[countryCode] ?? [] : payMethod === "bank" ? BANKS[countryCode] ?? [] : [];
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

      <div style={{ background: "#fff3cd22", border: `1px solid ${G.gold}`, borderRadius: 10, padding: 12, marginTop: 16, display: "flex", gap: 8 }}>
        <AlertTriangle size={18} color={G.gold} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11, lineHeight: 1.5, color: G.text }}>
          <strong style={{ color: G.gold }}>STRONG WARNING</strong> — this commission account will be <strong>LOCKED for 365 days</strong> after approval. All commission payouts go here. Verify carefully — wrong details = lost funds. To change, contact admin.
        </div>
      </div>

      <label style={{ ...s.label, marginTop: 14 }}>COMMISSION PAYMENT METHOD</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[
          { v: "mobile_money", l: "Mobile Money", I: Smartphone },
          { v: "bank", l: "Bank", I: Building2 },
          { v: "paypal", l: "PayPal", I: CreditCard },
        ].map(m => {
          const active = payMethod === m.v;
          const Icon = m.I;
          return (
            <button key={m.v} onClick={() => { setPayMethod(m.v); setPayProvider(""); setPayNumber(""); }}
              style={{ flex: 1, padding: "10px 4px", background: active ? G.gold : "transparent", color: active ? "#1a1208" : G.text, border: `1px solid ${active ? G.gold : G.border}`, borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Icon size={18} />{m.l}
            </button>
          );
        })}
      </div>

      {payMethod !== "paypal" && (
        <>
          <label style={s.label}>{payMethod === "mobile_money" ? "PROVIDER" : "BANK"}</label>
          {providerOptions.length > 0 ? (
            <select style={{ ...s.input, appearance: "none" }} value={payProvider} onChange={(e: any) => setPayProvider(e.target.value)}>
              <option value="">Select…</option>
              {providerOptions.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input style={s.input} placeholder="Provider name" value={payProvider} onChange={(e: any) => setPayProvider(e.target.value)} />
          )}
        </>
      )}
      <label style={{ ...s.label, marginTop: 10 }}>{payMethod === "paypal" ? "PAYPAL EMAIL" : payMethod === "mobile_money" ? "PHONE / ACCOUNT NUMBER" : "ACCOUNT NUMBER"}</label>
      <input style={s.input} value={payNumber} onChange={(e: any) => setPayNumber(e.target.value)} placeholder={payMethod === "paypal" ? "you@example.com" : ""} />
      <label style={{ ...s.label, marginTop: 10 }}>ACCOUNT HOLDER NAME</label>
      <input style={s.input} value={payHolder} onChange={(e: any) => setPayHolder(e.target.value)} />

      <button style={{ ...s.btnGold, marginTop: 14 }} onClick={onSubmit}>Submit application</button>
    </div>
  );
}
