import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell, EmptyState } from "../ui";
import { supabase } from "@/integrations/supabase/client";

type NavFn = (s: string, payload?: any) => void;

export function Notifications({ nav }: { nav: NavFn }) {
  const { s, G, user } = useAurum();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    load();
  };
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems(items.map(i => i.id === id ? { ...i, read_at: new Date().toISOString() } : i));
  };
  const goTo = (n: any) => {
    markOne(n.id);
    if (n.reference_table === "deposits") nav("deposits-history");
    else if (n.reference_table === "withdrawals") nav("transactions-history");
    else if (n.reference_table === "affiliate_applications" || n.reference_table === "affiliate_withdrawals") nav("affiliate");
    else if (n.reference_table === "user_products" && n.reference_id) nav("product-details", n.reference_id);
  };

  const unread = items.filter(i => !i.read_at).length;

  return (
    <ScreenShell title="Notifications" onBack={() => nav("dashboard")}>
      {unread > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: G.muted }}>{unread} unread</div>
          <button onClick={markAllRead} style={{ background: "none", border: "none", color: G.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Mark all as read</button>
        </div>
      )}
      {loading ? (
        <div style={{ color: G.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" sub="You're all caught up. Updates will appear here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(n => (
            <button key={n.id} onClick={() => goTo(n)} style={{ ...s.card, textAlign: "left", cursor: "pointer", padding: 14, border: `1px solid ${n.read_at ? G.border : G.gold + "55"}`, background: n.read_at ? G.card : G.gold + "0E", fontFamily: "inherit", color: G.text, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: n.kind === "approved" ? G.green : n.kind === "rejected" ? G.red : G.text }}>{n.title}</div>
                {!n.read_at && <span style={{ width: 8, height: 8, borderRadius: 4, background: G.gold, flexShrink: 0, marginTop: 5 }} />}
              </div>
              {n.body && <div style={{ fontSize: 12, color: G.muted, whiteSpace: "pre-wrap", marginTop: 6, lineHeight: 1.5 }}>{n.body}</div>}
              <div style={{ fontSize: 10, color: G.inactive, marginTop: 8 }}>{new Date(n.created_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}
    </ScreenShell>
  );
}
