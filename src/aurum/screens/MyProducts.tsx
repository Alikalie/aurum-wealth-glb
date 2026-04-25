import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell, EmptyState } from "../ui";
import { fmtMoney, convertFromUsd } from "../data";
import { supabase } from "@/integrations/supabase/client";

export function MyProducts({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast, refreshProfile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [items, setItems] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");

  const refresh = () => {
    if (!user) return;
    supabase.from("user_products").select("*, products(name, cycle_days, daily_income, resale_enabled, payout_interval_hours)").eq("user_id", user.id).in("status", ["owned", "expired"]).order("purchased_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  };
  useEffect(refresh, [user]);

  const list = async (it: any) => {
    const p = Number(price);
    if (!p || p <= 0) { toast("Enter a price"); return; }
    setBusyId(it.id);
    const { error } = await supabase.rpc("list_product_for_sale", { p_user_product_id: it.id, p_price: p });
    setBusyId(null);
    if (error) { toast(error.message); return; }
    toast("Listed for resale");
    setListingId(null); setPrice(""); refresh();
  };

  const unlist = async (it: any) => {
    setBusyId(it.id);
    const { error } = await supabase.rpc("unlist_product", { p_user_product_id: it.id });
    setBusyId(null);
    if (error) { toast(error.message); return; }
    toast("Unlisted");
    refresh();
  };

  // Amounts in user_products / products are stored in USD; convert for display.
  const fmt = (usd: number) => fmtMoney(convertFromUsd(Number(usd), cur), cur);

  return (
    <ScreenShell title="My Products" onBack={() => nav("dashboard")}>
      <p style={{ color: G.muted, fontSize: 13, margin: "0 0 16px" }}>Your active investments. Earnings credit daily and you can list for resale.</p>
      {items.length === 0 ? (
        <EmptyState icon="📦" title="No products yet" sub="Buy from the Markets tab to start earning daily." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(it => {
            const cycleDays = it.products?.cycle_days ?? 0;
            const remaining = Math.max(0, cycleDays - it.days_paid);
            const pct = cycleDays > 0 ? Math.min(100, (it.days_paid / cycleDays) * 100) : 0;
            const intervalH = Math.max(1, Number(it.products?.payout_interval_hours) || 24);
            const intervalMs = intervalH * 3600 * 1000;
            const nextPayout = it.last_payout_at
              ? new Date(new Date(it.last_payout_at).getTime() + intervalMs)
              : new Date(new Date(it.cycle_start_at).getTime() + intervalMs);
            const intervalLabel = intervalH < 24 ? `${intervalH}h` : intervalH === 24 ? "day" : intervalH === 168 ? "week" : `${intervalH / 24}d`;
            return (
              <div key={it.id} style={{ ...s.card, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...s.serif, fontSize: 16, fontWeight: 600 }}>{it.products?.name}</div>
                    <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>Bought {fmt(Number(it.purchase_price))} · {it.status.toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: G.muted }}>EARNED</div>
                    <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, color: G.green }}>{fmt(Number(it.total_earned))}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted, marginBottom: 4 }}>
                    <span>Payout {it.days_paid}/{cycleDays}</span>
                    <span>{remaining} {intervalLabel === "day" ? "days" : intervalLabel === "week" ? "weeks" : intervalLabel} left</span>
                  </div>
                  <div style={{ height: 6, background: G.bg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: G.gold }} />
                  </div>
                  {it.status === "owned" && (
                    <Countdown until={nextPayout} G={G} intervalLabel={intervalLabel} />
                  )}
                </div>

                {it.status === "owned" && it.products?.resale_enabled && (
                  it.listed_for_sale ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: G.gold }}>Listed at {fmt(Number(it.listing_price))}</div>
                      <button onClick={() => unlist(it)} disabled={busyId === it.id} style={{ ...s.btnGhost, marginTop: 8, padding: 10, fontSize: 13 }}>Unlist</button>
                    </div>
                  ) : listingId === it.id ? (
                    <div style={{ marginTop: 12 }}>
                      <input style={s.input} type="number" placeholder={`Price in ${cur}`} value={price} onChange={e => setPrice(e.target.value)} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button style={s.btnGhost} onClick={() => { setListingId(null); setPrice(""); }}>Cancel</button>
                        <button style={s.btnGold} onClick={() => list(it)} disabled={busyId === it.id}>{busyId === it.id ? "Listing…" : "List"}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setListingId(it.id); setPrice(String(it.purchase_price)); }} style={{ ...s.btnGhost, marginTop: 12, padding: 10, fontSize: 13 }}>List for resale</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}

function Countdown({ until, G, intervalLabel }: { until: Date; G: any; intervalLabel?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, until.getTime() - now);
  const d = Math.floor(ms / (24 * 3600000));
  const h = Math.floor(ms / 3600000);
  const hh = h % 24;
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ready = ms <= 0;
  const text = ready
    ? "Payout ready — processing soon"
    : d > 0
      ? `Next payout in ${d}d ${hh}h ${m}m`
      : `Next payout in ${h}h ${m}m ${s}s`;
  return (
    <div style={{ fontSize: 11, color: ready ? G.green : G.muted, marginTop: 6 }}>
      {text}{intervalLabel ? ` · every ${intervalLabel}` : ""}
    </div>
  );
}