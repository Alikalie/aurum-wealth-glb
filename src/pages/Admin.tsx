import { useEffect, useState } from "react";
import { AurumProvider, useAurum } from "@/aurum/AurumContext";
import { Toast } from "@/aurum/ui";
import { supabase } from "@/integrations/supabase/client";

function AdminInner() {
  const { s, G, user, isAdmin, loading, toast, signOut } = useAurum();
  const [tab, setTab] = useState<"deposits"|"withdrawals"|"content"|"products"|"accounts">("deposits");

  useEffect(() => {
    document.body.style.background = G.bg;
    document.body.style.margin = "0";
  }, [G.bg]);

  if (loading) return <div style={{ ...s.app, padding: 40 }}>Loading…</div>;
  if (!user) return <div style={{ ...s.app, padding: 40 }}>Please sign in via the main app first, then return to /admin.</div>;
  if (!isAdmin) return <div style={{ ...s.app, padding: 40 }}>You are not an admin.</div>;

  const tabs: typeof tab[] = ["deposits","withdrawals","content","products","accounts"];

  return (
    <div style={{ ...s.app, padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ ...s.serif, fontSize: 28, margin: 0 }}>Aurum Admin</h1>
          <button style={{ ...s.btnGhost, width: "auto", padding: "8px 14px" }} onClick={() => { signOut(); window.location.href = "/"; }}>Sign out</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab===t? G.gold : G.card, color: tab===t? "#1a1208": G.text, border: `1px solid ${G.border}`, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{t}</button>
          ))}
        </div>
        {tab === "deposits" && <Deposits />}
        {tab === "withdrawals" && <Withdrawals />}
        {tab === "content" && <ContentEditor />}
        {tab === "products" && <Products />}
        {tab === "accounts" && <AdminAccounts />}
        <Toast />
      </div>
    </div>
  );
}

