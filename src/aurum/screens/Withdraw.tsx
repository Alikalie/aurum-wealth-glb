import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { fmtMoney, convertFromUsd, fxRatesSync } from "../data";
import { supabase } from "@/integrations/supabase/client";

export function Withdraw({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast, refreshProfile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const fxRate = fxRatesSync()[cur] || 1;
  const balance = (Number(profile?.invested ?? 0) + Number(profile?.earned ?? 0) - Number(profile?.withdrawn ?? 0));
  const profit = Number(profile?.earned ?? 0);
  // Minimum withdrawal is 2 USD; convert to user's currency for the friendly check
  const minLocal = convertFromUsd(2, cur);
  const [methods, setMethods] = useState<any[]>([]);
  const [chosen, setChosen] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const amountNum = Number(amount) || 0;
  const amountUsd = amountNum / (fxRate || 1);

  useEffect(() => {
    if (!user) return;
    supabase.from("payment_methods").select("*").eq("user_id", user.id).then(({ data }) => {
      setMethods(data ?? []);
      setChosen((data ?? [])[0] ?? null);
    });
  }, [user]);

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast("Enter a valid amount"); return; }
    if (amt < minLocal) { toast(`Minimum withdrawal is ${fmtMoney(minLocal, cur)} ($2 USD)`); return; }
    if (amt > balance) { toast("Amount exceeds your available balance"); return; }
    if (!chosen) { toast("Add a payment method first"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({ user_id: user.id, amount: amt, payment_method_id: chosen.id });
    setSubmitting(false);
    if (error) { toast(error.message); return; }
    setDone(true);
    refreshProfile();
  };

  if (done) {
    return (
      <ScreenShell title="Withdraw" onBack={() => nav("dashboard")}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: G.gold + "22", border: `1px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 18px", color: G.gold }}>↑</div>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 600 }}>Withdrawal requested</div>
          <p style={{ color: G.muted, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>Payment will be received in 15 minutes. If not received, please contact support.</p>
          <button style={{ ...s.btnGold, marginTop: 22 }} onClick={() => nav("dashboard")}>Return home</button>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Withdraw" onBack={() => nav("dashboard")}>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: G.muted }}>WALLET BALANCE</div>
        <div style={{ ...s.serif, fontSize: 26, fontWeight: 600, color: G.gold }}>{fmtMoney(balance, cur)}</div>
        <div style={{ fontSize: 11, color: G.muted, marginTop: 6 }}>Deposits and profits combined. Profit so far: <strong style={{ color: G.green }}>{fmtMoney(profit, cur)}</strong></div>
        <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>Minimum withdrawal: {fmtMoney(minLocal, cur)} ($2 USD)</div>
      </div>

      <label style={s.label}>AMOUNT ({cur})</label>
      <input style={{ ...s.input, fontSize: 22, textAlign: "center" }} type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
      {cur !== "USD" && amountNum > 0 && (
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: G.muted }}>
          ≈ <strong style={{ color: G.gold }}>{fmtMoney(amountUsd, "USD")}</strong>
          <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.8 }}>(rate: 1 USD = {fxRate} {cur})</span>
        </div>
      )}

      <label style={{ ...s.label, marginTop: 14 }}>SEND TO</label>
      {methods.length === 0 ? (
        <div style={{ ...s.card, fontSize: 13, color: G.muted, textAlign: "center" }}>
          No payment methods saved.
          <button style={{ ...s.btnGold, marginTop: 12 }} onClick={() => nav("payment-methods")}>Add a payment method</button>
        </div>
      ) : (
        <select style={{ ...s.input, appearance: "none" }} value={chosen?.id ?? ""} onChange={e => setChosen(methods.find(m => m.id === e.target.value))}>
          {methods.map(m => (
            <option key={m.id} value={m.id}>{m.method_type.replace("_", " ")} — {m.provider_name} {m.account_number || m.paypal_email}</option>
          ))}
        </select>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
        <button style={s.btnGhost} onClick={() => nav("dashboard")}>Cancel</button>
        <button style={s.btnGold} onClick={submit} disabled={submitting || methods.length === 0}>{submitting ? "Submitting…" : "Request Withdrawal"}</button>
      </div>
    </ScreenShell>
  );
}