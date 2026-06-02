import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAurum } from "./AurumContext";
import { fmtMoney, fxRatesSync, convertFromUsd } from "./data";

type Row = {
  id: string; name: string; cycle_days: number; days_paid: number;
  total_earned: number; daily_local: number; target_local: number;
  cur: string;
};

/** User-side: per-product cycle progress in the user's own currency */
export function UserPayoutProgress() {
  const { s, G, user, profile } = useAurum();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      const { data: ups } = await supabase.from("user_products")
        .select("id, days_paid, total_earned, product:products(id, name, cycle_days, daily_income)")
        .eq("user_id", user.id).eq("status", "owned");
      const rate = fxRatesSync()[profile.currency] || 1;
      const out: Row[] = (ups ?? []).map((u: any) => {
        const dailyLocal = Number(u.product.daily_income) * rate;
        return {
          id: u.id, name: u.product.name,
          cycle_days: u.product.cycle_days,
          days_paid: u.days_paid,
          total_earned: Number(u.total_earned),
          daily_local: dailyLocal,
          target_local: dailyLocal * u.product.cycle_days,
          cur: profile.currency,
        };
      });
      setRows(out);
    })();
  }, [user, profile]);
  if (rows.length === 0) return null;
  return (
    <div style={{ ...s.card, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5, marginBottom: 4 }}>DAILY PAYOUT PROGRESS</div>
      {rows.map(r => {
        const pct = Math.min(100, Math.round((r.days_paid / r.cycle_days) * 100));
        const remaining = Math.max(0, r.cycle_days - r.days_paid);
        const reached = r.days_paid >= r.cycle_days;
        return (
          <div key={r.id} style={{ borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: reached ? G.green : G.gold, fontWeight: 700 }}>
                {reached ? "✓ TARGET REACHED" : `${remaining} day${remaining === 1 ? "" : "s"} left`}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted, marginTop: 4 }}>
              <span>Earned: <strong style={{ color: G.green }}>{fmtMoney(r.total_earned, r.cur)}</strong> / {fmtMoney(r.target_local, r.cur)}</span>
              <span>+{fmtMoney(r.daily_local, r.cur)}/day</span>
            </div>
            <div style={{ height: 6, background: G.border, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: reached ? G.green : G.gold, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>Day {r.days_paid} of {r.cycle_days} · {pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

type CountryAgg = {
  country: string;
  cur: string;
  active_cycles: number;
  earned_total: number;
  target_total: number;
  reached: number;
};

/** Admin-side: country-level aggregated daily payout progress */
export function AdminCountryPayoutWidget() {
  const { s, G } = useAurum();
  const [rows, setRows] = useState<CountryAgg[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const [{ data: ups }, { data: profs }, { data: prods }] = await Promise.all([
        supabase.from("user_products").select("user_id,product_id,days_paid,total_earned,status").eq("status", "owned").limit(5000),
        supabase.from("profiles").select("user_id,country_name,country_code,currency").limit(5000),
        supabase.from("products").select("id,daily_income,cycle_days"),
      ]);
      const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const prodmap = new Map((prods ?? []).map((p: any) => [p.id, p]));
      const fx = fxRatesSync();
      const agg = new Map<string, CountryAgg>();
      (ups ?? []).forEach((u: any) => {
        const prof: any = pmap.get(u.user_id); if (!prof) return;
        const prod: any = prodmap.get(u.product_id); if (!prod) return;
        const country = prof.country_name || "—";
        const cur = prof.currency || "USD";
        const rate = fx[cur] || 1;
        const target = Number(prod.daily_income) * Number(prod.cycle_days) * rate;
        const key = `${country}|${cur}`;
        const cur_row = agg.get(key) || { country, cur, active_cycles: 0, earned_total: 0, target_total: 0, reached: 0 };
        cur_row.active_cycles += 1;
        cur_row.earned_total += Number(u.total_earned || 0);
        cur_row.target_total += target;
        if (u.days_paid >= prod.cycle_days) cur_row.reached += 1;
        agg.set(key, cur_row);
      });
      setRows(Array.from(agg.values()).sort((a, b) => b.target_total - a.target_total));
      setLoading(false);
    })();
  }, []);
  return (
    <div style={{ ...s.card, padding: 18 }}>
      <div style={{ ...s.serif, fontSize: 16, marginBottom: 4 }}>Country payout progress (active cycles)</div>
      <p style={{ fontSize: 11, color: G.muted, marginBottom: 12 }}>Aggregated by user country & local currency. Earned vs target across all active product cycles.</p>
      {loading ? <div style={{ color: G.muted, fontSize: 12 }}>Loading…</div> : rows.length === 0 ? (
        <div style={{ color: G.muted, fontSize: 12 }}>No active cycles.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(r => {
            const pct = r.target_total > 0 ? Math.min(100, Math.round((r.earned_total / r.target_total) * 100)) : 0;
            return (
              <div key={`${r.country}-${r.cur}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                  <span>{r.country} <span style={{ color: G.muted, fontWeight: 400, fontSize: 11 }}>· {r.cur}</span></span>
                  <span style={{ color: G.gold }}>{pct}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.muted, marginTop: 2 }}>
                  <span>{fmtMoney(r.earned_total, r.cur)} / {fmtMoney(r.target_total, r.cur)}</span>
                  <span>{r.active_cycles} cycle{r.active_cycles === 1 ? "" : "s"} · {r.reached} reached</span>
                </div>
                <div style={{ height: 6, background: G.border, borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: G.gold }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
