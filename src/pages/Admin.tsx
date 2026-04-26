import { useEffect, useState } from "react";
import { AurumProvider, useAurum } from "@/aurum/AurumContext";
import { Toast } from "@/aurum/ui";
import { COUNTRIES, fmtMoney, convertFromUsd, fxRatesSync } from "@/aurum/data";
import { supabase } from "@/integrations/supabase/client";
import { ProofViewer } from "@/aurum/ProofViewer";

type Tab = "users" | "deposits" | "withdrawals" | "products" | "accounts" | "fx" | "content" | "news" | "audit";

function AdminInner() {
  const { s, G, user, isAdmin, loading, signOut } = useAurum();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => { document.body.style.background = G.bg; document.body.style.margin = "0"; }, [G.bg]);

  if (loading) return <div style={{ ...s.app, padding: 40 }}>Loading…</div>;
  if (!user) return <div style={{ ...s.app, padding: 40 }}>Please sign in via the main app first.</div>;
  if (!isAdmin) return <div style={{ ...s.app, padding: 40 }}>You are not an admin.</div>;

  const tabs: Tab[] = ["users", "deposits", "withdrawals", "products", "accounts", "fx", "news", "content", "audit"];
  return (
    <div style={{ ...s.app, padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ ...s.serif, fontSize: 28, margin: 0 }}>Aurum Admin</h1>
          <button style={{ ...s.btnGhost, width: "auto", padding: "8px 14px" }} onClick={() => { signOut(); window.location.href = "/"; }}>Sign out</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? G.gold : G.card, color: tab === t ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{t}</button>
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
  const refresh = () => {
    let q = supabase.from("withdrawals").select("*, profiles!withdrawals_user_profile_fkey(full_name, email, account_number, currency), payment_methods(method_type, provider_name, account_number, paypal_email, account_holder_name)").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    q.then(({ data }) => setRows(data ?? []));
  };
  useEffect(refresh, [filter]);
  const approve = async (id: string) => {
    const { error } = await supabase.from("withdrawals").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast(error.message); return; }
    toast("Withdrawal marked paid"); refresh();
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["pending", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? G.gold : G.card, color: filter === f ? "#1a1208" : G.text, border: `1px solid ${G.border}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && <div style={{ ...s.card, color: G.muted }}>No withdrawals.</div>}
        {rows.map(r => (
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
  const refresh = () => supabase.from("products").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
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
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Image URL (optional)" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
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