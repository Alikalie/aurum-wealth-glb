import { useEffect, useRef, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";

type Method = "mobile_money" | "bank" | "paypal";

export function Deposit({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("mobile_money");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [chosen, setChosen] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const country = profile?.country_code;
    let q = supabase.from("admin_payment_accounts").select("*").eq("is_active", true).eq("method_type", method);
    q.then(({ data }) => {
      const all = data ?? [];
      // Prefer country-specific accounts, fall back to global ones (country_code null)
      const filtered = country
        ? all.filter((a: any) => !a.country_code || a.country_code === country)
        : all;
      const list = filtered.length > 0 ? filtered : all;
      setAccounts(list);
      setChosen(list[0] ?? null);
    });
  }, [method, profile?.country_code]);

  const upload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (error) { toast(error.message); return; }
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    setProofUrl(data.publicUrl);
    toast("Proof uploaded");
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast("Copied"); };

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast("Enter a valid amount"); return; }
    if (!chosen) { toast("No deposit account available — contact support"); return; }
    if (!proofUrl) { toast("Upload your payment proof first"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({ user_id: user.id, amount: amt, method_type: method, admin_account_id: chosen.id, proof_url: proofUrl });
    setSubmitting(false);
    if (error) { toast(error.message); return; }
    setStep(4);
  };

  return (
    <ScreenShell title="Deposit Funds" onBack={() => nav("dashboard")}>
      {step === 1 && (
        <>
          <p style={{ color: G.muted, fontSize: 13, margin: "0 0 16px" }}>Enter the amount you want to deposit.</p>
          <label style={s.label}>AMOUNT ({cur})</label>
          <input style={{ ...s.input, fontSize: 22, textAlign: "center" }} type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[50, 100, 500, 1000].map(v => <button key={v} onClick={() => setAmount(String(v))} style={{ ...s.btnGhost, padding: 10, fontSize: 12 }}>+{v}</button>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
            <button style={s.btnGhost} onClick={() => nav("dashboard")}>Cancel</button>
            <button style={s.btnGold} onClick={() => { if (!Number(amount)) { toast("Enter amount"); return; } setStep(2); }}>Continue</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ color: G.muted, fontSize: 13, margin: "0 0 16px" }}>Choose how you'll send the {fmtMoney(Number(amount), cur)}.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["mobile_money", "bank", "paypal"] as Method[]).map(m => (
              <button key={m} onClick={() => setMethod(m)} style={{ ...s.btnGhost, borderColor: method === m ? G.gold : G.border, color: method === m ? G.gold : G.text }}>
                {m === "mobile_money" ? "📱 Mobile Money" : m === "bank" ? "🏦 Bank Transfer" : "💳 PayPal"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
            <button style={s.btnGhost} onClick={() => setStep(1)}>Back</button>
            <button style={s.btnGold} onClick={() => setStep(3)}>Continue</button>
          </div>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => nav("dashboard")}>Cancel</button>
        </>
      )}

      {step === 3 && (
        <>
          {!chosen ? (
            <div style={{ ...s.card, color: G.muted, fontSize: 13 }}>No active {method} account configured by admin yet. Please contact support.</div>
          ) : (
            <>
              <div style={{ ...s.card, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>SEND EXACTLY</div>
                <div style={{ ...s.serif, fontSize: 28, fontWeight: 600, color: G.gold }}>{fmtMoney(Number(amount), cur)}</div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${G.border}` }}>
                  <div style={{ fontSize: 11, color: G.muted }}>{chosen.label.toUpperCase()}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>{chosen.account_name}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "10px 12px", background: G.bg, borderRadius: 8 }}>
                    <code style={{ fontSize: 14, color: G.text }}>{chosen.account_number}</code>
                    <button onClick={() => copy(chosen.account_number)} style={{ background: "none", border: `1px solid ${G.border}`, color: G.gold, padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>COPY</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, padding: "10px 12px", background: G.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 13 }}>{chosen.account_name}</span>
                    <button onClick={() => copy(chosen.account_name)} style={{ background: "none", border: `1px solid ${G.border}`, color: G.gold, padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>COPY</button>
                  </div>

                  {chosen.instructions && (
                    <div style={{ marginTop: 12, padding: 12, background: G.bg, borderRadius: 8, fontSize: 12, color: G.muted, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {chosen.instructions}
                    </div>
                  )}
                </div>
              </div>

              <label style={s.label}>UPLOAD PAYMENT PROOF</label>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
              <button style={s.btnGhost} onClick={() => fileRef.current?.click()}>{proofUrl ? "✓ Proof uploaded — replace" : "Choose file"}</button>

              <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
                <button style={s.btnGhost} onClick={() => setStep(2)}>Back</button>
                <button style={s.btnGold} onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit Deposit"}</button>
              </div>
              <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => nav("dashboard")}>Cancel & return home</button>
            </>
          )}
        </>
      )}

      {step === 4 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: G.gold + "22", border: `1px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 18px", color: G.gold }}>✓</div>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 600 }}>Deposit submitted</div>
          <p style={{ color: G.muted, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>Our team will review your payment and credit your account once approved. You'll be notified shortly.</p>
          <button style={{ ...s.btnGold, marginTop: 22 }} onClick={() => nav("dashboard")}>Return home</button>
        </div>
      )}
    </ScreenShell>
  );
}