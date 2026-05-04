import { useEffect, useState } from "react";
import { AurumProvider, useAurum } from "@/aurum/AurumContext";
import { Toast } from "@/aurum/ui";
import { COUNTRIES, fmtMoney, convertFromUsd, fxRatesSync } from "@/aurum/data";
import { supabase } from "@/integrations/supabase/client";
import { ProofViewer } from "@/aurum/ProofViewer";

type Tab = "users" | "deposits" | "withdrawals" | "products" | "accounts" | "fx" | "content" | "news" | "affiliate" | "aff_apps" | "aff_wd" | "admins" | "audit";

function AdminInner() {
  const { s, G, user, isAdmin, isSuperAdmin, loading, signOut, themeMode, setThemeMode } = useAurum();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => { document.body.style.background = G.bg; document.body.style.margin = "0"; }, [G.bg]);

  if (loading) return <div style={{ ...s.app, padding: 40 }}>Loading…</div>;
  if (!user) return <div style={{ ...s.app, padding: 40 }}>Please sign in via the main app first.</div>;
  if (!isAdmin) return <div style={{ ...s.app, padding: 40 }}>You are not an admin.</div>;

  const tabs: Tab[] = ["users", "deposits", "withdrawals", "products", "accounts", "fx", "news", "affiliate", "aff_apps", "aff_wd", "content", "audit"];
  if (isSuperAdmin) tabs.push("admins");
  const tabLabels: Record<Tab,string> = { users:"Users", deposits:"Deposits", withdrawals:"Withdrawals", products:"Products", accounts:"Accounts", fx:"FX", content:"Content", news:"News", affiliate:"Affiliate", aff_apps:"Aff. Apps", aff_wd:"Aff. Withdrawals", admins:"Admins", audit:"Audit" };
  return (
    <div style={{ ...s.app, padding: "16px clamp(12px, 3vw, 24px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
          <h1 style={{ ...s.serif, fontSize: "clamp(20px, 4vw, 28px)", margin: 0 }}>Aurum Admin</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")} title="Toggle theme" style={{ background: G.card, border: `1px solid ${G.border}`, color: G.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 14 }}>{themeMode === "dark" ? "☀️" : "🌙"}</button>
            <button style={{ ...s.btnGhost, width: "auto", padding: "8px 14px" }} onClick={() => { signOut(); window.location.href = "/"; }}>Sign out</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? G.gold : G.card, color: tab === t ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{tabLabels[t]}</button>
          ))}
        </div>
        {tab === "users" && <Users />}
        {tab === "deposits" && <Deposits />}
        {tab === "withdrawals" && <Withdrawals />}
        {tab === "products" && <Products />}
        {tab === "accounts" && <AdminAccounts />}
        {tab === "fx" && <FxRates />}
        {tab === "content" && <ContentEditor />}
        {tab === "news" && <NewsAdmin />}
        {tab === "affiliate" && <AffiliateAdmin />}
        {tab === "aff_apps" && <AffiliateApplications />}
        {tab === "aff_wd" && <AffiliateWithdrawals />}
        {tab === "admins" && <AdminsManagement />}
        {tab === "audit" && <AuditLog />}
        <Toast />
      </div>
    </div>
  );
}

