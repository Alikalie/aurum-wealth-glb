import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell, EmptyState } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";

type Deposit = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  method_type: string;
  admin_note: string | null;
  proof_url: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export function DepositsHistory({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [rows, setRows] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("deposits")
      .select("id, amount, status, method_type, admin_note, proof_url, created_at, reviewed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data as Deposit[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);

  const statusStyle = (st: Deposit["status"]) => {
    if (st === "approved") return { color: G.green, bg: G.green + "22", label: "Approved" };
    if (st === "rejected") return { color: G.red, bg: G.red + "22", label: "Declined" };
    return { color: G.gold, bg: G.gold + "22", label: "Pending" };
  };

  const tabs: Array<{ k: typeof filter; l: string }> = [
    { k: "all", l: "All" }, { k: "pending", l: "Pending" }, { k: "approved", l: "Approved" }, { k: "rejected", l: "Declined" },
  ];

  return (
    <ScreenShell title="My Deposits" onBack={() => nav("dashboard")}>
      <button style={{ ...s.btnGold, marginBottom: 14 }} onClick={() => nav("deposit")}>+ New deposit</button>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)} style={{ flex: "0 0 auto", background: filter === t.k ? G.gold : "transparent", color: filter === t.k ? "#1a1208" : G.text, border: `1px solid ${filter === t.k ? G.gold : G.border}`, borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: G.muted, textAlign: "center", padding: 30 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="↓" title="No deposits yet" sub="Submit a deposit and it will appear here once reviewed." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(d => {
            const st = statusStyle(d.status);
            return (
              <div key={d.id} style={{ ...s.card, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, color: G.gold }}>{fmtMoney(Number(d.amount), cur)}</div>
                    <div style={{ fontSize: 11, color: G.muted, marginTop: 4, textTransform: "capitalize" }}>{d.method_type.replace("_", " ")} · {new Date(d.created_at).toLocaleString()}</div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{st.label}</span>
                </div>

                {d.admin_note && (
                  <div style={{ marginTop: 10, padding: 10, background: G.bg, borderRadius: 8, fontSize: 12, color: G.text, borderLeft: `3px solid ${st.color}` }}>
                    <div style={{ fontSize: 10, color: G.muted, marginBottom: 4, letterSpacing: 0.5 }}>ADMIN NOTE</div>
                    {d.admin_note}
                  </div>
                )}

                {d.proof_url && (
                  <a href={d.proof_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: G.gold, textDecoration: "none" }}>
                    View payment proof →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}