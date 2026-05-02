import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { fmtMoney, convertFromUsd } from "../data";
import { EmptyState, NavIcon } from "../ui";
import { NewsFeed } from "./NewsFeed";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/i18n";
import i18n from "@/i18n";

type NavFn = (s: string, payload?: any) => void;

export function Dashboard({ nav, navTo }: { nav: NavFn; navTo: NavFn }) {
  const { G, profile } = useAurum();
  const [tab, setTab] = useState("Home");
  const tabs = ["Home", "Markets", "Transactions", "Profile"];

  // Blocked banner
  if (profile?.is_blocked) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: G.bg, color: G.text }}>
        <div style={{ width: 70, height: 70, borderRadius: 35, background: G.red + "22", border: `1px solid ${G.red}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: G.red, marginBottom: 18 }}>⊘</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Account blocked</div>
        <p style={{ color: G.muted, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>Your account has been temporarily blocked. Please contact support for assistance.</p>
        <button style={{ background: "transparent", color: G.gold, border: `1px solid ${G.gold}`, borderRadius: 12, padding: "12px 24px", marginTop: 22, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }} onClick={() => navTo("support")}>Contact Support</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <div style={{ height: "100vh", overflowY: "auto", paddingBottom: 80 }}>
        {tab === "Home" && <HomeTab navTo={navTo} />}
        {tab === "Markets" && <MarketsTab navTo={navTo} />}
        {tab === "Transactions" && <TransactionsTab navTo={navTo} />}
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

function HomeTab({ navTo }: { navTo: NavFn }) {
  const { s, G, profile } = useAurum();
  const [affEnabled, setAffEnabled] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "affiliate_enabled").maybeSingle()
      .then(({ data }) => setAffEnabled(data?.value === true || data?.value === "true"));
  }, []);
  const deposited = Number(profile?.invested ?? 0);
  const profit = Number(profile?.earned ?? 0);
  const withdrawn = Number(profile?.withdrawn ?? 0);
  const wallet = deposited + profit - withdrawn; // one combined wallet
  const cur = profile?.currency ?? "USD";
  const initials = ((profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "")) || (profile?.full_name ?? "U").slice(0, 2);
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12, color: G.muted }}>Welcome back</div>
          <div style={{ ...s.serif, fontSize: 18, fontWeight: 600 }}>{profile?.first_name || profile?.full_name || "Guest"}</div>
          {profile?.account_number && <div style={{ fontSize: 10, color: G.gold, fontFamily: "monospace", marginTop: 2 }}>ID #{profile.account_number}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{initials.toUpperCase()}</div>
      </div>
      <div style={{ ...s.card, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>WALLET BALANCE</div>
        <div style={{ ...s.serif, fontSize: 28, fontWeight: 600, margin: "6px 0 4px" }}>{fmtMoney(wallet, cur)}</div>
        <div style={{ fontSize: 11, color: G.muted }}>Your money — use it to buy products or withdraw anytime.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{ ...s.btnGold, padding: 11, fontSize: 12 }} onClick={() => navTo("deposit")}>↓ Deposit</button>
          <button style={{ ...s.btnGhost, padding: 11, fontSize: 12 }} onClick={() => navTo("withdraw")}>↑ Withdraw</button>
        </div>
      </div>
      <button style={{ ...s.btnGhost, marginBottom: 16 }} onClick={() => navTo("my-products")}>My products & active cycles →</button>
      {affEnabled && (
        <button
          style={{ ...s.btnGold, marginBottom: 16, background: G.gold, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={() => navTo("affiliate")}
        >
          <span aria-hidden>★</span> Affiliate Program
        </button>
      )}
      <NewsFeed />
    </div>
  );
}

function MarketsTab({ navTo }: { navTo: NavFn }) {
  const { s, G, profile, user, toast } = useAurum();
  const [products, setProducts] = useState<any[]>([]);
  const cur = profile?.currency ?? "USD";

  useEffect(() => { supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).then(({ data }) => setProducts(data ?? [])); }, []);

  const onBuy = (p: any) => {
    if (!user) {
      toast("Please sign in to buy a product");
      setTimeout(() => navTo("login"), 600);
      return;
    }
    navTo("product-details", p.id);
  };

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 16px" }}>Markets</h1>
      {products.length === 0 ? (
        <EmptyState icon="📈" title="No products yet" sub="Investment products published by Aurum will appear here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map(p => {
            const priceLocal = convertFromUsd(Number(p.price), cur);
            const dailyLocal = convertFromUsd(Number(p.daily_income), cur);
            const intervalH = Number(p.payout_interval_hours) || 24;
            const totalPayouts = Math.round((Number(p.cycle_days) * 24) / intervalH);
            const totalReturn = dailyLocal * totalPayouts;
            const cycleLabel = intervalH >= 168 ? `${Math.round(p.cycle_days / 7)} Weeks` : `${p.cycle_days} Days`;
            const perLabel = intervalH < 24 ? `${intervalH}h` : intervalH === 24 ? "Day" : intervalH === 168 ? "Week" : `${intervalH / 24}d`;
            // Approx rating from ROI
            const roi = Number(p.price) > 0 ? (Number(p.daily_income) * totalPayouts - Number(p.price)) / Number(p.price) : 0;
            const rating = Math.max(0.1, Math.min(5, roi)).toFixed(1);
            return (
              <div key={p.id} style={{ ...s.card, padding: 0, overflow: "hidden" }}>
                {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />}
                {/* Header: name + verified + rating */}
                <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ ...s.serif, fontSize: 19, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${G.gold}`, color: G.gold, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                      <span aria-hidden>✓</span> Verified
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: G.gold, fontSize: 12, fontWeight: 600 }}>
                      <span aria-hidden>★</span> {rating}
                    </span>
                  </div>
                </div>
                {/* Description */}
                {p.description && (
                  <div style={{ padding: "0 16px 12px", fontSize: 13, color: G.muted, lineHeight: 1.5, borderBottom: `1px solid ${G.border}` }}>{p.description}</div>
                )}
                {/* Detail rows */}
                <div style={{ padding: "4px 16px" }}>
                  <DetailRow label="Price" value={fmtMoney(priceLocal, cur)} G={G} bold />
                  <DetailRow label="Daily Earning" value={`+${fmtMoney(dailyLocal, cur)}`} G={G} valueColor={G.green} />
                  <DetailRow label="Circle Duration" value={cycleLabel} G={G} />
                  <DetailRow label={`Per ${perLabel}`} value={fmtMoney(dailyLocal, cur)} G={G} muted />
                  <DetailRow label="Total Revenue" value={fmtMoney(totalReturn, cur)} G={G} bold last />
                </div>
                {/* Buy button */}
                <div style={{ padding: 14, background: G.bg }}>
                  <button
                    onClick={() => onBuy(p)}
                    style={{ width: "100%", background: G.text === "#1A1612" ? "#0E3B2E" : G.gold, color: G.text === "#1A1612" ? "#fff" : "#1a1208", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Buy Product
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, G, bold, last, muted, valueColor }: { label: string; value: string; G: any; bold?: boolean; last?: boolean; muted?: boolean; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: last ? "none" : `1px solid ${G.border}` }}>
      <span style={{ fontSize: 13, color: muted ? G.muted : G.text }}>{label}</span>
      <span style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? 700 : 600, color: valueColor || (bold ? G.text : G.text) }}>{value}</span>
    </div>
  );
}

