import { useEffect, useState } from "react";
import { AurumProvider, useAurum } from "@/aurum/AurumContext";
import { Toast } from "@/aurum/ui";
import { COUNTRIES, fmtMoney, convertFromUsd, fxRatesSync } from "@/aurum/data";
import { supabase } from "@/integrations/supabase/client";
import { ProofViewer } from "@/aurum/ProofViewer";
import { AdminCountryPayoutWidget } from "@/aurum/CountryPayoutWidget";
import { AIFloatingButton } from "@/aurum/AIFloatingButton";

type Tab = "users" | "deposits" | "withdrawals" | "products" | "accounts" | "fx" | "content" | "news" | "affiliate" | "aff_apps" | "aff_wd" | "admins" | "audit" | "support_contacts" | "service" | "reports" | "notify";

function AdminInner() {
  const { s, G, user, isAdmin, isSuperAdmin, isSuperSuperAdmin, loading, signOut, themeMode, setThemeMode } = useAurum();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => { document.body.style.background = G.bg; document.body.style.margin = "0"; }, [G.bg]);

  if (loading) return <div style={{ ...s.app, padding: 40 }}>Loading…</div>;
  if (!user) return <div style={{ ...s.app, padding: 40 }}>Please sign in via the main app first.</div>;
  if (!isAdmin) return <div style={{ ...s.app, padding: 40 }}>You are not an admin.</div>;

  const tabs: Tab[] = ["users", "deposits", "withdrawals", "products", "accounts", "fx", "news", "affiliate", "aff_apps", "aff_wd", "reports", "notify", "content", "support_contacts", "audit"];
  if (isSuperAdmin || isSuperSuperAdmin) tabs.push("admins");
  if (isSuperSuperAdmin) tabs.push("service");
  const tabLabels: Record<Tab,string> = { users:"Users", deposits:"Deposits", withdrawals:"Withdrawals", products:"Products", accounts:"Accounts", fx:"FX", content:"Content", news:"News", affiliate:"Affiliate", aff_apps:"Aff. Apps", aff_wd:"Aff. Withdrawals", admins:"Admins", audit:"Audit", support_contacts:"Support Contacts", service:"Service Status", reports:"Reports", notify:"Notifications" };
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
        {tab === "support_contacts" && <SupportContactsEditor />}
        {tab === "service" && <ServiceStatusAdmin />}
        {tab === "reports" && <FinancialReports />}
        {tab === "notify" && <NotificationsBroadcast />}
        <Toast />
        <AIFloatingButton />
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
  const [aff, setAff] = useState<any>(null);
  const [affAcct, setAffAcct] = useState("");
  const [editingPm, setEditingPm] = useState<string | null>(null);
  const [pmEdit, setPmEdit] = useState<any>({});
  const [bucket, setBucket] = useState<"invested" | "earned" | "withdrawn">("earned");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("user_id", u.user_id).then(({ data }) => setPms(data ?? []));
    supabase.from("transactions").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }).limit(50).then(({ data }) => setTxs(data ?? []));
    supabase.from("affiliates").select("*").eq("user_id", u.user_id).maybeSingle().then(({ data }) => { setAff(data); setAffAcct(data?.payment_account ?? ""); });
  }, [u.user_id]);

  const reloadPms = () => supabase.from("payment_methods").select("*").eq("user_id", u.user_id).then(({ data }) => setPms(data ?? []));

  const startEditPm = (p: any) => {
    setEditingPm(p.id);
    setPmEdit({ provider_name: p.provider_name || "", account_holder_name: p.account_holder_name || "", account_number: p.account_number || "", paypal_email: p.paypal_email || "" });
  };
  const savePm = async () => {
    if (!editingPm) return;
    const { error } = await supabase.rpc("admin_update_payment_method", {
      _pm_id: editingPm,
      _provider_name: pmEdit.provider_name || null,
      _account_holder_name: pmEdit.account_holder_name || null,
      _account_number: pmEdit.account_number || null,
      _paypal_email: pmEdit.paypal_email || null,
    } as any);
    if (error) { toast(error.message); return; }
    toast("Payment method updated");
    setEditingPm(null); reloadPms();
  };
  const saveAffAcct = async () => {
    const { error } = await supabase.rpc("admin_update_affiliate_payment", { _user_id: u.user_id, _new_account: affAcct } as any);
    if (error) { toast(error.message); return; }
    toast("Affiliate payment account updated");
  };

  const fund = async () => {
    const a = Number(amount);
    if (!a || a <= 0) { toast("Enter amount"); return; }
    if (mode === "debit" && !note.trim()) { toast("A note/reason is required for debits"); return; }
    const signed = mode === "debit" ? -Math.abs(a) : Math.abs(a);
    const finalNote = mode === "debit"
      ? `[DEBIT] ${note.trim()}`
      : (note || null);
    setBusy(true);
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_credits").insert({ user_id: u.user_id, bucket, amount: signed, note: finalNote, created_by: me!.id });
    setBusy(false);
    if (error) { toast(error.message); return; }
    toast(`${mode === "debit" ? "Debited" : "Credited"} ${fmtMoney(a, u.currency)} ${mode === "debit" ? "from" : "to"} ${bucket}`);
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
          <div style={{ ...s.serif, fontSize: 16, marginBottom: 10 }}>Adjust user balance</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={() => setMode("credit")} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${mode === "credit" ? G.gold : G.border}`, background: mode === "credit" ? G.gold + "22" : "transparent", color: mode === "credit" ? G.gold : G.text, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Credit</button>
            <button onClick={() => setMode("debit")} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${mode === "debit" ? G.red : G.border}`, background: mode === "debit" ? G.red + "22" : "transparent", color: mode === "debit" ? G.red : G.text, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>− Debit (deduct)</button>
          </div>
          <select style={{ ...s.input, appearance: "none" }} value={bucket} onChange={e => setBucket(e.target.value as any)}>
            <option value="invested">Invested (deposit credit)</option>
            <option value="earned">Earned (withdrawable bonus)</option>
            <option value="withdrawn">Withdrawn (adjust withdrawn total)</option>
          </select>
          <input style={{ ...s.input, marginTop: 8 }} type="number" placeholder={`Amount in ${u.currency}`} value={amount} onChange={e => setAmount(e.target.value)} />
          <input style={{ ...s.input, marginTop: 8 }} placeholder={mode === "debit" ? "Reason (required, e.g. duplicate proof)" : "Note (optional)"} value={note} onChange={e => setNote(e.target.value)} />
          <button style={{ ...s.btnGold, marginTop: 10, ...(mode === "debit" ? { background: G.red, color: "#fff", borderColor: G.red } : {}) }} onClick={fund} disabled={busy}>
            {busy ? "Applying…" : mode === "debit" ? "Apply debit" : "Apply credit"}
          </button>
          {mode === "debit" && (
            <p style={{ fontSize: 11, color: G.muted, margin: "8px 0 0", lineHeight: 1.4 }}>
              Use this to correct double payment proofs or other mistakes. The deduction is logged in the user's transactions and the audit log.
            </p>
          )}
        </div>

        <div style={{ ...s.card, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ ...s.serif, fontSize: 16 }}>Payment methods ({pms.length})</div>
            {u.payment_edit_locked && <button onClick={unlockEdits} style={{ background: "transparent", border: `1px solid ${G.gold}`, color: G.gold, padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Unlock edits</button>}
          </div>
          {pms.map(p => (
            <div key={p.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: `1px solid ${G.border}` }}>
              {editingPm === p.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <strong>{p.method_type.replace("_", " ")}</strong>
                  {p.method_type !== "paypal" && (
                    <input style={s.input} placeholder="Provider" value={pmEdit.provider_name} onChange={e => setPmEdit({ ...pmEdit, provider_name: e.target.value })} />
                  )}
                  <input style={s.input} placeholder="Holder name" value={pmEdit.account_holder_name} onChange={e => setPmEdit({ ...pmEdit, account_holder_name: e.target.value })} />
                  {p.method_type === "paypal" ? (
                    <input style={s.input} placeholder="PayPal email" value={pmEdit.paypal_email} onChange={e => setPmEdit({ ...pmEdit, paypal_email: e.target.value })} />
                  ) : (
                    <input style={s.input} placeholder="Account number" value={pmEdit.account_number} onChange={e => setPmEdit({ ...pmEdit, account_number: e.target.value })} />
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditingPm(null)} style={{ flex: 1, background: "transparent", border: `1px solid ${G.border}`, color: G.text, borderRadius: 6, padding: "6px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                    <button onClick={savePm} style={{ flex: 1, background: G.gold, color: "#1a1208", border: "none", borderRadius: 6, padding: "6px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{p.method_type.replace("_", " ")}</strong> · {p.provider_name || "PayPal"} · {p.account_holder_name} · {p.account_number || p.paypal_email}
                  </div>
                  <button onClick={() => startEditPm(p)} style={{ background: "transparent", border: `1px solid ${G.gold}`, color: G.gold, borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>Edit</button>
                </div>
              )}
            </div>
          ))}
          {pms.length === 0 && <div style={{ color: G.muted, fontSize: 12 }}>No methods</div>}
        </div>

        {aff && (
          <div style={{ ...s.card, marginBottom: 14 }}>
            <div style={{ ...s.serif, fontSize: 16, marginBottom: 8 }}>Affiliate payment account</div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 6 }}>Code: <strong style={{ color: G.gold }}>{aff.code}</strong> · Balance: ${Number(aff.available_balance || 0).toFixed(2)}</div>
            <textarea style={{ ...s.input, minHeight: 60, fontFamily: "inherit" }} value={affAcct} onChange={e => setAffAcct(e.target.value)} />
            <button onClick={saveAffAcct} style={{ ...s.btnGold, marginTop: 8 }}>Save affiliate account</button>
          </div>
        )}

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
                {r.profiles?.email && <a href={`mailto:${r.profiles.email}?subject=Aurum%20Deposit%20%23${r.id.slice(0,8)}`} style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: G.gold, textDecoration: "underline" }}>✉ Email user</a>}
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
                {r.profiles?.email && <a href={`mailto:${r.profiles.email}?subject=Aurum%20Withdrawal%20%23${r.id.slice(0,8)}`} style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: G.gold, textDecoration: "underline" }}>✉ Email user</a>}
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

