import { useEffect, useMemo, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell, EmptyState } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";

type Tx = {
  id: string;
  kind: string;
  amount: number;
  currency: string;
  bucket: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
};

const KIND_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  daily_earning: "Profit earning",
  admin_credit: "Admin credit",
  product_purchase: "Product purchase",
  product_sale: "Product sale",
  cycle_complete: "Cycle complete",
};

const KIND_ICONS: Record<string, string> = {
  deposit: "↓",
  withdrawal: "↑",
  daily_earning: "★",
  admin_credit: "◆",
  product_purchase: "🛒",
  product_sale: "💰",
  cycle_complete: "✓",
};

type FilterKey = "all" | "deposit" | "withdrawal" | "product_purchase" | "daily_earning";

export function TransactionsHistory({ nav }: { nav: (s: string, payload?: any) => void }) {
  const { s, G, user, profile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => { setRows((data as Tx[]) ?? []); setLoading(false); });
  }, [user]);

  // Compute running balance going backwards in time (oldest -> newest), then map by id
  const runningById = useMemo(() => {
    // Sort strictly by created_at ascending; tiebreak on id for stable order
    const sorted = [...rows].sort((a, b) => {
      const da = +new Date(a.created_at);
      const db = +new Date(b.created_at);
      if (da !== db) return da - db;
      return a.id.localeCompare(b.id);
    });
    let bal = 0;
    const map: Record<string, number> = {};
    for (const t of sorted) {
      const raw = Number(t.amount) || 0;
      // Force correct sign per kind, regardless of stored value sign
      const abs = Math.abs(raw);
      let signed = 0;
      switch (t.kind) {
        case "deposit":
        case "daily_earning":
        case "product_sale":
        case "cycle_complete":
          signed = abs; // credit
          break;
        case "withdrawal":
        case "product_purchase":
          signed = -abs; // debit
          break;
        case "admin_credit":
          // Admin credit can be positive or negative — trust stored sign
          signed = raw;
          break;
        default:
          signed = raw;
      }
      // Rejected deposit/withdrawal entries are stored as 0 — keep them as 0
      if (raw === 0) signed = 0;
      bal += signed;
      map[t.id] = bal;
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "all") list = list.filter(r => r.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        (r.note ?? "").toLowerCase().includes(q) ||
        (KIND_LABELS[r.kind] ?? r.kind).toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filter, query]);

  // Summary totals
  const totals = useMemo(() => {
    let dep = 0, wd = 0, prof = 0, spent = 0;
    for (const t of rows) {
      const a = Number(t.amount) || 0;
      if (t.kind === "deposit" && a > 0) dep += a;
      else if (t.kind === "withdrawal" && a < 0) wd += -a;
      else if (t.kind === "daily_earning") prof += a;
      else if (t.kind === "product_purchase" && a < 0) spent += -a;
    }
    return { dep, wd, prof, spent };
  }, [rows]);

  const tabs: Array<{ k: FilterKey; l: string }> = [
    { k: "all", l: "All" },
    { k: "deposit", l: "Deposits" },
    { k: "withdrawal", l: "Withdrawals" },
    { k: "product_purchase", l: "Purchases" },
    { k: "daily_earning", l: "Earnings" },
  ];

  return (
    <ScreenShell title="Transaction History" onBack={() => nav("dashboard")}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Stat label="Total deposited" value={fmtMoney(totals.dep, cur)} G={G} s={s} color={G.green} />
        <Stat label="Total withdrawn" value={fmtMoney(totals.wd, cur)} G={G} s={s} color={G.red} />
        <Stat label="Profit earned" value={fmtMoney(totals.prof, cur)} G={G} s={s} color={G.green} />
        <Stat label="Spent on products" value={fmtMoney(totals.spent, cur)} G={G} s={s} color={G.gold} />
      </div>

      {/* Search */}
      <input
        style={{ ...s.input, marginBottom: 10 }}
        placeholder="Search by note or type…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {tabs.map(t => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            style={{
              flex: "0 0 auto",
              background: filter === t.k ? G.gold : "transparent",
              color: filter === t.k ? "#1a1208" : G.text,
              border: `1px solid ${filter === t.k ? G.gold : G.border}`,
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >{t.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: G.muted, textAlign: "center", padding: 30 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="↔" title="No transactions" sub="Your deposits, withdrawals, purchases and earnings will appear here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(t => {
            const amt = Number(t.amount) || 0;
            const positive = amt >= 0;
            const bal = runningById[t.id] ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => nav("tx-details", t.id)}
                style={{ ...s.card, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: G.text, border: `1px solid ${G.border}` }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 19,
                  background: positive ? G.green + "22" : G.red + "22",
                  color: positive ? G.green : G.red,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, flexShrink: 0,
                }}>{KIND_ICONS[t.kind] || "•"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{KIND_LABELS[t.kind] || t.kind}</div>
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {new Date(t.created_at).toLocaleString()} {t.note ? `· ${t.note}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ ...s.serif, fontSize: 15, fontWeight: 700, color: positive ? G.green : G.red }}>
                    {positive ? "+" : ""}{fmtMoney(amt, t.currency || cur)}
                  </div>
                  <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>
                    Bal: {fmtMoney(bal, t.currency || cur)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}

function Stat({ label, value, G, s, color }: { label: string; value: string; G: any; s: any; color: string }) {
  return (
    <div style={{ ...s.card, padding: 12 }}>
      <div style={{ fontSize: 10, color: G.muted, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ ...s.serif, fontSize: 15, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}