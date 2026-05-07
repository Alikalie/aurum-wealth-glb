import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { MOBILE_MONEY, BANKS } from "../data";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Building2, CreditCard, Lock, AlertTriangle } from "lucide-react";

type Method = "mobile_money" | "bank" | "paypal";

export function PaymentMethods({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast } = useAurum();
  const [list, setList] = useState<any[]>([]);
  const [adding, setAdding] = useState<Method | null>(null);

  const refresh = () => {
    if (!user) return;
    supabase.from("payment_methods").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  };
  useEffect(refresh, [user]);

  const lockedUntil = profile?.payment_locked_until ? new Date(profile.payment_locked_until) : null;
  const isLocked = lockedUntil && lockedUntil.getTime() > Date.now();
  const hasOne = list.length > 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isLocked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isLocked]);
  const remainingMs = isLocked ? Math.max(0, lockedUntil!.getTime() - now) : 0;
  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const mins = Math.floor((remainingMs % 3600000) / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);

  return (
    <ScreenShell title="Linked Accounts" onBack={() => nav("dashboard")}>
      <div style={{ background: "#fff3cd22", border: `1px solid ${G.gold}`, borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", gap: 10 }}>
        <AlertTriangle size={20} color={G.gold} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: G.text, lineHeight: 1.55 }}>
          <strong style={{ color: G.gold }}>IMPORTANT — READ BEFORE SAVING</strong>
          <div style={{ marginTop: 6 }}>
            You can save <strong>only ONE</strong> payment method, and it will be <strong>locked for 365 days</strong>. All future withdrawals will be sent to this exact account. <strong>Double-check every digit</strong> — wrong details = lost funds. To change it before 365 days, you must contact admin.
          </div>
          {isLocked && (
            <div style={{ marginTop: 8, color: G.gold, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={14} /> Unlocks in {days}d {String(hours).padStart(2,"0")}:{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {list.length === 0 && <div style={{ ...s.card, fontSize: 13, color: G.muted, textAlign: "center" }}>No payment methods added yet.</div>}
        {list.map(m => (
          <div key={m.id} style={{ ...s.card, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: G.gold, fontWeight: 600, textTransform: "uppercase" }}>{m.method_type.replace("_", " ")}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{m.provider_name}</div>
                <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{m.account_holder_name}{m.account_number ? ` · ${m.account_number}` : ""}{m.paypal_email ? ` · ${m.paypal_email}` : ""}</div>
              </div>
              <span style={{ fontSize: 18, color: G.muted }}>🔒</span>
            </div>
          </div>
        ))}
      </div>

      {!adding ? (hasOne ? null : (
        <>
          <div style={{ fontSize: 12, color: G.muted, marginBottom: 8, letterSpacing: 0.5 }}>ADD A METHOD</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button style={{ ...s.btnGhost, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setAdding("mobile_money")}><Smartphone size={18}/> Mobile Money</button>
            <button style={{ ...s.btnGhost, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setAdding("bank")}><Building2 size={18}/> Bank Account</button>
            <button style={{ ...s.btnGhost, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setAdding("paypal")}><CreditCard size={18}/> PayPal</button>
          </div>
        </>
      )) : (
        <AddMethodForm type={adding} onDone={() => { setAdding(null); refresh(); }} onCancel={() => setAdding(null)} />
      )}
    </ScreenShell>
  );
}

function AddMethodForm({ type, onDone, onCancel }: { type: Method; onDone: () => void; onCancel: () => void }) {
  const { s, G, user, profile, toast } = useAurum();
  const country = profile?.country_code ?? "";
  const providerOptions = type === "mobile_money" ? MOBILE_MONEY[country] ?? [] : type === "bank" ? BANKS[country] ?? [] : [];
  const [provider, setProvider] = useState(providerOptions[0] ?? "");
  const [customProvider, setCustomProvider] = useState("");
  const [holder, setHolder] = useState(profile?.full_name ?? "");
  const [account, setAccount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [load, setLoad] = useState(false);

  const submit = async () => {
    if (!user) return;
    const finalProvider = type === "paypal" ? "PayPal" : (provider || customProvider).trim();
    if (type !== "paypal" && !finalProvider) { toast("Select or enter a provider"); return; }
    if (!holder.trim()) { toast("Enter the account holder name"); return; }
    if (type === "paypal" && !paypalEmail.includes("@")) { toast("Enter a valid PayPal email"); return; }
    if (type !== "paypal" && !account.trim()) { toast("Enter the account number"); return; }
    const summary = type === "paypal"
      ? `PayPal email: ${paypalEmail.trim()}\nName: ${holder.trim()}`
      : `${finalProvider}\nAccount: ${account.trim()}\nName: ${holder.trim()}`;
    const ok = window.confirm(
      `⚠️ FINAL WARNING\n\nThis account will be LOCKED for 365 days. All withdrawals go here.\n\n${summary}\n\nIs every detail correct?`
    );
    if (!ok) return;
    setLoad(true);
    const { error } = await supabase.from("payment_methods").insert({
      user_id: user.id,
      method_type: type,
      provider_name: finalProvider,
      account_holder_name: holder.trim(),
      account_number: type === "paypal" ? null : account.trim(),
      paypal_email: type === "paypal" ? paypalEmail.trim() : null,
    });
    setLoad(false);
    if (error) { toast(error.message); return; }
    toast("Saved! Editing is locked — contact support to change.");
    onDone();
  };

  return (
    <div style={{ ...s.card }}>
      <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        {type === "mobile_money" ? "Add Mobile Money" : type === "bank" ? "Add Bank Account" : "Add PayPal"}
      </div>

      {type !== "paypal" && (
        <>
          <label style={s.label}>{type === "mobile_money" ? "MOBILE MONEY COMPANY" : "BANK"}</label>
          {providerOptions.length > 0 ? (
            <select style={{ ...s.input, appearance: "none" }} value={provider} onChange={e => setProvider(e.target.value)}>
              {providerOptions.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="">Other (type below)</option>
            </select>
          ) : (
            <input style={s.input} placeholder="Provider name" value={customProvider} onChange={e => setCustomProvider(e.target.value)} />
          )}
          {provider === "" && providerOptions.length > 0 && (
            <input style={{ ...s.input, marginTop: 8 }} placeholder="Type provider name" value={customProvider} onChange={e => setCustomProvider(e.target.value)} />
          )}

          <label style={{ ...s.label, marginTop: 14 }}>{type === "mobile_money" ? "MOBILE MONEY ACCOUNT NAME" : "ACCOUNT HOLDER NAME"}</label>
          <input style={s.input} value={holder} onChange={e => setHolder(e.target.value)} />

          <label style={{ ...s.label, marginTop: 14 }}>{type === "mobile_money" ? "PHONE / ACCOUNT NUMBER" : "ACCOUNT NUMBER"}</label>
          <input style={s.input} value={account} onChange={e => setAccount(e.target.value)} />
        </>
      )}

      {type === "paypal" && (
        <>
          <label style={s.label}>NAME ON PAYPAL</label>
          <input style={s.input} value={holder} onChange={e => setHolder(e.target.value)} />
          <label style={{ ...s.label, marginTop: 14 }}>PAYPAL EMAIL</label>
          <input style={s.input} type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} />
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button style={s.btnGhost} onClick={onCancel}>Cancel</button>
        <button style={s.btnGold} onClick={submit} disabled={load}>{load ? "Saving…" : "Save"}</button>
      </div>
      <div style={{ fontSize: 11, color: G.red, marginTop: 10, lineHeight: 1.5, display: "flex", gap: 6 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Once saved, you <strong>cannot edit</strong> this for 365 days. Wrong details mean lost funds — verify before saving.</span>
      </div>
    </div>
  );
}