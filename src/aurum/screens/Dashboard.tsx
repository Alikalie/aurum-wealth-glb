import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { fmtMoney } from "../data";
import { EmptyState, NavIcon } from "../ui";
import { supabase } from "@/integrations/supabase/client";

export function Dashboard({ nav, navTo }: { nav: (s: string) => void; navTo: (s: string) => void }) {
  const { G, profile } = useAurum();
  const [tab, setTab] = useState("Home");
  const tabs = ["Home", "Markets", "Transactions", "Profile"];
  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <div style={{ height: "100vh", overflowY: "auto", paddingBottom: 80 }}>
        {tab === "Home" && <HomeTab navTo={navTo} />}
        {tab === "Markets" && <MarketsTab />}
        {tab === "Transactions" && <TransactionsTab />}
        {tab === "Profile" && <ProfileTab nav={nav} navTo={navTo} />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: G.card, borderTop: `1px solid ${G.border}`, display: "flex", padding: "8px 0 12px", zIndex: 100 }}>
        {tabs.map(t => {
          const active = t === tab;
          return (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", color: active ? G.gold : G.inactive, fontFamily: "inherit", position: "relative", padding: "6px 0" }}>
              {active && <div style={{ position: "absolute", top: 0, width: 24, height: 2, background: G.gold, borderRadius: 1 }} />}
              <NavIcon name={t} active={active} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeTab({ navTo }: { navTo: (s: string) => void }) {
  const { s, G, profile } = useAurum();
  const balance = (profile?.earned ?? 0) - (profile?.withdrawn ?? 0);
  const cur = profile?.currency ?? "USD";
  const initials = (profile?.full_name ?? "U").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 13, color: G.muted }}>Welcome back</div>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 600 }}>{profile?.full_name || "Guest"}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{initials}</div>
      </div>
      <div style={{ ...s.card, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, letterSpacing: 0.5 }}>AVAILABLE BALANCE</div>
        <div style={{ ...s.serif, fontSize: 34, fontWeight: 600, margin: "8px 0 4px" }}>{fmtMoney(balance, cur)}</div>
        <div style={{ fontSize: 12, color: G.muted }}>Earned − Withdrawn</div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={{ ...s.btnGold, padding: 12, fontSize: 13 }} onClick={() => navTo("deposit")}>↓ Deposit</button>
          <button style={{ ...s.btnGhost, padding: 12, fontSize: 13 }} onClick={() => navTo("withdraw")}>↑ Withdraw</button>
        </div>
      </div>
      <EmptyState icon="✦" title="Welcome to Aurum" sub="Your personalized insights will appear here once you start investing." />
    </div>
  );
}

