import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { fmtMoney, convertFromUsd } from "../data";
import { ScreenShell } from "../ui";
import { supabase } from "@/integrations/supabase/client";

type NavFn = (s: string, payload?: any) => void;

export function ProductDetails({ nav, productId }: { nav: NavFn; productId: string | null }) {
  const { s, G, profile, toast, user, refreshProfile } = useAurum();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cur = profile?.currency ?? "USD";

  useEffect(() => {
    if (!productId) { setLoading(false); return; }
    supabase.from("products").select("*").eq("id", productId).maybeSingle().then(({ data }) => {
      setProduct(data);
      setLoading(false);
    });
  }, [productId]);

  const buy = async () => {
    if (!user || !product) return;
    setBusy(true);
    const { error } = await supabase.rpc("purchase_product", { p_product_id: product.id });
    setBusy(false);
    setConfirmOpen(false);
    if (error) { toast(error.message); return; }
    toast("Cycle started — earnings begin");
    refreshProfile();
    nav("my-products");
  };

  if (loading) {
    return (
      <ScreenShell title="Product" onBack={() => nav("dashboard")}>
        <div style={{ color: G.muted, textAlign: "center", padding: 40 }}>Loading…</div>
      </ScreenShell>
    );
  }

  if (!product) {
    return (
      <ScreenShell title="Product" onBack={() => nav("dashboard")}>
        <div style={{ color: G.muted, textAlign: "center", padding: 40 }}>Product not found.</div>
      </ScreenShell>
    );
  }

  const intervalH = Number(product.payout_interval_hours) || 24;
  const intervalLabel = intervalH < 24 ? `${intervalH} hours` : intervalH === 24 ? "day" : intervalH === 168 ? "week" : `${intervalH / 24} days`;
  const cycleDays = Number(product.cycle_days);
  const totalPayouts = intervalH < 24 ? Math.round((cycleDays * 24) / intervalH) : Math.round((cycleDays * 24) / intervalH);
  const cycleDuration = intervalH >= 168 ? `${Math.round(cycleDays / 7)} weeks` : `${cycleDays} days`;

  const priceUsd = Number(product.price);
  const dailyUsd = Number(product.daily_income);
  const priceLocal = convertFromUsd(priceUsd, cur);
  const payoutLocal = convertFromUsd(dailyUsd, cur);
  const totalReturnLocal = payoutLocal * totalPayouts;
  const profitLocal = totalReturnLocal - priceLocal;
  const roi = priceUsd > 0 ? ((dailyUsd * totalPayouts - priceUsd) / priceUsd) * 100 : 0;

  return (
    <ScreenShell title={product.name} onBack={() => nav("dashboard")}>
      {product.image_url && (
        <img src={product.image_url} alt={product.name} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 14, marginBottom: 16 }} />
      )}

      <div style={{ ...s.card, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>PRICE</div>
        <div style={{ ...s.serif, fontSize: 30, fontWeight: 600, color: G.gold, margin: "6px 0 4px" }}>{fmtMoney(priceLocal, cur)}</div>
        <div style={{ fontSize: 11, color: G.muted }}>One-time purchase · cycle starts immediately</div>
      </div>

      {product.description && (
        <div style={{ ...s.card, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5, marginBottom: 6 }}>ABOUT</div>
          <div style={{ fontSize: 14, color: G.text, lineHeight: 1.55 }}>{product.description}</div>
        </div>
      )}

      <div style={{ ...s.card, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5, marginBottom: 12 }}>EARNING CYCLE</div>
        <Row label="Payout interval" value={`Every ${intervalLabel}`} G={G} />
        <Row label="Total payouts" value={`${totalPayouts} times`} G={G} />
        <Row label="Cycle duration" value={cycleDuration} G={G} />
        <Row label={`Per ${intervalH < 24 ? `${intervalH}h` : intervalH === 24 ? "day" : intervalH === 168 ? "week" : `${intervalH / 24}d`}`} value={fmtMoney(payoutLocal, cur)} G={G} highlight />
        <Row label="Total return" value={fmtMoney(totalReturnLocal, cur)} G={G} />
        <Row label="Net profit" value={fmtMoney(profitLocal, cur)} G={G} highlight />
        <Row label="ROI" value={`${roi.toFixed(1)}%`} G={G} highlight last />
      </div>

      <div style={{ ...s.card, padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5, marginBottom: 10 }}>HOW IT WORKS</div>
        <Step n={1} text={`Purchase the product for ${fmtMoney(priceLocal, cur)} from your main balance.`} G={G} />
        <Step n={2} text={`Earn ${fmtMoney(payoutLocal, cur)} automatically every ${intervalLabel}.`} G={G} />
        <Step n={3} text={`After ${totalPayouts} payouts (${cycleDuration}) the cycle completes.`} G={G} />
        <Step n={4} text="Earnings are added to your main balance — withdraw or reinvest anytime." G={G} last />
      </div>

      <div style={{ fontSize: 12, color: G.muted, marginBottom: 12, textAlign: "center" }}>
        {product.purchase_limit > 0 ? `Purchase limit: ${product.purchase_limit} per user` : "No purchase limit"}
      </div>

      <button style={s.btnGold} onClick={() => {
        if (!user) { toast("Please sign in to buy"); setTimeout(() => nav("login"), 600); return; }
        setConfirmOpen(true);
      }} disabled={busy}>
        {busy ? "Processing…" : `Buy for ${fmtMoney(priceLocal, cur)}`}
      </button>

      {confirmOpen && (
        <div onClick={() => !busy && setConfirmOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%" }}>
            <div style={{ ...s.serif, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Confirm purchase</div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 16 }}>Review the details before starting your earning cycle.</div>
            <div style={{ background: G.bg, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <Row label="Product" value={product.name} G={G} />
              <Row label="Price" value={fmtMoney(priceLocal, cur)} G={G} highlight />
              <Row label="Payout interval" value={`Every ${intervalLabel}`} G={G} />
              <Row label="Total payouts" value={`${totalPayouts}`} G={G} />
              <Row label="Cycle duration" value={cycleDuration} G={G} />
              <Row label="Total return" value={fmtMoney(totalReturnLocal, cur)} G={G} highlight />
              <Row label="Net profit" value={fmtMoney(profitLocal, cur)} G={G} highlight last />
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 14, textAlign: "center" }}>
              Funds will be deducted from your main balance immediately.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btnGhost} onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</button>
              <button style={s.btnGold} onClick={buy} disabled={busy}>{busy ? "Processing…" : "Confirm & buy"}</button>
            </div>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}

function Row({ label, value, G, highlight, last }: { label: string; value: string; G: any; highlight?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: last ? "none" : `1px solid ${G.border}` }}>
      <span style={{ fontSize: 13, color: G.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: highlight ? G.gold : G.text }}>{value}</span>
    </div>
  );
}

function Step({ n, text, G, last }: { n: number; text: string; G: any; last?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: last ? "none" : `1px solid ${G.border}` }}>
      <div style={{ width: 24, height: 24, borderRadius: 12, background: G.gold + "22", color: G.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{n}</div>
      <div style={{ fontSize: 13, color: G.text, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}