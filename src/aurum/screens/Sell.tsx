import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell, EmptyState } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";

export function Sell({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast, refreshProfile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [items, setItems] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => {
    if (!user) return;
    supabase.from("user_products").select("*, products(name, expected_return_pct)").eq("user_id", user.id).eq("status", "owned").then(({ data }) => setItems(data ?? []));
  };
  useEffect(refresh, [user]);

  const sell = async (it: any) => {
    setBusyId(it.id);
    const expected = Number(it.products?.expected_return_pct ?? 0) / 100;
    const sale = Number(it.purchase_price) * (1 + expected);
    const { error } = await supabase.from("user_products").update({ status: "sold", sale_price: sale, sold_at: new Date().toISOString() }).eq("id", it.id);
    setBusyId(null);
    if (error) { toast(error.message); return; }
    toast(`Sold for ${fmtMoney(sale, cur)} — credited to Earned`);
    refresh();
    refreshProfile();
  };

  return (
    <ScreenShell title="Sell Products" onBack={() => nav("dashboard")}>
      <p style={{ color: G.muted, fontSize: 13, margin: "0 0 16px" }}>Liquidate one of your investments. The sale price is credited to your Earned balance.</p>
      {items.length === 0 ? (
        <EmptyState icon="📦" title="Nothing to sell" sub="You don't own any products yet. Buy one from the Markets tab first." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(it => {
            const expected = Number(it.products?.expected_return_pct ?? 0) / 100;
            const sale = Number(it.purchase_price) * (1 + expected);
            return (
              <div key={it.id} style={{ ...s.card, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ ...s.serif, fontSize: 16, fontWeight: 600 }}>{it.products?.name}</div>
                    <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>Bought {new Date(it.purchased_at).toLocaleDateString()} for {fmtMoney(Number(it.purchase_price), cur)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: G.muted }}>SELL FOR</div>
                    <div style={{ ...s.serif, fontSize: 16, fontWeight: 600, color: G.green }}>{fmtMoney(sale, cur)}</div>
                  </div>
                </div>
                <button onClick={() => sell(it)} disabled={busyId === it.id} style={{ ...s.btnGold, marginTop: 12, padding: 10, fontSize: 13 }}>{busyId === it.id ? "Selling…" : "Sell now"}</button>
              </div>
            );
          })}
        </div>
      )}
      <button style={{ ...s.btnGhost, marginTop: 18 }} onClick={() => nav("dashboard")}>Cancel</button>
    </ScreenShell>
  );
}