function MarketsTab() {
  const { s } = useAurum();
  const [products, setProducts] = useState<any[]>([]);
  const { G, profile, toast, user } = useAurum();
  useEffect(() => { supabase.from("products").select("*").eq("is_active", true).then(({ data }) => setProducts(data ?? [])); }, []);

  const buy = async (p: any) => {
    if (!user) return;
    if ((profile?.invested ?? 0) - 0 < p.price) { toast("Insufficient invested funds. Deposit first."); return; }
    const { error } = await supabase.from("user_products").insert({ user_id: user.id, product_id: p.id, purchase_price: p.price });
    if (error) { toast(error.message); return; }
    toast("Purchased!");
  };

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 16px" }}>Markets</h1>
      {products.length === 0 ? (
        <EmptyState icon="📈" title="No products yet" sub="Investment products published by Aurum will appear here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map(p => (
            <div key={p.id} style={{ ...s.card, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...s.serif, fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: G.muted, marginTop: 4, lineHeight: 1.5 }}>{p.description}</div>
                </div>
                <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, color: G.gold }}>{fmtMoney(Number(p.price), profile?.currency ?? "USD")}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 12, color: G.green }}>+{p.expected_return_pct}% expected</span>
                <button onClick={() => buy(p)} style={{ background: G.gold, color: "#1a1208", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Invest</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsTab() {
  const { s, G, user, profile } = useAurum();
  const [deps, setDeps] = useState<any[]>([]);
  const [wds, setWds] = useState<any[]>([]);
  const [ups, setUps] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setDeps(data ?? []));
    supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setWds(data ?? []));
    supabase.from("user_products").select("*, products(name)").eq("user_id", user.id).order("purchased_at", { ascending: false }).then(({ data }) => setUps(data ?? []));
  }, [user]);

  const cur = profile?.currency ?? "USD";
  const all = [
    ...deps.map(d => ({ ...d, kind: "Deposit", amt: Number(d.amount), date: d.created_at })),
    ...wds.map(w => ({ ...w, kind: "Withdrawal", amt: -Number(w.amount), date: w.created_at })),
    ...ups.filter(u => u.status === "sold").map(u => ({ ...u, kind: `Sold ${u.products?.name ?? ""}`, amt: Number(u.sale_price ?? u.purchase_price), date: u.sold_at, status: "approved" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 16px" }}>Transactions</h1>
      {all.length === 0 ? (
        <EmptyState icon="↔" title="No transactions yet" sub="Your deposits, withdrawals and sales will show up here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {all.map((t, i) => (
            <div key={i} style={{ ...s.card, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.kind}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{new Date(t.date).toLocaleDateString()} · {t.status}</div>
              </div>
              <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, color: t.amt >= 0 ? G.green : G.red }}>{t.amt >= 0 ? "+" : ""}{fmtMoney(t.amt, cur)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ nav, navTo }: { nav: (s: string) => void; navTo: (s: string) => void }) {
  const { s, G, profile, themeMode, setThemeMode, signOut, isAdmin } = useAurum();
  const cur = profile?.currency ?? "USD";
  const Toggle = ({ v, on }: { v: boolean; on: () => void }) => (
    <button onClick={on} style={{ width: 40, height: 22, borderRadius: 11, background: v ? G.gold : G.border, border: "none", position: "relative", cursor: "pointer", padding: 0 }}>
      <div style={{ position: "absolute", top: 2, left: v ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: G.text, transition: "left 0.2s" }} />
    </button>
  );
  const initials = (profile?.full_name ?? "U").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const items: { l: string; r: React.ReactNode; danger?: boolean; act?: () => void }[] = [
    { l: "Dark Mode", r: <Toggle v={themeMode === "dark"} on={() => setThemeMode(themeMode === "dark" ? "light" : "dark")} /> },
    { l: "Linked Accounts", r: <span style={{ color: G.muted }}>›</span>, act: () => navTo("payment-methods") },
    { l: "Currency", r: <span style={{ color: G.muted, fontSize: 13 }}>{cur} (locked) ›</span>, act: () => navTo("currency") },
    { l: "Help & Support", r: <span style={{ color: G.muted }}>›</span>, act: () => navTo("support") },
    { l: "Privacy Policy", r: <span style={{ color: G.muted }}>›</span>, act: () => navTo("privacy") },
    ...(isAdmin ? [{ l: "Admin Panel", r: <span style={{ color: G.gold }}>›</span>, act: () => (window.location.href = "/admin") }] : []),
    { l: "Log Out", r: <span style={{ color: G.red }}>›</span>, danger: true, act: async () => { await signOut(); nav("landing"); } },
  ];
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{ width: 78, height: 78, borderRadius: 39, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26 }}>{initials}</div>
        <div style={{ ...s.serif, fontSize: 22, fontWeight: 600, marginTop: 12 }}>{profile?.full_name || "Guest"}</div>
        <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{profile?.email}</div>
        <div style={{ display: "inline-block", background: G.gold + "22", color: G.gold, padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, marginTop: 6 }}>★ MEMBER</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { l: "Invested", v: fmtMoney(Number(profile?.invested ?? 0), cur) },
          { l: "Earned", v: fmtMoney(Number(profile?.earned ?? 0), cur) },
          { l: "Withdrawn", v: fmtMoney(Number(profile?.withdrawn ?? 0), cur) },
        ].map(x => (
          <div key={x.l} style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
            <div style={{ ...s.serif, fontSize: 14, fontWeight: 600, color: G.gold }}>{x.v}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={{ ...s.btnGold, padding: 12, fontSize: 13 }} onClick={() => navTo("deposit")}>Deposit</button>
        <button style={{ ...s.btnGhost, padding: 12, fontSize: 13 }} onClick={() => navTo("withdraw")}>Withdraw</button>
        <button style={{ ...s.btnGhost, padding: 12, fontSize: 13 }} onClick={() => navTo("sell")}>Sell</button>
      </div>

      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, overflow: "hidden" }}>
        {items.map((it, i) => (
          <div key={it.l} onClick={it.act} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: i ? `1px solid ${G.border}` : "none", cursor: it.act ? "pointer" : "default" }}>
            <span style={{ fontSize: 14, color: it.danger ? G.red : G.text, fontWeight: it.danger ? 600 : 400 }}>{it.l}</span>
            {it.r}
          </div>
        ))}
      </div>
    </div>
  );
}