function Users() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const refresh = async () => {
    const { data } = await supabase.from("profiles").select("*").order("account_number", { ascending: false }).limit(500);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.email || "").toLowerCase().includes(s) || (r.full_name || "").toLowerCase().includes(s) || (r.phone || "").includes(s) || String(r.account_number || "").includes(s);
  });

  const toggleBlock = async (u: any) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !u.is_blocked }).eq("user_id", u.user_id);
    if (error) { toast(error.message); return; }
    toast(u.is_blocked ? "Unblocked" : "Blocked");
    refresh();
  };

  return (
    <div>
      <input style={{ ...s.input, marginBottom: 14 }} placeholder="Search by name, email, phone or account #" value={q} onChange={e => setQ(e.target.value)} />
      <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "90px 2fr 1fr 1fr 1fr 1fr 110px", padding: "10px 14px", background: G.bg, fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>
          <span>ID</span><span>NAME / EMAIL</span><span>COUNTRY</span><span>INVESTED</span><span>EARNED</span><span>WITHDRAWN</span><span>ACTIONS</span>
        </div>
        {filtered.map(u => (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "90px 2fr 1fr 1fr 1fr 1fr 110px", padding: "12px 14px", borderTop: `1px solid ${G.border}`, fontSize: 13, alignItems: "center", background: u.is_blocked ? G.red + "11" : "transparent" }}>
            <span style={{ fontFamily: "monospace", color: G.gold }}>#{u.account_number}</span>
            <span>
              <div style={{ fontWeight: 600 }}>{u.full_name || "—"} {u.is_blocked && <span style={{ color: G.red, fontSize: 10 }}>BLOCKED</span>}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{u.email}</div>
            </span>
            <span style={{ fontSize: 12 }}>{u.country_name || "—"}</span>
            <span>{fmtMoney(Number(u.invested), u.currency)}</span>
            <span>{fmtMoney(Number(u.earned), u.currency)}</span>
            <span>{fmtMoney(Number(u.withdrawn), u.currency)}</span>
            <span style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setSelected(u)} style={{ background: G.gold, color: "#1a1208", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>View</button>
              <button onClick={() => toggleBlock(u)} style={{ background: "transparent", color: u.is_blocked ? G.green : G.red, border: `1px solid ${u.is_blocked ? G.green : G.red}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>{u.is_blocked ? "Unblock" : "Block"}</button>
            </span>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 20, color: G.muted }}>No users found.</div>}
      </div>
      {selected && <UserDrawer user={selected} onClose={() => { setSelected(null); refresh(); }} />}
    </div>
  );
}

function UserDrawer({ user: u, onClose }: { user: any; onClose: () => void }) {
  const { s, G, toast } = useAurum();
  const [pms, setPms] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [bucket, setBucket] = useState<"invested" | "earned" | "withdrawn">("earned");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("user_id", u.user_id).then(({ data }) => setPms(data ?? []));
    supabase.from("transactions").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }).limit(50).then(({ data }) => setTxs(data ?? []));
  }, [u.user_id]);

  const fund = async () => {
    const a = Number(amount);
    if (!a || a <= 0) { toast("Enter amount"); return; }
    setBusy(true);
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_credits").insert({ user_id: u.user_id, bucket, amount: a, note: note || null, created_by: me!.id });
    setBusy(false);
    if (error) { toast(error.message); return; }
    toast(`Credited ${fmtMoney(a, u.currency)} to ${bucket}`);
    setAmount(""); setNote("");
    supabase.from("transactions").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }).limit(50).then(({ data }) => setTxs(data ?? []));
  };

  const unlockEdits = async () => {
    await supabase.from("profiles").update({ payment_edit_locked: false }).eq("user_id", u.user_id);
    toast("Payment edits unlocked");
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", height: "100%", background: G.bg, padding: 24, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...s.serif, fontSize: 22, margin: 0 }}>{u.full_name || "User"}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${G.border}`, color: G.text, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>Close</button>
        </div>

        <div style={{ ...s.card, marginBottom: 14, fontSize: 13 }}>
          <Row k="Account ID" v={`#${u.account_number}`} G={G} />
          <Row k="Email" v={u.email} G={G} />
          <Row k="Phone" v={u.phone || "—"} G={G} />
          <Row k="Country" v={`${u.country_name || "—"} (${u.country_code || "—"})`} G={G} />
          <Row k="Currency" v={u.currency} G={G} />
          <Row k="Language" v={u.language} G={G} />
          <Row k="Joined" v={new Date(u.created_at).toLocaleString()} G={G} />
          <Row k="Status" v={u.is_blocked ? "Blocked" : "Active"} G={G} />
        </div>

        <div style={{ ...s.card, marginBottom: 14 }}>
          <div style={{ ...s.serif, fontSize: 16, marginBottom: 10 }}>Fund user</div>
          <select style={{ ...s.input, appearance: "none" }} value={bucket} onChange={e => setBucket(e.target.value as any)}>
            <option value="invested">Invested (deposit credit)</option>
            <option value="earned">Earned (withdrawable bonus)</option>
            <option value="withdrawn">Withdrawn (adjust withdrawn total)</option>
          </select>
          <input style={{ ...s.input, marginTop: 8 }} type="number" placeholder={`Amount in ${u.currency}`} value={amount} onChange={e => setAmount(e.target.value)} />
          <input style={{ ...s.input, marginTop: 8 }} placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button style={{ ...s.btnGold, marginTop: 10 }} onClick={fund} disabled={busy}>{busy ? "Crediting…" : "Apply credit"}</button>
        </div>

        <div style={{ ...s.card, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ ...s.serif, fontSize: 16 }}>Payment methods ({pms.length})</div>
            {u.payment_edit_locked && <button onClick={unlockEdits} style={{ background: "transparent", border: `1px solid ${G.gold}`, color: G.gold, padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Unlock edits</button>}
          </div>
          {pms.map(p => (
            <div key={p.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: `1px solid ${G.border}` }}>
              <strong>{p.method_type.replace("_", " ")}</strong> · {p.provider_name || "PayPal"} · {p.account_holder_name} · {p.account_number || p.paypal_email}
            </div>
          ))}
          {pms.length === 0 && <div style={{ color: G.muted, fontSize: 12 }}>No methods</div>}
        </div>

        <div style={{ ...s.card }}>
          <div style={{ ...s.serif, fontSize: 16, marginBottom: 10 }}>Recent transactions</div>
          {txs.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${G.border}` }}>
              <span>{new Date(t.created_at).toLocaleDateString()} · {t.kind}</span>
              <span style={{ color: Number(t.amount) >= 0 ? G.green : G.red }}>{Number(t.amount) >= 0 ? "+" : ""}{fmtMoney(Number(t.amount), t.currency)}</span>
            </div>
          ))}
          {txs.length === 0 && <div style={{ color: G.muted, fontSize: 12 }}>No transactions</div>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, G }: { k: string; v: any; G: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${G.border}` }}>
      <span style={{ color: G.muted }}>{k}</span><span>{v}</span>
    </div>
  );
}

function Deposits() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<{ id: string; kind: "deposit" } | null>(null);
  const [fCurrency, setFCurrency] = useState("");
  const [fMethod, setFMethod] = useState("");
  const [fCountry, setFCountry] = useState("");
  const refresh = () => {
    let q = supabase.from("deposits").select("*, profiles!deposits_user_profile_fkey(full_name, email, account_number, currency, country_name, country_code)").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    q.then(({ data }) => setRows(data ?? []));
  };
  useEffect(refresh, [filter]);
  const approve = async (id: string) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("deposits").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: me?.id }).eq("id", id);
    if (error) { toast(error.message); return; }
    toast("Deposit approved — credited to user's invested balance"); refresh();
  };
  const filtered = rows.filter(r => {
    if (fCurrency && (r.profiles?.currency || "") !== fCurrency) return false;
    if (fMethod && r.method_type !== fMethod) return false;
    if (fCountry && (r.profiles?.country_code || "") !== fCountry) return false;
    return true;
  });
  const currencies = Array.from(new Set(rows.map(r => r.profiles?.currency).filter(Boolean))).sort();
  const countries = Array.from(new Set(rows.map(r => r.profiles?.country_code).filter(Boolean))).sort();
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["pending", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? G.gold : G.card, color: filter === f ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={fCurrency} onChange={e => setFCurrency(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
          <option value="">All currencies</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fMethod} onChange={e => setFMethod(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
          <option value="">All methods</option>
          <option value="mobile_money">Mobile money</option>
          <option value="bank">Bank</option>
          <option value="paypal">PayPal</option>
        </select>
        <select value={fCountry} onChange={e => setFCountry(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
          <option value="">All countries</option>
          {countries.map(c => { const cn = COUNTRIES.find(x => x.code === c); return <option key={c} value={c}>{cn ? `${cn.flag} ${cn.name}` : c}</option>; })}
        </select>
        {(fCurrency || fMethod || fCountry) && <button onClick={() => { setFCurrency(""); setFMethod(""); setFCountry(""); }} style={{ background: "transparent", color: G.muted, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Clear</button>}
        <span style={{ alignSelf: "center", fontSize: 11, color: G.muted }}>{filtered.length} of {rows.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <div style={{ ...s.card, color: G.muted }}>No deposits match.</div>}
        {filtered.map(r => (
          <div key={r.id} style={{ ...s.card, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>#{r.profiles?.account_number} {r.profiles?.full_name} <span style={{ color: G.muted, fontWeight: 400 }}>({r.profiles?.email})</span></div>
                <div style={{ fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleString()} · {r.method_type} · <strong style={{ color: r.status === "approved" ? G.green : r.status === "rejected" ? G.red : G.amber }}>{r.status}</strong></div>
                {r.proof_url && <button onClick={() => setProofUrl(r.proof_url)} style={{ background: "none", border: "none", color: G.gold, fontSize: 12, cursor: "pointer", marginTop: 4, padding: 0 }}>📎 View proof</button>}
                {r.admin_note && <div style={{ fontSize: 11, color: G.muted, marginTop: 4, fontStyle: "italic" }}>Note: {r.admin_note}</div>}
              </div>
              <div style={{ ...s.serif, fontSize: 20, color: G.gold }}>{fmtMoney(Number(r.amount), r.profiles?.currency)}</div>
            </div>
            {r.status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ ...s.btnGold, padding: 8, fontSize: 12 }} onClick={() => approve(r.id)}>Approve & credit</button>
                <button style={{ ...s.btnGhost, padding: 8, fontSize: 12 }} onClick={() => setRejectFor({ id: r.id, kind: "deposit" })}>Decline…</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {proofUrl && <ProofViewer url={proofUrl} onClose={() => setProofUrl(null)} G={G} />}
      {rejectFor && <RejectModal target={rejectFor} onClose={() => setRejectFor(null)} onDone={refresh} />}
    </div>
  );
}

function Withdrawals() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [rejectFor, setRejectFor] = useState<{ id: string; kind: "withdrawal" } | null>(null);
  const [fCurrency, setFCurrency] = useState("");
  const [fMethod, setFMethod] = useState("");
  const [fCountry, setFCountry] = useState("");
  const refresh = () => {
    let q = supabase.from("withdrawals").select("*, profiles!withdrawals_user_profile_fkey(full_name, email, account_number, currency, country_name, country_code), payment_methods(method_type, provider_name, account_number, paypal_email, account_holder_name)").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    q.then(({ data }) => setRows(data ?? []));
  };
  useEffect(refresh, [filter]);
  const approve = async (id: string) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawals").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: me?.id }).eq("id", id);
    if (error) { toast(error.message); return; }
    toast("Withdrawal marked paid"); refresh();
  };
  const filtered = rows.filter(r => {
    if (fCurrency && (r.profiles?.currency || "") !== fCurrency) return false;
    if (fMethod && (r.payment_methods?.method_type || "") !== fMethod) return false;
    if (fCountry && (r.profiles?.country_code || "") !== fCountry) return false;
    return true;
  });
  const currencies = Array.from(new Set(rows.map(r => r.profiles?.currency).filter(Boolean))).sort();
  const countries = Array.from(new Set(rows.map(r => r.profiles?.country_code).filter(Boolean))).sort();
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["pending", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? G.gold : G.card, color: filter === f ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={fCurrency} onChange={e => setFCurrency(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
          <option value="">All currencies</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fMethod} onChange={e => setFMethod(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
          <option value="">All methods</option>
          <option value="mobile_money">Mobile money</option>
          <option value="bank">Bank</option>
          <option value="paypal">PayPal</option>
        </select>
        <select value={fCountry} onChange={e => setFCountry(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
          <option value="">All countries</option>
          {countries.map(c => { const cn = COUNTRIES.find(x => x.code === c); return <option key={c} value={c}>{cn ? `${cn.flag} ${cn.name}` : c}</option>; })}
        </select>
        {(fCurrency || fMethod || fCountry) && <button onClick={() => { setFCurrency(""); setFMethod(""); setFCountry(""); }} style={{ background: "transparent", color: G.muted, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Clear</button>}
        <span style={{ alignSelf: "center", fontSize: 11, color: G.muted }}>{filtered.length} of {rows.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <div style={{ ...s.card, color: G.muted }}>No withdrawals match.</div>}
        {filtered.map(r => (
          <div key={r.id} style={{ ...s.card, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>#{r.profiles?.account_number} {r.profiles?.full_name} <span style={{ color: G.muted, fontWeight: 400 }}>({r.profiles?.email})</span></div>
                <div style={{ fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleString()} · <strong style={{ color: r.status === "approved" ? G.green : r.status === "rejected" ? G.red : G.amber }}>{r.status}</strong></div>
                <div style={{ fontSize: 12, marginTop: 4 }}>To: {r.payment_methods?.method_type} · {r.payment_methods?.provider_name || "PayPal"} · {r.payment_methods?.account_number || r.payment_methods?.paypal_email} ({r.payment_methods?.account_holder_name})</div>
                {r.admin_note && <div style={{ fontSize: 11, color: G.muted, marginTop: 4, fontStyle: "italic" }}>Note: {r.admin_note}</div>}
              </div>
              <div style={{ ...s.serif, fontSize: 20, color: G.gold }}>{fmtMoney(Number(r.amount), r.profiles?.currency)}</div>
            </div>
            {r.status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ ...s.btnGold, padding: 8, fontSize: 12 }} onClick={() => approve(r.id)}>Mark Paid</button>
                <button style={{ ...s.btnGhost, padding: 8, fontSize: 12 }} onClick={() => setRejectFor({ id: r.id, kind: "withdrawal" })}>Decline…</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {rejectFor && <RejectModal target={rejectFor} onClose={() => setRejectFor(null)} onDone={refresh} />}
    </div>
  );
}

function RejectModal({ target, onClose, onDone }: { target: { id: string; kind: "deposit" | "withdrawal" }; onClose: () => void; onDone: () => void }) {
  const { s, G, toast } = useAurum();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!note.trim()) { toast("Please add a reason for the user"); return; }
    setBusy(true);
    const table = target.kind === "deposit" ? "deposits" : "withdrawals";
    const { error } = await supabase.from(table).update({ status: "rejected", admin_note: note.trim(), reviewed_at: new Date().toISOString() }).eq("id", target.id);
    setBusy(false);
    if (error) { toast(error.message); return; }
    toast("Declined and user notified"); onDone(); onClose();
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.card, borderRadius: 14, padding: 20, maxWidth: 440, width: "100%", border: `1px solid ${G.border}` }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 4 }}>Decline {target.kind}</div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 12 }}>Write a clear reason — the user will see this message in their transaction history.</div>
        <textarea autoFocus style={{ ...s.input, minHeight: 100, fontFamily: "inherit" }} placeholder="e.g. Proof image is unclear, please re-submit with a readable screenshot." value={note} onChange={e => setNote(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={s.btnGhost} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btnGold, background: G.red, color: "#fff" }} onClick={submit} disabled={busy}>{busy ? "Sending…" : "Decline & notify"}</button>
        </div>
      </div>
    </div>
  );
}

function Products() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", description: "", image_url: "",
    price_usd: "", cycle_days: "30", payout_interval_hours: "24",
    daily_income_usd: "", purchase_limit: "0", resale_enabled: true,
  });
  const [previewCur, setPreviewCur] = useState("EUR");
  const [uploading, setUploading] = useState(false);
  const refresh = () => supabase.from("products").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);

  const uploadImage = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (error) { toast(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast("Image uploaded");
  };

  const add = async () => {
    if (!form.name || !form.price_usd || !form.daily_income_usd) { toast("Name, price and income required"); return; }
    const price = Number(form.price_usd);
    const income = Number(form.daily_income_usd);
    const cycle = Number(form.cycle_days);
    const interval = Math.max(1, Number(form.payout_interval_hours) || 24);
    const { error } = await supabase.from("products").insert({
      name: form.name, description: form.description, image_url: form.image_url || null,
      price, cycle_days: cycle, daily_income: income,
      payout_interval_hours: interval,
      purchase_limit: Number(form.purchase_limit), resale_enabled: form.resale_enabled,
      expected_return_pct: price > 0 ? (income * cycle / price) * 100 : 0,
    });
    if (error) { toast(error.message); return; }
    setForm({ name: "", description: "", image_url: "", price_usd: "", cycle_days: "30", payout_interval_hours: "24", daily_income_usd: "", purchase_limit: "0", resale_enabled: true });
    refresh();
  };
  const toggle = async (r: any) => { await supabase.from("products").update({ is_active: !r.is_active }).eq("id", r.id); refresh(); };
  const del = async (id: string) => { if (confirm("Delete?")) { await supabase.from("products").delete().eq("id", id); refresh(); } };

  const intervalOptions: { v: string; l: string }[] = [
    { v: "1", l: "Every hour" },
    { v: "6", l: "Every 6 hours" },
    { v: "12", l: "Every 12 hours" },
    { v: "24", l: "Daily (24h)" },
    { v: "168", l: "Weekly (7d)" },
  ];
  const previewPrice = Number(form.price_usd) || 0;
  const previewIncome = Number(form.daily_income_usd) || 0;

  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 4 }}>Add Product</div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 12 }}>Enter all amounts in <strong style={{ color: G.gold }}>USD</strong>. The app converts to each user's local currency automatically.</div>
        <input style={s.input} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <textarea style={{ ...s.input, marginTop: 8, minHeight: 60, fontFamily: "inherit" }} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...s.input, flex: 1 }} placeholder="Image URL or upload below" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
            <label style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            </label>
          </div>
          {form.image_url && (
            <img src={form.image_url} alt="preview" style={{ marginTop: 8, width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, border: `1px solid ${G.border}` }} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <Field label="Price (USD)"><input style={s.input} type="number" value={form.price_usd} onChange={e => setForm({ ...form, price_usd: e.target.value })} /></Field>
          <Field label="Income / payout (USD)"><input style={s.input} type="number" value={form.daily_income_usd} onChange={e => setForm({ ...form, daily_income_usd: e.target.value })} /></Field>
          <Field label="Payout interval">
            <select style={{ ...s.input, appearance: "none" }} value={form.payout_interval_hours} onChange={e => setForm({ ...form, payout_interval_hours: e.target.value })}>
              {intervalOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </Field>
          <Field label="Cycle (number of payouts)"><input style={s.input} type="number" value={form.cycle_days} onChange={e => setForm({ ...form, cycle_days: e.target.value })} /></Field>
          <Field label="Purchase limit (0=∞)"><input style={s.input} type="number" value={form.purchase_limit} onChange={e => setForm({ ...form, purchase_limit: e.target.value })} /></Field>
        </div>
        {previewPrice > 0 && (
          <div style={{ marginTop: 10, padding: 10, background: G.bg, borderRadius: 8, border: `1px solid ${G.border}`, fontSize: 12, color: G.muted, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>Preview in</span>
            <select value={previewCur} onChange={e => setPreviewCur(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
              {Object.keys(fxRatesSync()).sort().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span>·</span>
            <span style={{ color: G.text }}>Price: <strong style={{ color: G.gold }}>{fmtMoney(convertFromUsd(previewPrice, previewCur), previewCur)}</strong></span>
            <span>·</span>
            <span style={{ color: G.text }}>Income: <strong style={{ color: G.green }}>{fmtMoney(convertFromUsd(previewIncome, previewCur), previewCur)}</strong></span>
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.resale_enabled} onChange={e => setForm({ ...form, resale_enabled: e.target.checked })} style={{ accentColor: G.gold }} />
          Allow resale on marketplace
        </label>
        <button style={{ ...s.btnGold, marginTop: 10 }} onClick={add}>Add Product</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(r => (
          <div key={r.id} style={{ ...s.card, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.name} {!r.is_active && <span style={{ color: G.muted, fontSize: 11 }}>(hidden)</span>}</div>
                <div style={{ fontSize: 12, color: G.muted }}>
                  ${Number(r.price).toFixed(2)} USD · {r.cycle_days}× ${Number(r.daily_income).toFixed(2)} every {payoutLabel(r.payout_interval_hours)} · limit {r.purchase_limit || "∞"} · resale {r.resale_enabled ? "✓" : "✗"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ background: "transparent", color: G.text, border: `1px solid ${G.border}`, padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }} onClick={() => toggle(r)}>{r.is_active ? "Hide" : "Show"}</button>
                <button style={{ background: "transparent", color: G.red, border: `1px solid ${G.red}`, padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }} onClick={() => del(r.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { G } = useAurum();
  return (
    <div>
      <div style={{ fontSize: 10, color: G.muted, letterSpacing: 0.5, marginBottom: 4 }}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}

function payoutLabel(h: number | null | undefined): string {
  const v = Number(h) || 24;
  if (v < 24) return `${v}h`;
  if (v === 24) return "day";
  if (v === 168) return "week";
  if (v % 24 === 0) return `${v / 24}d`;
  return `${v}h`;
}

function FxRates() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [newCur, setNewCur] = useState({ currency: "", rate: "" });
  const refresh = () => supabase.from("fx_rates").select("*").order("currency").then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);

  const save = async (currency: string) => {
    const v = Number(editing[currency]);
    if (!v || v <= 0) { toast("Rate must be positive"); return; }
    const { error } = await supabase.from("fx_rates").update({ rate: v, updated_at: new Date().toISOString() }).eq("currency", currency);
    if (error) { toast(error.message); return; }
    toast("Rate saved");
    setEditing(e => { const n = { ...e }; delete n[currency]; return n; });
    refresh();
  };

  const add = async () => {
    const c = newCur.currency.trim().toUpperCase();
    const r = Number(newCur.rate);
    if (!c || !r || r <= 0) { toast("Currency code + positive rate required"); return; }
    const { error } = await supabase.from("fx_rates").upsert({ currency: c, rate: r, updated_at: new Date().toISOString() });
    if (error) { toast(error.message); return; }
    setNewCur({ currency: "", rate: "" });
    refresh();
  };

  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 4 }}>Currency Rates</div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 10 }}>How many units of each currency equal <strong style={{ color: G.gold }}>1 USD</strong>. Used to display product prices and incomes in each user's local currency.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 8 }}>
          <input style={s.input} placeholder="Currency code (e.g. EUR)" value={newCur.currency} onChange={e => setNewCur({ ...newCur, currency: e.target.value })} />
          <input style={s.input} placeholder="Rate (units per 1 USD)" type="number" value={newCur.rate} onChange={e => setNewCur({ ...newCur, rate: e.target.value })} />
          <button style={s.btnGold} onClick={add}>Add / Update</button>
        </div>
      </div>
      <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 110px", padding: "10px 14px", background: G.bg, fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>
          <span>CODE</span><span>RATE (per $1)</span><span>UPDATED</span><span></span>
        </div>
        {rows.map(r => {
          const isEd = editing[r.currency] !== undefined;
          return (
            <div key={r.currency} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 110px", padding: "10px 14px", borderTop: `1px solid ${G.border}`, alignItems: "center", fontSize: 13 }}>
              <span style={{ fontFamily: "monospace", color: G.gold, fontWeight: 700 }}>{r.currency}</span>
              <span>
                {isEd ? (
                  <input style={{ ...s.input, padding: "6px 10px", fontSize: 13 }} type="number" value={editing[r.currency]} onChange={e => setEditing({ ...editing, [r.currency]: e.target.value })} />
                ) : Number(r.rate).toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: G.muted }}>{new Date(r.updated_at).toLocaleDateString()}</span>
              <span>
                {isEd ? (
                  <button onClick={() => save(r.currency)} style={{ background: G.gold, color: "#1a1208", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Save</button>
                ) : (
                  <button onClick={() => setEditing({ ...editing, [r.currency]: String(r.rate) })} style={{ background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>Edit</button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminAccounts() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ method_type: "mobile_money" as "mobile_money" | "bank" | "paypal", country_code: "", label: "", account_name: "", account_number: "", instructions: "" });
  const refresh = () => supabase.from("admin_payment_accounts").select("*").order("country_code", { ascending: true, nullsFirst: true }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    if (!form.label || !form.account_name || !form.account_number) { toast("Fill all required fields"); return; }
    const { error } = await supabase.from("admin_payment_accounts").insert({
      method_type: form.method_type, country_code: form.country_code || null,
      label: form.label, account_name: form.account_name, account_number: form.account_number, instructions: form.instructions || null,
    });
    if (error) { toast(error.message); return; }
    setForm({ method_type: "mobile_money", country_code: "", label: "", account_name: "", account_number: "", instructions: "" });
    refresh();
  };
  const del = async (id: string) => { if (confirm("Delete?")) { await supabase.from("admin_payment_accounts").delete().eq("id", id); refresh(); } };

  // Group by country
  const grouped: Record<string, any[]> = {};
  rows.forEach(r => { const k = r.country_code || "GLOBAL"; (grouped[k] = grouped[k] || []).push(r); });

  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 10 }}>Add Deposit Account</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <select style={{ ...s.input, appearance: "none" }} value={form.method_type} onChange={e => setForm({ ...form, method_type: e.target.value as any })}>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank</option>
            <option value="paypal">PayPal</option>
          </select>
          <select style={{ ...s.input, appearance: "none" }} value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })}>
            <option value="">🌍 Global (all countries)</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Label (e.g. MTN Ghana, Chase USA)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Account name" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} />
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Account number / email" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
        <textarea style={{ ...s.input, marginTop: 8, minHeight: 70, fontFamily: "inherit" }} placeholder="Instructions for users" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
        <button style={{ ...s.btnGold, marginTop: 10 }} onClick={add}>Add Account</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.entries(grouped).map(([country, list]) => {
          const c = COUNTRIES.find(x => x.code === country);
          return (
            <div key={country}>
              <div style={{ fontSize: 12, color: G.muted, letterSpacing: 0.5, marginBottom: 6 }}>{c ? `${c.flag} ${c.name.toUpperCase()}` : "🌍 GLOBAL"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {list.map(r => (
                  <div key={r.id} style={{ ...s.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.label} <span style={{ color: G.muted, fontSize: 11 }}>({r.method_type})</span></div>
                      <div style={{ fontSize: 12 }}>{r.account_name} · {r.account_number}</div>
                    </div>
                    <button style={{ background: "transparent", color: G.red, border: `1px solid ${G.red}`, padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }} onClick={() => del(r.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContentEditor() {
  const { s, G, toast } = useAurum();
  const [support, setSupport] = useState(""), [privacy, setPrivacy] = useState("");
  useEffect(() => {
    supabase.from("support_content").select("body").eq("id", 1).maybeSingle().then(({ data }) => setSupport(data?.body ?? ""));
    supabase.from("privacy_content").select("body").eq("id", 1).maybeSingle().then(({ data }) => setPrivacy(data?.body ?? ""));
  }, []);
  const save = async (table: "support_content" | "privacy_content", body: string) => {
    const { error } = await supabase.from(table).upsert({ id: 1, body, updated_at: new Date().toISOString() });
    if (error) toast(error.message); else toast("Saved");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...s.card }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 10 }}>Help & Support</div>
        <textarea style={{ ...s.input, minHeight: 200, fontFamily: "inherit" }} value={support} onChange={e => setSupport(e.target.value)} />
        <button style={{ ...s.btnGold, marginTop: 10 }} onClick={() => save("support_content", support)}>Save Support</button>
      </div>
      <div style={{ ...s.card }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 10 }}>Privacy Policy</div>
        <textarea style={{ ...s.input, minHeight: 200, fontFamily: "inherit" }} value={privacy} onChange={e => setPrivacy(e.target.value)} />
        <button style={{ ...s.btnGold, marginTop: 10 }} onClick={() => save("privacy_content", privacy)}>Save Privacy</button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AurumProvider>
      <AdminInner />
    </AurumProvider>
  );
}

// ===== News admin =====
function NewsAdmin() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const blank = { id: null as string | null, title: "", body: "", image_url: "", deadline_at: "", is_published: true };
  const refresh = () => supabase.from("news_posts").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
  const startNew = () => setEditing({ ...blank });

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("news-images").upload(path, file, { upsert: false });
    if (error) { toast(error.message); return null; }
    const { data } = supabase.storage.from("news-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!editing.title.trim()) { toast("Title required"); return; }
    const payload: any = {
      title: editing.title.trim(), body: editing.body, image_url: editing.image_url || null,
      deadline_at: editing.deadline_at ? new Date(editing.deadline_at).toISOString() : null,
      is_published: editing.is_published,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("news_posts").update(payload).eq("id", editing.id));
    } else {
      const { data: { user: me } } = await supabase.auth.getUser();
      payload.created_by = me?.id;
      ({ error } = await supabase.from("news_posts").insert(payload));
    }
    if (error) { toast(error.message); return; }
    toast("Saved"); setEditing(null); refresh();
  };
  const del = async (id: string) => { if (!confirm("Delete this post?")) return; await supabase.from("news_posts").delete().eq("id", id); refresh(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ ...s.serif, fontSize: 20 }}>News & announcements</div>
        <button style={{ ...s.btnGold, width: "auto", padding: "8px 14px" }} onClick={startNew}>＋ New post</button>
      </div>
      {editing && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.serif, fontSize: 16, marginBottom: 10 }}>{editing.id ? "Edit post" : "New post"}</div>
          <input style={s.input} placeholder="Title" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
          <textarea style={{ ...s.input, marginTop: 8, minHeight: 100, fontFamily: "inherit" }} placeholder="Body / details" value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: G.muted, letterSpacing: 0.4 }}>DEADLINE (optional, shows countdown)</label>
              <input style={s.input} type="datetime-local" value={editing.deadline_at} onChange={e => setEditing({ ...editing, deadline_at: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: G.muted, letterSpacing: 0.4 }}>IMAGE</label>
              <input style={s.input} type="file" accept="image/*" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const url = await upload(f);
                if (url) setEditing({ ...editing, image_url: url });
              }} />
              {editing.image_url && <img src={editing.image_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginTop: 8 }} />}
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })} style={{ accentColor: G.gold }} />
            Published (visible to users)
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={s.btnGhost} onClick={() => setEditing(null)}>Cancel</button>
            <button style={s.btnGold} onClick={save}>Save</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && <div style={{ ...s.card, color: G.muted }}>No posts yet.</div>}
        {rows.map(r => {
          const dl = r.deadline_at ? new Date(r.deadline_at) : null;
          const expired = dl && dl.getTime() < Date.now();
          return (
            <div key={r.id} style={{ ...s.card, padding: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
              {r.image_url && <img src={r.image_url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{r.title} {!r.is_published && <span style={{ color: G.muted, fontSize: 11 }}>(draft)</span>}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                  Posted {new Date(r.created_at).toLocaleDateString()}{dl && ` · Deadline ${dl.toLocaleString()}${expired ? " (expired)" : ""}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ background: "transparent", color: G.text, border: `1px solid ${G.border}`, padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }} onClick={() => setEditing({ ...r, deadline_at: r.deadline_at ? new Date(r.deadline_at).toISOString().slice(0, 16) : "" })}>Edit</button>
                <button style={{ background: "transparent", color: G.red, border: `1px solid ${G.red}`, padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }} onClick={() => del(r.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Audit log =====
function AuditLog() {
  const { s, G } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [actors, setActors] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      const list = data ?? [];
      setRows(list);
      const ids = Array.from(new Set([...list.map(r => r.actor_id), ...list.map(r => r.target_user_id)].filter(Boolean)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email, account_number").in("user_id", ids);
        const map: Record<string, any> = {};
        (ps ?? []).forEach((p: any) => { map[p.user_id] = p; });
        setActors(map); setUsers(map);
      }
    })();
  }, []);

  const filtered = rows.filter(r => {
    if (actionFilter && !r.action.includes(actionFilter)) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    const u = users[r.target_user_id]; const a = actors[r.actor_id];
    return (u?.full_name || "").toLowerCase().includes(needle)
      || (u?.email || "").toLowerCase().includes(needle)
      || String(u?.account_number || "").includes(needle)
      || (r.note || "").toLowerCase().includes(needle)
      || (a?.full_name || "").toLowerCase().includes(needle);
  });

  const actions = Array.from(new Set(rows.map(r => r.action))).sort();

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...s.input, flex: 1, minWidth: 240 }} placeholder="Search by user, admin, note…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ background: G.card, color: G.text, border: `1px solid ${G.border}`, padding: "0 12px", borderRadius: 8, fontSize: 13 }}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 160px 1fr 1fr 110px 1fr", padding: "10px 14px", background: G.bg, fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>
          <span>WHEN</span><span>ADMIN</span><span>ACTION</span><span>TARGET USER</span><span>AMOUNT</span><span>NOTE</span>
        </div>
        {filtered.map(r => {
          const a = actors[r.actor_id]; const u = users[r.target_user_id];
          const colour = r.action.includes("approved") ? G.green : r.action.includes("rejected") ? G.red : G.amber;
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "160px 160px 1fr 1fr 110px 1fr", padding: "10px 14px", borderTop: `1px solid ${G.border}`, fontSize: 12, alignItems: "center" }}>
              <span style={{ color: G.muted }}>{new Date(r.created_at).toLocaleString()}</span>
              <span>{a?.full_name || a?.email || r.actor_id.slice(0, 8)}</span>
              <span style={{ color: colour, fontWeight: 600 }}>{r.action}</span>
              <span>{u ? <>#{u.account_number} {u.full_name || u.email}</> : "—"}</span>
              <span style={{ color: G.gold }}>{r.amount != null ? Number(r.amount).toFixed(2) : "—"}</span>
              <span style={{ color: G.muted, fontStyle: r.note ? "italic" : "normal" }}>{r.note || "—"}</span>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 20, color: G.muted, fontSize: 13 }}>No audit entries.</div>}
      </div>
    </div>
  );
}

function AffiliateAdmin() {
  const { s, G, toast } = useAurum();
  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState<string>("5");
  const [stats, setStats] = useState<{ affiliates: number; referrals: number; commissions: number }>({ affiliates: 0, referrals: 0, commissions: 0 });
  const [topAffiliates, setTopAffiliates] = useState<any[]>([]);

  const load = async () => {
    const { data: settings } = await supabase.from("app_settings").select("*").in("key", ["affiliate_enabled", "affiliate_commission_pct"]);
    const e = settings?.find((x: any) => x.key === "affiliate_enabled");
    const p = settings?.find((x: any) => x.key === "affiliate_commission_pct");
    setEnabled(e?.value === true || e?.value === "true");
    setPct(String(p?.value ?? 5));
    const { data: affs } = await supabase.from("affiliates").select("*").order("total_commission", { ascending: false }).limit(20);
    setTopAffiliates(affs ?? []);
    const { count: aCount } = await supabase.from("affiliates").select("*", { count: "exact", head: true });
    const { count: rCount } = await supabase.from("referrals").select("*", { count: "exact", head: true });
    const totalComm = (affs ?? []).reduce((sum: number, a: any) => sum + Number(a.total_commission || 0), 0);
    setStats({ affiliates: aCount ?? 0, referrals: rCount ?? 0, commissions: totalComm });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const pctNum = Number(pct);
    if (isNaN(pctNum) || pctNum < 0 || pctNum > 100) { toast("Commission must be 0–100"); return; }
    const { error: e1 } = await supabase.from("app_settings").update({ value: enabled as any, updated_at: new Date().toISOString() }).eq("key", "affiliate_enabled");
    const { error: e2 } = await supabase.from("app_settings").update({ value: pctNum as any, updated_at: new Date().toISOString() }).eq("key", "affiliate_commission_pct");
    if (e1 || e2) { toast((e1 || e2)!.message); return; }
    toast("Affiliate settings saved");
    load();
  };

  return (
    <div>
      <div style={{ ...s.card, padding: 18, marginBottom: 18 }}>
        <h2 style={{ ...s.serif, fontSize: 18, margin: "0 0 14px" }}>Affiliate Program Controls</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: G.gold }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Affiliate program is {enabled ? "ACTIVE" : "DISABLED"}</span>
        </label>
        <p style={{ fontSize: 12, color: G.muted, margin: "0 0 14px" }}>When active, the affiliate button appears on users' Home screen and commissions are paid automatically on approved deposits.</p>
        <label style={s.label}>COMMISSION PERCENTAGE (% of deposit amount)</label>
        <input style={{ ...s.input, maxWidth: 160 }} type="number" min={0} max={100} step={0.5} value={pct} onChange={e => setPct(e.target.value)} />
        <div style={{ marginTop: 16 }}>
          <button style={{ ...s.btnGold, width: "auto", padding: "10px 20px" }} onClick={save}>Save settings</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 700, color: G.gold }}>{stats.affiliates}</div>
          <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Affiliates</div>
        </div>
        <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 700, color: G.text }}>{stats.referrals}</div>
          <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Total referrals</div>
        </div>
        <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 700, color: G.green }}>${stats.commissions.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Commissions paid</div>
        </div>
      </div>

      <h3 style={{ ...s.serif, fontSize: 16, margin: "0 0 10px" }}>Top affiliates</h3>
      <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 140px", padding: "10px 14px", background: G.bg, fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>
          <span>USER ID</span><span>CODE</span><span>REFERRALS</span><span>COMMISSION</span>
        </div>
        {topAffiliates.map(a => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 140px", padding: "12px 14px", borderTop: `1px solid ${G.border}`, fontSize: 13 }}>
            <span style={{ fontFamily: "monospace", fontSize: 11 }}>{a.user_id.slice(0, 12)}…</span>
            <span style={{ fontFamily: "monospace", color: G.gold, fontWeight: 600 }}>{a.code}</span>
            <span>{a.total_referrals}</span>
            <span style={{ color: G.green, fontWeight: 600 }}>${Number(a.total_commission).toFixed(2)}</span>
          </div>
        ))}
        {topAffiliates.length === 0 && <div style={{ padding: 20, color: G.muted, fontSize: 13, textAlign: "center" }}>No affiliates yet.</div>}
      </div>
    </div>
  );
}