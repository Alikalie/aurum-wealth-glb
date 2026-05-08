import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

export function Reconciliation({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: deps }, { data: wds }, { data: ups }, { data: txs }] = await Promise.all([
        supabase.from("deposits").select("amount,status").eq("user_id", user.id),
        supabase.from("withdrawals").select("amount,status").eq("user_id", user.id),
        supabase.from("user_products").select("purchase_price").eq("user_id", user.id),
        supabase.from("transactions").select("amount,kind,bucket").eq("user_id", user.id),
      ]);
      const sumDeposits = (deps ?? []).filter(d => d.status === "approved").reduce((a, d) => a + Number(d.amount), 0);
      const sumWithdrawals = (wds ?? []).filter(w => w.status === "approved").reduce((a, w) => a + Number(w.amount), 0);
      const sumPurchases = (ups ?? []).reduce((a: number, p: any) => a + Number(p.purchase_price), 0);
      const sumEarnings = (txs ?? []).filter((t: any) =>
        ["daily_earning", "product_sale", "cycle_complete"].includes(t.kind) ||
        (t.kind === "admin_credit" && (t.bucket === "earned" || t.bucket == null))
      ).reduce((a: number, t: any) => a + Number(t.amount), 0);

      const expectedInvested = sumDeposits - sumPurchases;
      const expectedWithdrawn = sumWithdrawals;
      const expectedEarned = sumEarnings;
      const profileInvested = Number(profile?.invested ?? 0);
      const profileEarned = Number(profile?.earned ?? 0);
      const profileWithdrawn = Number(profile?.withdrawn ?? 0);
      setData({
        sumDeposits, sumWithdrawals, sumPurchases, sumEarnings,
        expectedInvested, expectedWithdrawn, expectedEarned,
        profileInvested, profileEarned, profileWithdrawn,
        deps: (deps ?? []).filter(d => d.status === "approved"),
        wds: (wds ?? []).filter(w => w.status === "approved"),
        ups: ups ?? [],
        earnings: (txs ?? []).filter((t: any) =>
          ["daily_earning", "product_sale", "cycle_complete"].includes(t.kind) ||
          (t.kind === "admin_credit" && (t.bucket === "earned" || t.bucket == null))
        ),
      });
    })();
  }, [user, profile]);

  if (!data) return <ScreenShell title="Wallet Reconciliation" onBack={() => nav("dashboard")}><div style={{ color: G.muted, fontSize: 13 }}>Loading…</div></ScreenShell>;

  const Row = ({ label, expected, actual }: { label: string; expected: number; actual: number }) => {
    const ok = Math.abs(expected - actual) < 0.01;
    return (
      <div style={{ ...s.card, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          {ok ? <CheckCircle2 size={18} color={G.green} /> : <AlertTriangle size={18} color={G.red} />}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: G.muted }}>
          <span>Profile shows</span><span style={{ color: G.text, fontWeight: 600 }}>{fmtMoney(actual, cur)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12, color: G.muted }}>
          <span>Expected</span><span style={{ color: ok ? G.green : G.red, fontWeight: 600 }}>{fmtMoney(expected, cur)}</span>
        </div>
      </div>
    );
  };

  const main = data.profileInvested + data.profileEarned - data.profileWithdrawn;

  const Drill = ({ k, label, total, items, render }: { k: string; label: string; total: number; items: any[]; render: (it: any) => React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${G.border}`, fontSize: 12, flexDirection: "column" }}>
      <button onClick={() => toggle(k)} style={{ background: "none", border: "none", padding: 0, color: G.text, fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", width: "100%" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {open[k] ? <ChevronDown size={14} color={G.muted} /> : <ChevronRight size={14} color={G.muted} />}
          <span style={{ color: G.muted }}>{label}</span>
        </span>
        <span style={{ fontWeight: 600 }}>{fmtMoney(total, cur)}</span>
      </button>
      {open[k] && (
        <div style={{ marginTop: 8, marginLeft: 18, borderLeft: `1px solid ${G.border}`, paddingLeft: 10 }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 11, color: G.muted, padding: "4px 0" }}>No entries</div>
          ) : items.map((it, i) => <div key={it.id || i} style={{ padding: "4px 0", borderBottom: i === items.length - 1 ? "none" : `1px solid ${G.border}` }}>{render(it)}</div>)}
        </div>
      )}
    </div>
  );

  return (
    <ScreenShell title="Wallet Reconciliation" onBack={() => nav("dashboard")}>
      <p style={{ color: G.muted, fontSize: 12, lineHeight: 1.55, margin: "0 0 14px" }}>
        Verifies that your profile totals match the sum of all approved deposits, withdrawals, purchases and earnings. Tap any total to expand.
      </p>

      <div style={{ ...s.card, padding: 16, marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>MAIN BALANCE</div>
        <div style={{ ...s.serif, fontSize: 26, fontWeight: 700, color: G.gold }}>{fmtMoney(Math.max(0, main), cur)}</div>
      </div>

      <div style={{ ...s.card, padding: 14, marginBottom: 14 }}>
        <div style={{ ...s.serif, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Lifetime totals</div>
        <Drill k="deps" label="Approved deposits" total={data.sumDeposits} items={data.deps} render={(d: any) => (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span style={{ color: G.muted }}>{new Date(d.created_at || Date.now()).toLocaleDateString()} · {d.method_type}</span><span style={{ color: G.green, fontWeight: 600 }}>+{fmtMoney(Number(d.amount), cur)}</span></div>
        )} />
        <Drill k="ups" label="Product purchases" total={data.sumPurchases} items={data.ups} render={(p: any) => (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span style={{ color: G.muted }}>{new Date(p.purchased_at || p.cycle_start_at).toLocaleDateString()}</span><span style={{ color: G.red, fontWeight: 600 }}>-{fmtMoney(Number(p.purchase_price), cur)}</span></div>
        )} />
        <Drill k="earn" label="Earnings (daily + sales + bonuses)" total={data.sumEarnings} items={data.earnings} render={(t: any) => (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, gap: 6 }}><span style={{ color: G.muted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{new Date(t.created_at).toLocaleDateString()} · {t.note || t.kind}</span><span style={{ color: G.green, fontWeight: 600 }}>+{fmtMoney(Number(t.amount), t.currency || cur)}</span></div>
        )} />
        <Drill k="wds" label="Approved withdrawals" total={data.sumWithdrawals} items={data.wds} render={(w: any) => (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span style={{ color: G.muted }}>{new Date(w.created_at || Date.now()).toLocaleDateString()}</span><span style={{ color: G.red, fontWeight: 600 }}>-{fmtMoney(Number(w.amount), cur)}</span></div>
        )} />
      </div>

      <Row label="Invested (deposits − purchases)" expected={data.expectedInvested} actual={data.profileInvested} />
      <Row label="Earned" expected={data.expectedEarned} actual={data.profileEarned} />
      <Row label="Withdrawn" expected={data.expectedWithdrawn} actual={data.profileWithdrawn} />

      <p style={{ fontSize: 11, color: G.muted, marginTop: 8, lineHeight: 1.5 }}>
        If any row shows a mismatch, contact admin and request a balance recompute.
      </p>
    </ScreenShell>
  );
}