function TransactionsTab({ navTo }: { navTo: NavFn }) {
  const { s, G, user, profile } = useAurum();
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200).then(({ data }) => setTxs(data ?? []));
  }, [user]);

  const cur = profile?.currency ?? "USD";
  const labels: Record<string, string> = {
    deposit: "Deposit", withdrawal: "Withdrawal", daily_earning: "Daily earning",
    admin_credit: "Admin credit", product_purchase: "Product purchase",
    product_sale: "Product sale", cycle_complete: "Cycle complete",
  };

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 16px" }}>Transactions</h1>
      {txs.length === 0 ? (
        <EmptyState icon="↔" title="No transactions yet" sub="Your deposits, withdrawals, daily earnings and product activity will show here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {txs.map(t => {
            const amt = Number(t.amount);
            return (
              <button key={t.id} onClick={() => navTo("tx-details", t.id)} style={{ ...s.card, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: G.text }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{labels[t.kind] || t.kind}</div>
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{new Date(t.created_at).toLocaleDateString()} {t.note ? `· ${t.note}` : ""}</div>
                </div>
                <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, color: amt >= 0 ? G.green : G.red }}>{amt >= 0 ? "+" : ""}{fmtMoney(amt, t.currency || cur)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ nav, navTo }: { nav: NavFn; navTo: NavFn }) {
  const { s, G, profile, themeMode, setThemeMode, signOut, isAdmin, refreshProfile, user, toast } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [langOpen, setLangOpen] = useState(false);
  const Toggle = ({ v, on }: { v: boolean; on: () => void }) => (
    <button onClick={on} style={{ width: 40, height: 22, borderRadius: 11, background: v ? G.gold : G.border, border: "none", position: "relative", cursor: "pointer", padding: 0 }}>
      <div style={{ position: "absolute", top: 2, left: v ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: G.text, transition: "left 0.2s" }} />
    </button>
  );
  const initials = ((profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "")) || (profile?.full_name ?? "U").slice(0, 2);
  const currentLang = LANGUAGES.find(l => l.code === (profile?.language || i18n.language)) || LANGUAGES[0];

  const setLanguage = async (code: string) => {
    setLangOpen(false);
    i18n.changeLanguage(code);
    if (user) {
      await supabase.from("profiles").update({ language: code }).eq("user_id", user.id);
      refreshProfile();
      toast("Language saved");
    }
  };

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{ width: 78, height: 78, borderRadius: 39, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26 }}>{initials.toUpperCase()}</div>
        <div style={{ ...s.serif, fontSize: 22, fontWeight: 600, marginTop: 12 }}>{profile?.full_name || "Guest"}</div>
        <div style={{ fontSize: 12, color: G.muted, marginTop: 2 }}>{profile?.email}</div>
        {profile?.account_number && (
          <div style={{ fontSize: 11, color: G.gold, fontFamily: "monospace", marginTop: 4, background: G.gold + "11", padding: "3px 10px", borderRadius: 8 }}>Account ID #{profile.account_number}</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { l: "Deposited", v: fmtMoney(Number(profile?.invested ?? 0), cur) },
          { l: "Profit", v: fmtMoney(Number(profile?.earned ?? 0), cur) },
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

      <button style={{ ...s.btnGhost, marginBottom: 12 }} onClick={() => navTo("transactions-history")}>📋 Transaction history →</button>

      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, overflow: "hidden" }}>
        <Item label="Dark Mode" right={<Toggle v={themeMode === "dark"} on={() => setThemeMode(themeMode === "dark" ? "light" : "dark")} />} G={G} />
        <Item label="Linked Accounts" right={<span style={{ color: G.muted }}>›</span>} act={() => navTo("payment-methods")} G={G} />
        <Item label="My Products" right={<span style={{ color: G.muted }}>›</span>} act={() => navTo("my-products")} G={G} />
        <Item label="Currency" right={<span style={{ color: G.muted, fontSize: 13 }}>{cur} ›</span>} act={() => navTo("currency")} G={G} />
        <Item label="Language" right={<span style={{ color: G.muted, fontSize: 13 }}>{currentLang.native} ›</span>} act={() => setLangOpen(!langOpen)} G={G} />
        {langOpen && (
          <div style={{ background: G.bg, padding: "8px 0", maxHeight: 220, overflowY: "auto" }}>
            {LANGUAGES.map(l => (
              <div key={l.code} onClick={() => setLanguage(l.code)} style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", cursor: "pointer", fontSize: 13, color: l.code === currentLang.code ? G.gold : G.text }}>
                <span>{l.native}</span><span style={{ color: G.muted, fontSize: 12 }}>{l.name}</span>
              </div>
            ))}
          </div>
        )}
        <Item label="Help & Support" right={<span style={{ color: G.muted }}>›</span>} act={() => navTo("support")} G={G} />
        <Item label="Privacy Policy" right={<span style={{ color: G.muted }}>›</span>} act={() => navTo("privacy")} G={G} />
        {isAdmin && <Item label="Admin Panel" right={<span style={{ color: G.gold }}>›</span>} act={() => (window.location.href = "/admin")} G={G} />}
        <Item label="Log Out" danger right={<span style={{ color: G.red }}>›</span>} act={async () => { await signOut(); nav("landing"); }} G={G} />
      </div>
    </div>
  );
}

function Item({ label, right, act, danger, G }: { label: string; right: React.ReactNode; act?: () => void; danger?: boolean; G: any }) {
  return (
    <div onClick={act} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${G.border}`, cursor: act ? "pointer" : "default" }}>
      <span style={{ fontSize: 14, color: danger ? G.red : G.text, fontWeight: danger ? 600 : 400 }}>{label}</span>
      {right}
    </div>
  );
}