import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell, EmptyState } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";

// Resale marketplace: browse other users' listings + manage your own via "My Products"
export function Sell({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast, refreshProfile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [listings, setListings] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    supabase.from("user_products").select("*, products(name, cycle_days, daily_income, image_url)").eq("listed_for_sale", true).eq("status", "owned").order("listed_at", { ascending: false }).then(({ data }) => setListings(data ?? []));
  };
  useEffect(refresh, []);

  const buy = async (l: any) => {
    setBusy(l.id);
    const { error } = await supabase.rpc("buy_resale", { p_user_product_id: l.id });
    setBusy(null);
    if (error) { toast(error.message); return; }
    toast("Purchased! Cycle continues.");
    refresh(); refreshProfile();
  };

  return (
    <ScreenShell title="Resale Market" onBack={() => nav("dashboard")}>
      <button style={{ ...s.btnGhost, marginBottom: 14 }} onClick={() => nav("my-products")}>My products & listings →</button>
      <p style={{ color: G.muted, fontSize: 13, margin: "0 0 14px" }}>Buy active products from other investors at a discount. The cycle continues from where it was.</p>
      {listings.length === 0 ? (
        <EmptyState icon="↻" title="No listings yet" sub="When other investors list their products for resale they'll appear here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {listings.filter(l => l.user_id !== user?.id).map(l => {
            const cycleDays = l.products?.cycle_days ?? 0;
            const remaining = Math.max(0, cycleDays - l.days_paid);
            return (
              <div key={l.id} style={{ ...s.card, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...s.serif, fontSize: 16, fontWeight: 600 }}>{l.products?.name}</div>
                    <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>{remaining} of {cycleDays} days remaining · {fmtMoney(Number(l.products?.daily_income || 0), cur)}/day</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: G.muted }}>PRICE</div>
                    <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, color: G.gold }}>{fmtMoney(Number(l.listing_price), cur)}</div>
                  </div>
                </div>
                <button onClick={() => buy(l)} disabled={busy === l.id} style={{ ...s.btnGold, marginTop: 12, padding: 10, fontSize: 13 }}>{busy === l.id ? "Buying…" : "Buy listing"}</button>
              </div>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}