function Deposits() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const refresh = () => supabase.from("deposits").select("*, profiles!inner(full_name, email)").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
  const review = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("deposits").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast(error.message); return; }
    toast(`Deposit ${status}`); refresh();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.length === 0 && <div style={{ ...s.card, color: G.muted }}>No deposits.</div>}
      {rows.map(r => (
        <div key={r.id} style={{ ...s.card, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.profiles?.full_name} <span style={{ color: G.muted, fontWeight: 400 }}>({r.profiles?.email})</span></div>
              <div style={{ fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleString()} · {r.method_type} · {r.status}</div>
              {r.proof_url && <a href={r.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: G.gold, fontSize: 12 }}>View proof</a>}
            </div>
            <div style={{ ...s.serif, fontSize: 20, color: G.gold }}>{Number(r.amount).toFixed(2)}</div>
          </div>
          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={{ ...s.btnGold, padding: 8, fontSize: 12 }} onClick={() => review(r.id, "approved")}>Approve</button>
              <button style={{ ...s.btnGhost, padding: 8, fontSize: 12 }} onClick={() => review(r.id, "rejected")}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Withdrawals() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const refresh = () => supabase.from("withdrawals").select("*, profiles!inner(full_name, email), payment_methods(method_type, provider_name, account_number, paypal_email)").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
  const review = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("withdrawals").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast(error.message); return; }
    toast(`Withdrawal ${status}`); refresh();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.length === 0 && <div style={{ ...s.card, color: G.muted }}>No withdrawals.</div>}
      {rows.map(r => (
        <div key={r.id} style={{ ...s.card, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.profiles?.full_name} <span style={{ color: G.muted, fontWeight: 400 }}>({r.profiles?.email})</span></div>
              <div style={{ fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleString()} · {r.status}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>To: {r.payment_methods?.provider_name} {r.payment_methods?.account_number || r.payment_methods?.paypal_email}</div>
            </div>
            <div style={{ ...s.serif, fontSize: 20, color: G.gold }}>{Number(r.amount).toFixed(2)}</div>
          </div>
          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={{ ...s.btnGold, padding: 8, fontSize: 12 }} onClick={() => review(r.id, "approved")}>Mark Paid</button>
              <button style={{ ...s.btnGhost, padding: 8, fontSize: 12 }} onClick={() => review(r.id, "rejected")}>Reject</button>
            </div>
          )}
        </div>
      ))}
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
  const save = async (table: "support_content"|"privacy_content", body: string) => {
    const { error } = await supabase.from(table).update({ body, updated_at: new Date().toISOString() }).eq("id", 1);
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

function Products() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState(""), [desc, setDesc] = useState(""), [price, setPrice] = useState(""), [pct, setPct] = useState("");
  const refresh = () => supabase.from("products").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    if (!name || !price) { toast("Name and price required"); return; }
    const { error } = await supabase.from("products").insert({ name, description: desc, price: Number(price), expected_return_pct: Number(pct) || 0 });
    if (error) { toast(error.message); return; }
    setName(""); setDesc(""); setPrice(""); setPct(""); refresh();
  };
  const toggle = async (r: any) => { await supabase.from("products").update({ is_active: !r.is_active }).eq("id", r.id); refresh(); };
  const del = async (id: string) => { await supabase.from("products").delete().eq("id", id); refresh(); };
  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 10 }}>Add Product</div>
        <input style={s.input} placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input style={s.input} placeholder="Price" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          <input style={s.input} placeholder="Expected return %" type="number" value={pct} onChange={e => setPct(e.target.value)} />
        </div>
        <button style={{ ...s.btnGold, marginTop: 10 }} onClick={add}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(r => (
          <div key={r.id} style={{ ...s.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.name} {!r.is_active && <span style={{ color: G.muted, fontSize: 11 }}>(hidden)</span>}</div>
              <div style={{ fontSize: 12, color: G.muted }}>{Number(r.price).toFixed(2)} · +{r.expected_return_pct}%</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...s.btnGhost, padding: 6, fontSize: 11, width: "auto" }} onClick={() => toggle(r)}>{r.is_active ? "Hide" : "Show"}</button>
              <button style={{ ...s.btnGhost, padding: 6, fontSize: 11, width: "auto", color: G.red }} onClick={() => del(r.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAccounts() {
  const { s, G, toast } = useAurum();
  const [rows, setRows] = useState<any[]>([]);
  const [methodType, setMethodType] = useState<"mobile_money"|"bank"|"paypal">("mobile_money");
  const [label, setLabel] = useState(""), [acctName, setAcctName] = useState(""), [acctNum, setAcctNum] = useState(""), [instr, setInstr] = useState("");
  const refresh = () => supabase.from("admin_payment_accounts").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    if (!label || !acctName || !acctNum) { toast("Fill all fields"); return; }
    const { error } = await supabase.from("admin_payment_accounts").insert({ method_type: methodType, label, account_name: acctName, account_number: acctNum, instructions: instr });
    if (error) { toast(error.message); return; }
    setLabel(""); setAcctName(""); setAcctNum(""); setInstr(""); refresh();
  };
  const del = async (id: string) => { await supabase.from("admin_payment_accounts").delete().eq("id", id); refresh(); };
  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.serif, fontSize: 18, marginBottom: 10 }}>Add Deposit Account</div>
        <select style={{ ...s.input, appearance: "none" }} value={methodType} onChange={e => setMethodType(e.target.value as any)}>
          <option value="mobile_money">Mobile Money</option>
          <option value="bank">Bank</option>
          <option value="paypal">PayPal</option>
        </select>
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Label (e.g. MTN Ghana)" value={label} onChange={e => setLabel(e.target.value)} />
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Account name" value={acctName} onChange={e => setAcctName(e.target.value)} />
        <input style={{ ...s.input, marginTop: 8 }} placeholder="Account number / email" value={acctNum} onChange={e => setAcctNum(e.target.value)} />
        <textarea style={{ ...s.input, marginTop: 8, minHeight: 80, fontFamily: "inherit" }} placeholder="Instructions for users" value={instr} onChange={e => setInstr(e.target.value)} />
        <button style={{ ...s.btnGold, marginTop: 10 }} onClick={add}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(r => (
          <div key={r.id} style={{ ...s.card, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.label} <span style={{ color: G.muted, fontSize: 11 }}>({r.method_type})</span></div>
                <div style={{ fontSize: 12 }}>{r.account_name} · {r.account_number}</div>
              </div>
              <button style={{ ...s.btnGhost, padding: 6, fontSize: 11, width: "auto", color: G.red }} onClick={() => del(r.id)}>Delete</button>
            </div>
          </div>
        ))}
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