// ===== Affiliate applications review =====
function AffiliateApplications() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [reject, setReject] = useState<any>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    let q = supabase.from("affiliate_applications").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    const list = data ?? [];
    setRows(list);
    const ids = list.map((r: any) => r.user_id);
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email, account_number, currency").in("user_id", ids);
      const map: Record<string, any> = {};
      (ps ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
      // Per-user product counts
      const cmap: Record<string, number> = {};
      await Promise.all(ids.map(async (uid: string) => {
        const { count } = await supabase.from("user_products").select("*", { count: "exact", head: true }).eq("user_id", uid);
        cmap[uid] = count ?? 0;
      }));
      setCounts(cmap);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const approve = async (r: any) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliate_applications").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: me?.id }).eq("id", r.id);
    if (error) { toast(error.message); return; }
    toast("Application approved — affiliate code is live"); load();
  };
  const submitReject = async () => {
    if (!note.trim()) { toast("Add a reason"); return; }
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliate_applications").update({ status: "rejected", admin_note: note.trim(), reviewed_at: new Date().toISOString(), reviewed_by: me?.id }).eq("id", reject.id);
    if (error) { toast(error.message); return; }
    toast("Declined and user notified"); setReject(null); setNote(""); load();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["pending", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? G.gold : G.card, color: filter === f ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && <div style={{ ...s.card, color: G.muted }}>No applications.</div>}
        {rows.map(r => {
          const p = profiles[r.user_id];
          const cnt = counts[r.user_id] ?? 0;
          const eligible = cnt >= 5;
          return (
            <div key={r.id} style={{ ...s.card, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 600 }}>#{p?.account_number} {r.full_name} <span style={{ color: G.muted, fontWeight: 400 }}>({p?.email})</span></div>
                  <div style={{ fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleString()} · {r.country} · <strong style={{ color: r.status === "approved" ? G.green : r.status === "rejected" ? G.red : G.amber }}>{r.status}</strong></div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Promo code: <strong style={{ color: G.gold, fontFamily: "monospace" }}>{r.promo_code}</strong>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Payment account: <span style={{ color: G.muted }}>{r.payment_account}</span></div>
                  {r.admin_note && <div style={{ fontSize: 11, color: G.muted, marginTop: 4, fontStyle: "italic" }}>Note: {r.admin_note}</div>}
                  {p?.email && <a href={`mailto:${p.email}?subject=Aurum%20Affiliate%20Application`} style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: G.gold, textDecoration: "underline" }}>✉ Email user</a>}
                </div>
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: G.muted }}>PRODUCTS PURCHASED</div>
                  <div style={{ ...s.serif, fontSize: 22, fontWeight: 700, color: eligible ? G.green : G.red }}>{cnt} / 5</div>
                  <div style={{ fontSize: 10, color: eligible ? G.green : G.red, fontWeight: 600 }}>{eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}</div>
                </div>
              </div>
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...s.btnGold, padding: 8, fontSize: 12 }} onClick={() => approve(r)} disabled={!eligible} title={!eligible ? "User has not purchased 5 products" : ""}>Approve</button>
                  <button style={{ ...s.btnGhost, padding: 8, fontSize: 12 }} onClick={() => { setReject(r); setNote(""); }}>Decline…</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {reject && (
        <div onClick={() => setReject(null)} style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: G.card, borderRadius: 14, padding: 20, maxWidth: 440, width: "100%", border: `1px solid ${G.border}` }}>
            <div style={{ ...s.serif, fontSize: 18, marginBottom: 12 }}>Decline application</div>
            <textarea autoFocus style={{ ...s.input, minHeight: 100, fontFamily: "inherit" }} placeholder="Reason shown to the user" value={note} onChange={e => setNote(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={s.btnGhost} onClick={() => setReject(null)}>Cancel</button>
              <button style={{ ...s.btnGold, background: G.red, color: "#fff" }} onClick={submitReject}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Affiliate withdrawal review =====
function AffiliateWithdrawals() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [reject, setReject] = useState<any>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    let q = supabase.from("affiliate_withdrawals").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    const list = data ?? [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email, account_number").in("user_id", ids);
      const map: Record<string, any> = {};
      (ps ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const approve = async (r: any) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliate_withdrawals").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: me?.id }).eq("id", r.id);
    if (error) { toast(error.message); return; }
    toast("Marked paid — affiliate balance debited"); load();
  };
  const submitReject = async () => {
    if (!note.trim()) { toast("Add a reason"); return; }
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliate_withdrawals").update({ status: "rejected", admin_note: note.trim(), reviewed_at: new Date().toISOString(), reviewed_by: me?.id }).eq("id", reject.id);
    if (error) { toast(error.message); return; }
    toast("Declined"); setReject(null); setNote(""); load();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["pending", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? G.gold : G.card, color: filter === f ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && <div style={{ ...s.card, color: G.muted }}>No requests.</div>}
        {rows.map(r => {
          const p = profiles[r.user_id];
          return (
            <div key={r.id} style={{ ...s.card, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>#{p?.account_number} {p?.full_name} <span style={{ color: G.muted, fontWeight: 400 }}>({p?.email})</span></div>
                  <div style={{ fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleString()} · <strong style={{ color: r.status === "approved" ? G.green : r.status === "rejected" ? G.red : G.amber }}>{r.status}</strong></div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Pay to: <span style={{ color: G.muted }}>{r.payment_account}</span></div>
                  {r.admin_note && <div style={{ fontSize: 11, color: G.muted, marginTop: 4, fontStyle: "italic" }}>Note: {r.admin_note}</div>}
                  {p?.email && <a href={`mailto:${p.email}?subject=Aurum%20Commission%20Withdrawal`} style={{ display: "inline-block", marginTop: 6, fontSize: 11, color: G.gold, textDecoration: "underline" }}>✉ Email user</a>}
                </div>
                <div style={{ ...s.serif, fontSize: 20, color: G.gold }}>${Number(r.amount).toFixed(2)}</div>
              </div>
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button style={{ ...s.btnGold, padding: 8, fontSize: 12 }} onClick={() => approve(r)}>Mark Paid</button>
                  <button style={{ ...s.btnGhost, padding: 8, fontSize: 12 }} onClick={() => { setReject(r); setNote(""); }}>Decline…</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {reject && (
        <div onClick={() => setReject(null)} style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: G.card, borderRadius: 14, padding: 20, maxWidth: 440, width: "100%", border: `1px solid ${G.border}` }}>
            <div style={{ ...s.serif, fontSize: 18, marginBottom: 12 }}>Decline withdrawal</div>
            <textarea autoFocus style={{ ...s.input, minHeight: 100, fontFamily: "inherit" }} placeholder="Reason" value={note} onChange={e => setNote(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={s.btnGhost} onClick={() => setReject(null)}>Cancel</button>
              <button style={{ ...s.btnGold, background: G.red, color: "#fff" }} onClick={submitReject}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Admins management (super admin only) =====
function AdminsManagement() {
  const { s, G, toast, user: me, isSuperSuperAdmin } = useAurum();
  const [admins, setAdmins] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [emailPromote, setEmailPromote] = useState("");
  const [makeSuper, setMakeSuper] = useState(false);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role, is_super, is_super_super, created_at").eq("role", "admin");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (!ids.length) { setAdmins([]); return; }
    const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email, account_number").in("user_id", ids);
    const merged = (roles ?? []).map((r: any) => ({ ...r, profile: (ps ?? []).find((p: any) => p.user_id === r.user_id) }));
    setAdmins(merged);
  };
  useEffect(() => { load(); }, []);

  const search = async () => {
    if (!q.trim()) { setResults([]); return; }
    const term = q.trim().toLowerCase();
    const { data } = await supabase.from("profiles").select("user_id, full_name, email, account_number").or(`email.ilike.%${term}%,full_name.ilike.%${term}%`).limit(20);
    setResults(data ?? []);
  };

  const promote = async (uid: string) => {
    const { error } = await supabase.rpc("promote_to_admin", { _target: uid, _make_super: makeSuper });
    if (error) { toast(error.message); return; }
    toast(makeSuper ? "Promoted to super admin" : "Promoted to admin"); setQ(""); setResults([]); setMakeSuper(false); load();
  };
  const promoteByEmail = async () => {
    if (!emailPromote.trim()) { toast("Enter an email"); return; }
    const { error } = await supabase.rpc("promote_admin_by_email", { _email: emailPromote.trim(), _make_super: makeSuper });
    if (error) { toast(error.message); return; }
    toast("Promoted"); setEmailPromote(""); setMakeSuper(false); load();
  };
  const demote = async (uid: string) => {
    if (!confirm("Demote this admin?")) return;
    const { error } = await supabase.rpc("demote_admin", { _target: uid });
    if (error) { toast(error.message); return; }
    toast("Admin demoted"); load();
  };

  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.serif, fontSize: 16, marginBottom: 10 }}>Promote a user to admin</div>
        {isSuperSuperAdmin && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...s.input, flex: 1 }} placeholder="Promote by email" value={emailPromote} onChange={e => setEmailPromote(e.target.value)} />
              <button style={{ ...s.btnGold, width: "auto", padding: "10px 16px" }} onClick={promoteByEmail}>Promote by email</button>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12, color: G.muted, cursor: "pointer" }}>
              <input type="checkbox" checked={makeSuper} onChange={e => setMakeSuper(e.target.checked)} style={{ accentColor: G.gold }} />
              Grant Super Admin (only super-super admin can do this)
            </label>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...s.input, flex: 1 }} placeholder="Search by email or name" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
          <button style={{ ...s.btnGold, width: "auto", padding: "10px 16px" }} onClick={search}>Search</button>
        </div>
        {results.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {results.map(r => (
              <div key={r.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, border: `1px solid ${G.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>#{r.account_number} {r.full_name || "—"}</div>
                  <div style={{ fontSize: 11, color: G.muted }}>{r.email}</div>
                </div>
                <button style={{ background: G.gold, color: "#1a1208", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={() => promote(r.user_id)}>Promote</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ ...s.serif, fontSize: 16, margin: "0 0 10px" }}>Current admins ({admins.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {admins.map(a => (
          <div key={a.user_id} style={{ ...s.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>
                #{a.profile?.account_number} {a.profile?.full_name || a.profile?.email}
                {a.is_super_super && <span style={{ marginLeft: 8, fontSize: 10, color: "#fff", background: G.gold, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>SUPER-SUPER</span>}
                {a.is_super && <span style={{ marginLeft: 8, fontSize: 10, color: G.gold, border: `1px solid ${G.gold}`, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>SUPER ADMIN</span>}
              </div>
              <div style={{ fontSize: 11, color: G.muted }}>{a.profile?.email}</div>
            </div>
            {!a.is_super_super && a.user_id !== me?.id && (!a.is_super || isSuperSuperAdmin) && (
              <button onClick={() => demote(a.user_id)} style={{ background: "transparent", color: G.red, border: `1px solid ${G.red}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Demote</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Support contacts editor =====
function SupportContactsEditor() {
  const { s, G, toast } = useAurum();
  const [v, setV] = useState<any>({ whatsapp: "", email: "", phone: "", whatsapp_group: "", whatsapp_channel: "", telegram_channel: "" });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "support_contacts").maybeSingle()
      .then(({ data }) => { if (data?.value) setV({ ...v, ...(data.value as any) }); setLoaded(true); });
    // eslint-disable-next-line
  }, []);
  const save = async () => {
    const { error } = await supabase.from("app_settings").update({ value: v as any, updated_at: new Date().toISOString() }).eq("key", "support_contacts");
    if (error) { toast(error.message); return; }
    toast("Contacts saved");
  };
  if (!loaded) return <div style={{ color: G.muted }}>Loading…</div>;
  const fields: { k: string; l: string; ph: string }[] = [
    { k: "whatsapp", l: "WhatsApp number (with country code, digits only)", ph: "e.g. 233244000000" },
    { k: "email", l: "Support email", ph: "support@aurum.com" },
    { k: "phone", l: "Call number", ph: "+1 555 0100" },
    { k: "whatsapp_group", l: "Join WhatsApp group link", ph: "https://chat.whatsapp.com/..." },
    { k: "whatsapp_channel", l: "WhatsApp channel link", ph: "https://whatsapp.com/channel/..." },
    { k: "telegram_channel", l: "Telegram channel link", ph: "https://t.me/..." },
  ];
  return (
    <div style={{ ...s.card, padding: 18, maxWidth: 640 }}>
      <div style={{ ...s.serif, fontSize: 18, marginBottom: 4 }}>Support contact buttons</div>
      <div style={{ fontSize: 12, color: G.muted, marginBottom: 14 }}>These appear on the landing page and Support screen, plus the country-blocked notice. Leave blank to hide a button.</div>
      {fields.map(f => (
        <div key={f.k} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.4, marginBottom: 4 }}>{f.l.toUpperCase()}</div>
          <input style={s.input} placeholder={f.ph} value={v[f.k] || ""} onChange={e => setV({ ...v, [f.k]: e.target.value })} />
        </div>
      ))}
      <button style={{ ...s.btnGold, marginTop: 10 }} onClick={save}>Save</button>
    </div>
  );
}

// ===== Service status (super-super only) =====
function ServiceStatusAdmin() {
  return _ServiceStatusAdminImpl();
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => {
    const v = String(c ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, sections: { heading: string; rows: (string | number)[][] }[]) {
  // Lightweight printable HTML window — uses browser's "Save as PDF"
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 6px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-size:11px;margin-bottom:8px}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left}th{background:#f4f4f4}.meta{font-size:11px;color:#666;margin-bottom:14px}</style>
    </head><body><h1>${title}</h1><div class="meta">Generated ${new Date().toLocaleString()}</div>
    ${sections.map(sec => `<h2>${sec.heading}</h2><table>${sec.rows.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${String(c ?? "")}</th>` : `<td>${String(c ?? "")}</td>`).join("")}</tr>`).join("")}</table>`).join("")}
    <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html); w.document.close();
}

function FinancialReports() {
  const { s, G, toast } = useAurum();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: deps }, { data: wds }, { data: ups }, { data: aw }, { data: prof }] = await Promise.all([
      supabase.from("deposits").select("id,user_id,amount,method_type,status,created_at,reviewed_at").order("created_at", { ascending: false }).limit(2000),
      supabase.from("withdrawals").select("id,user_id,amount,status,created_at,reviewed_at,admin_note").order("created_at", { ascending: false }).limit(2000),
      supabase.from("user_products").select("id,user_id,product_id,purchase_price,status,purchased_at").order("purchased_at", { ascending: false }).limit(2000),
      supabase.from("affiliate_withdrawals").select("id,user_id,amount,status,created_at,payment_account").order("created_at", { ascending: false }).limit(2000),
      supabase.from("profiles").select("user_id,full_name,email,currency,country_code,country_name,invested,earned,withdrawn,locked_bonus,account_number").limit(2000),
    ]);
    setData({ deps: deps ?? [], wds: wds ?? [], ups: ups ?? [], aw: aw ?? [], prof: prof ?? [] });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) return <div style={{ color: G.muted }}>Loading reports…</div>;

  // Build country lookup from profiles
  const userCountry = new Map<string, string>(data.prof.map((p: any) => [p.user_id, p.country_code || ""]));
  const fromTs = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
  const toTs = to ? new Date(to + "T23:59:59").getTime() : Infinity;
  const matchCountry = (uid: string) => !country || userCountry.get(uid) === country;
  const matchDate = (iso: string) => { const t = new Date(iso).getTime(); return t >= fromTs && t <= toTs; };
  const profMatch = (p: any) => !country || p.country_code === country;

  const fDeps = data.deps.filter((d: any) => matchDate(d.created_at) && matchCountry(d.user_id));
  const fWds = data.wds.filter((w: any) => matchDate(w.created_at) && matchCountry(w.user_id));
  const fUps = data.ups.filter((p: any) => matchDate(p.purchased_at) && matchCountry(p.user_id));
  const fAw = data.aw.filter((w: any) => matchDate(w.created_at) && matchCountry(w.user_id));
  const fProf = data.prof.filter(profMatch);

  const totals = {
    depApproved: fDeps.filter((d: any) => d.status === "approved").reduce((a: number, d: any) => a + Number(d.amount), 0),
    depPending: fDeps.filter((d: any) => d.status === "pending").reduce((a: number, d: any) => a + Number(d.amount), 0),
    wdApproved: fWds.filter((w: any) => w.status === "approved").reduce((a: number, w: any) => a + Number(w.amount), 0),
    wdPending: fWds.filter((w: any) => w.status === "pending").reduce((a: number, w: any) => a + Number(w.amount), 0),
    upTotal: fUps.reduce((a: number, p: any) => a + Number(p.purchase_price), 0),
    affWd: fAw.filter((w: any) => w.status === "approved").reduce((a: number, w: any) => a + Number(w.amount), 0),
    userCount: fProf.length,
    investedSum: fProf.reduce((a: number, p: any) => a + Number(p.invested || 0), 0),
    earnedSum: fProf.reduce((a: number, p: any) => a + Number(p.earned || 0), 0),
    withdrawnSum: fProf.reduce((a: number, p: any) => a + Number(p.withdrawn || 0), 0),
  };

  const cc = (uid: string) => userCountry.get(uid) || "";
  const depRows: (string | number)[][] = [["ID", "User", "Country", "Amount", "Method", "Status", "Created", "Reviewed"], ...fDeps.map((d: any) => [d.id, d.user_id, cc(d.user_id), d.amount, d.method_type, d.status, d.created_at, d.reviewed_at || ""])];
  const wdRows: (string | number)[][] = [["ID", "User", "Country", "Amount", "Status", "Created", "Reviewed", "Admin note"], ...fWds.map((w: any) => [w.id, w.user_id, cc(w.user_id), w.amount, w.status, w.created_at, w.reviewed_at || "", w.admin_note || ""])];
  const upRows: (string | number)[][] = [["ID", "User", "Country", "Product", "Price", "Status", "Purchased"], ...fUps.map((p: any) => [p.id, p.user_id, cc(p.user_id), p.product_id, p.purchase_price, p.status, p.purchased_at])];
  const awRows: (string | number)[][] = [["ID", "User", "Country", "Amount", "Status", "Created", "Account"], ...fAw.map((w: any) => [w.id, w.user_id, cc(w.user_id), w.amount, w.status, w.created_at, w.payment_account || ""])];
  const profRows: (string | number)[][] = [["Account #", "Name", "Email", "Country", "Currency", "Invested", "Earned", "Withdrawn", "Locked bonus"], ...fProf.map((p: any) => [p.account_number || "", p.full_name || "", p.email || "", p.country_code || "", p.currency, p.invested, p.earned, p.withdrawn, p.locked_bonus || 0])];
  const summaryRows: (string | number)[][] = [
    ["Metric", "Value"],
    ["Filter — From", from || "(any)"],
    ["Filter — To", to || "(any)"],
    ["Filter — Country", country || "(all)"],
    ["Total users", totals.userCount],
    ["Deposits approved (sum)", totals.depApproved.toFixed(2)],
    ["Deposits pending (sum)", totals.depPending.toFixed(2)],
    ["Withdrawals approved (sum)", totals.wdApproved.toFixed(2)],
    ["Withdrawals pending (sum)", totals.wdPending.toFixed(2)],
    ["Product purchases (sum)", totals.upTotal.toFixed(2)],
    ["Affiliate withdrawals approved (sum)", totals.affWd.toFixed(2)],
    ["Profiles invested (sum)", totals.investedSum.toFixed(2)],
    ["Profiles earned (sum)", totals.earnedSum.toFixed(2)],
    ["Profiles withdrawn (sum)", totals.withdrawnSum.toFixed(2)],
  ];

  const exportAllCSV = () => {
    const all: (string | number)[][] = [];
    const push = (h: string, rows: (string | number)[][]) => { all.push([h]); rows.forEach(r => all.push(r)); all.push([]); };
    push("SUMMARY", summaryRows);
    push("DEPOSITS", depRows);
    push("WITHDRAWALS", wdRows);
    push("PRODUCT PURCHASES", upRows);
    push("AFFILIATE WITHDRAWALS", awRows);
    push("USER BALANCES", profRows);
    downloadCSV(`aurum-financials-${new Date().toISOString().slice(0,10)}.csv`, all);
    toast("CSV downloaded");
  };

  const exportPDF = () => {
    downloadPDF("Aurum Financial Report", [
      { heading: "Summary", rows: summaryRows },
      { heading: "Deposits", rows: depRows },
      { heading: "Withdrawals", rows: wdRows },
      { heading: "Product purchases", rows: upRows },
      { heading: "Affiliate withdrawals", rows: awRows },
      { heading: "User balances", rows: profRows },
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...s.card, padding: 18 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 4 }}>Financial Reports</div>
        <p style={{ fontSize: 12, color: G.muted, marginBottom: 14 }}>Snapshot of all financial flows. Filter by date and country, then export as CSV or PDF.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 14 }}>
          <div>
            <label style={s.label}>FROM</label>
            <input type="date" style={s.input} value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>TO</label>
            <input type="date" style={s.input} value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>COUNTRY</label>
            <select style={{ ...s.input, appearance: "none" }} value={country} onChange={e => setCountry(e.target.value)}>
              <option value="">All countries</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button style={{ ...s.btnGhost, padding: "10px 12px" }} onClick={() => { setFrom(""); setTo(""); setCountry(""); }}>Clear filters</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...s.btnGold, width: "auto", padding: "10px 18px" }} onClick={exportAllCSV}>⬇ Export CSV</button>
          <button style={{ ...s.btnGhost, width: "auto", padding: "10px 18px" }} onClick={exportPDF}>⬇ Export PDF</button>
          <button style={{ ...s.btnGhost, width: "auto", padding: "10px 18px" }} onClick={() => { downloadCSV(`deposits-${new Date().toISOString().slice(0,10)}.csv`, depRows); }}>Deposits CSV</button>
          <button style={{ ...s.btnGhost, width: "auto", padding: "10px 18px" }} onClick={() => { downloadCSV(`withdrawals-${new Date().toISOString().slice(0,10)}.csv`, wdRows); }}>Withdrawals CSV</button>
          <button style={{ ...s.btnGhost, width: "auto", padding: "10px 18px" }} onClick={() => { downloadCSV(`affiliate-withdrawals-${new Date().toISOString().slice(0,10)}.csv`, awRows); }}>Affiliate WD CSV</button>
        </div>
      </div>
      <AdminCountryPayoutWidget />
      <div style={{ ...s.card, padding: 18 }}>
        <div style={{ ...s.serif, fontSize: 15, marginBottom: 10 }}>Summary</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {summaryRows.slice(1).map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${G.border}` }}>
                <td style={{ padding: "6px 8px", color: G.muted }}>{r[0]}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function _ServiceStatusAdminImpl() {
  const { s, G, toast } = useAurum();
  const [enabled, setEnabled] = useState(true);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "service_status").maybeSingle().then(({ data }) => {
      const v = (data?.value as any) || { enabled: true, blocked_countries: [] };
      setEnabled(!!v.enabled); setBlocked(v.blocked_countries || []); setLoaded(true);
    });
  }, []);
  const save = async () => {
    const { error } = await supabase.from("app_settings").update({ value: { enabled, blocked_countries: blocked } as any, updated_at: new Date().toISOString() }).eq("key", "service_status");
    if (error) { toast(error.message); return; }
    toast("Service status saved");
  };
  const toggleCountry = (code: string) => {
    setBlocked(b => b.includes(code) ? b.filter(c => c !== code) : [...b, code]);
  };
  if (!loaded) return <div style={{ color: G.muted }}>Loading…</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...s.card, padding: 18 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 6 }}>Master Service Switch</div>
        <p style={{ fontSize: 12, color: G.muted, marginBottom: 14 }}>Turn the entire system off for ALL non-admin users. They'll see the "service unavailable" screen with the support contact buttons.</p>
        <button onClick={() => setEnabled(!enabled)} style={{ width: "100%", padding: 18, fontSize: 16, fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", background: enabled ? G.green : G.red, color: "#fff" }}>
          {enabled ? "✓ SERVICE IS ON — Click to TURN OFF" : "✕ SERVICE IS OFF — Click to TURN ON"}
        </button>
      </div>
      <div style={{ ...s.card, padding: 18 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 6 }}>Blocked countries ({blocked.length})</div>
        <p style={{ fontSize: 12, color: G.muted, marginBottom: 12 }}>Tick any country to block users from that country only.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6, maxHeight: 360, overflowY: "auto", padding: 8, border: `1px solid ${G.border}`, borderRadius: 8 }}>
          {COUNTRIES.map(c => (
            <label key={c.code} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 6px", cursor: "pointer", background: blocked.includes(c.code) ? G.red + "22" : "transparent", borderRadius: 6 }}>
              <input type="checkbox" checked={blocked.includes(c.code)} onChange={() => toggleCountry(c.code)} style={{ accentColor: G.red }} />
              <span>{c.flag} {c.name}</span>
            </label>
          ))}
        </div>
      </div>
      <button style={{ ...s.btnGold, alignSelf: "flex-start", padding: "10px 24px" }} onClick={save}>Save service status</button>
    </div>
  );
}

function NotificationsBroadcast() {
  const { s, G, toast } = useAurum();
  const [mode, setMode] = useState<"all" | "user">("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"info" | "approved" | "rejected">("info");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,kind,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(20);
    setRecent(data ?? []);
  };
  useEffect(() => { loadRecent(); }, []);

  useEffect(() => {
    if (mode !== "user" || search.trim().length < 2) { setUsers([]); return; }
    const q = search.trim();
    supabase.from("profiles").select("user_id,email,full_name,account_number,country_name")
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20)
      .then(({ data }) => setUsers(data ?? []));
  }, [mode, search]);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast("Title and body are required"); return; }
    if (mode === "user" && !selected) { toast("Pick a user"); return; }
    if (!confirm(mode === "all" ? "Send this notification to ALL users?" : `Send to ${selected.email}?`)) return;
    setSending(true);
    const { data, error } = await supabase.rpc("admin_send_notification", {
      _target_user_id: mode === "all" ? null : selected.user_id,
      _title: title.trim(),
      _body: body.trim(),
      _kind: kind,
    });
    setSending(false);
    if (error) { toast(error.message); return; }
    toast(`Sent to ${data ?? 0} user(s)`);
    setTitle(""); setBody(""); setSelected(null); setSearch("");
    loadRecent();
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ ...s.card, padding: 18 }}>
        <div style={{ ...s.serif, fontSize: 20, marginBottom: 4 }}>Send notification</div>
        <p style={{ fontSize: 12, color: G.muted, marginBottom: 14 }}>Broadcast to every user or send a targeted message to one user. Delivered to their in-app Notifications screen instantly.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["all", "user"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${mode === m ? G.gold : G.border}`, background: mode === m ? G.gold + "22" : "transparent", color: mode === m ? G.gold : G.text, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {m === "all" ? "📣 All users" : "👤 Specific user"}
            </button>
          ))}
        </div>

        {mode === "user" && (
          <>
            <label style={s.label}>FIND USER (email or name)</label>
            <input style={s.input} value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} placeholder="Type to search…" />
            {selected ? (
              <div style={{ marginTop: 8, padding: 10, border: `1px solid ${G.gold}`, borderRadius: 8, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>{selected.full_name || selected.email}</strong> · {selected.email}{selected.account_number ? ` · #${selected.account_number}` : ""}</span>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: G.red, cursor: "pointer" }}>Clear</button>
              </div>
            ) : users.length > 0 && (
              <div style={{ marginTop: 6, maxHeight: 200, overflowY: "auto", border: `1px solid ${G.border}`, borderRadius: 8 }}>
                {users.map(u => (
                  <div key={u.user_id} onClick={() => setSelected(u)} style={{ padding: 10, borderBottom: `1px solid ${G.border}`, cursor: "pointer", fontSize: 12 }}>
                    <strong>{u.full_name || "—"}</strong> · {u.email}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <label style={{ ...s.label, marginTop: 14 }}>TITLE</label>
        <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance" maxLength={120} />

        <label style={{ ...s.label, marginTop: 14 }}>MESSAGE</label>
        <textarea style={{ ...s.input, minHeight: 100, fontFamily: "inherit", resize: "vertical" }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message…" maxLength={2000} />

        <label style={{ ...s.label, marginTop: 14 }}>TYPE</label>
        <select style={s.input} value={kind} onChange={e => setKind(e.target.value as any)}>
          <option value="info">Info (neutral)</option>
          <option value="approved">Success / approved (green)</option>
          <option value="rejected">Alert / rejected (red)</option>
        </select>

        <button style={{ ...s.btnGold, marginTop: 18 }} onClick={send} disabled={sending}>
          {sending ? "Sending…" : mode === "all" ? "Broadcast to all users" : "Send notification"}
        </button>
      </div>

      <div style={{ ...s.card, padding: 18 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 8 }}>Recent notifications (last 20)</div>
        {recent.length === 0 ? (
          <div style={{ color: G.muted, fontSize: 12 }}>None yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map(r => (
              <div key={r.id} style={{ padding: 10, border: `1px solid ${G.border}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{r.title}</strong>
                  <span style={{ fontSize: 10, color: G.muted }}>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.body && <div style={{ fontSize: 12, color: G.muted, marginTop: 4, whiteSpace: "pre-wrap" }}>{r.body}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}