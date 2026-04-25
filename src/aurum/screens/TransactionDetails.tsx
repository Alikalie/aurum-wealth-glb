import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { fmtMoney } from "../data";
import { supabase } from "@/integrations/supabase/client";
import { ProofViewer } from "../ProofViewer";

type Props = { nav: (s: string) => void; txId?: string | null };

export function TransactionDetails({ nav, txId }: Props) {
  const { s, G, profile, toast } = useAurum();
  const cur = profile?.currency ?? "USD";
  const [tx, setTx] = useState<any>(null);
  const [related, setRelated] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewProof, setViewProof] = useState(false);

  useEffect(() => {
    if (!txId) { setLoading(false); return; }
    (async () => {
      const { data: t } = await supabase.from("transactions").select("*").eq("id", txId).maybeSingle();
      setTx(t);
      if (t?.reference_id) {
        if (t.kind === "deposit") {
          const { data } = await supabase.from("deposits").select("*").eq("id", t.reference_id).maybeSingle();
          setRelated(data);
        } else if (t.kind === "withdrawal") {
          const { data } = await supabase.from("withdrawals").select("*, payment_methods(provider_name, account_number, paypal_email, account_holder_name)").eq("id", t.reference_id).maybeSingle();
          setRelated(data);
        }
      }
      setLoading(false);
    })();
  }, [txId]);

  if (loading) return <ScreenShell title="Transaction" onBack={() => nav("transactions")}><div style={{ color: G.muted }}>Loading…</div></ScreenShell>;
  if (!tx) return <ScreenShell title="Transaction" onBack={() => nav("transactions")}><div style={{ color: G.muted }}>Not found.</div></ScreenShell>;

  const kindLabel: Record<string, string> = {
    deposit: "Deposit", withdrawal: "Withdrawal", daily_earning: "Daily earning",
    admin_credit: "Admin credit", product_purchase: "Product purchase",
    product_sale: "Product sale", cycle_complete: "Cycle complete",
  };
  const proofUrl = related?.proof_url;
  const proofName = proofUrl ? (() => { try { return decodeURIComponent(proofUrl.split("/").pop() || "proof"); } catch { return "proof"; } })() : null;
  const positive = Number(tx.amount) >= 0;

  return (
    <ScreenShell title={kindLabel[tx.kind] || "Transaction"} onBack={() => nav("transactions")}>
      <div style={{ ...s.card, marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>AMOUNT</div>
        <div style={{ ...s.serif, fontSize: 32, fontWeight: 600, color: positive ? G.green : G.red, marginTop: 6 }}>
          {positive ? "+" : ""}{fmtMoney(Number(tx.amount), tx.currency || cur)}
        </div>
        {related?.status && (
          <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
            background: related.status === "approved" ? G.green + "33" : related.status === "rejected" ? G.red + "33" : G.amber + "33",
            color: related.status === "approved" ? G.green : related.status === "rejected" ? G.red : G.amber }}>
            {related.status.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ ...s.card }}>
        <Row label="Date" value={new Date(tx.created_at).toLocaleString()} G={G} />
        <Row label="Type" value={kindLabel[tx.kind]} G={G} />
        {tx.bucket && <Row label="Account" value={tx.bucket} G={G} />}
        {tx.note && <Row label="Note" value={tx.note} G={G} />}
        {related?.method_type && <Row label="Method" value={related.method_type.replace("_", " ")} G={G} />}
        {related?.payment_methods && (
          <Row label="Sent to" value={`${related.payment_methods.provider_name || "PayPal"} · ${related.payment_methods.account_number || related.payment_methods.paypal_email || ""}`} G={G} />
        )}
        {related?.reviewed_at && <Row label="Reviewed" value={new Date(related.reviewed_at).toLocaleString()} G={G} />}
        {related?.admin_note && <Row label="Admin note" value={related.admin_note} G={G} />}
      </div>

      {proofUrl && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: G.muted, marginBottom: 8, letterSpacing: 0.5 }}>PAYMENT PROOF</div>
          <button onClick={() => setViewProof(true)} style={{ ...s.card, padding: 8, width: "100%", border: `1px solid ${G.border}`, cursor: "pointer", textAlign: "left" as const }}>
            <img src={proofUrl} alt="Payment proof" style={{ width: "100%", borderRadius: 12, display: "block" }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            <div style={{ fontSize: 11, color: G.muted, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>📎 {proofName}</span>
              <span style={{ color: G.gold, fontWeight: 600 }}>Tap to zoom →</span>
            </div>
          </button>
        </div>
      )}
      {proofUrl && viewProof && <ProofViewer url={proofUrl} filename={proofName ?? undefined} onClose={() => setViewProof(false)} G={G} />}
    </ScreenShell>
  );
}

function Row({ label, value, G }: { label: string; value: string; G: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${G.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: G.muted }}>{label}</span>
      <span style={{ fontSize: 13, color: G.text, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}