import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { supabase } from "@/integrations/supabase/client";

function makeCode(uid: string) {
  return uid.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function Affiliate({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, profile, toast } = useAurum();
  const [aff, setAff] = useState<any>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [pct, setPct] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Auth gate
  if (!user) {
    return (
      <ScreenShell title="Affiliate Program" onBack={() => nav("dashboard")}>
        <p style={{ color: G.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>
          Sign in or create an account to get your unique referral link and start earning commissions
          on every deposit your referrals make.
        </p>
        <button style={{ ...s.btnGold, marginBottom: 10 }} onClick={() => nav("register")}>Create account</button>
        <button style={s.btnGhost} onClick={() => nav("login")}>Sign in</button>
      </ScreenShell>
    );
  }

  useEffect(() => {
    (async () => {
      const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "affiliate_commission_pct").maybeSingle();
      setPct(Number(setting?.value ?? 0));
      let { data: a } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      if (!a) {
        const code = makeCode(user.id);
        const { data: created, error } = await supabase.from("affiliates").insert({ user_id: user.id, code }).select().single();
        if (!error) a = created;
      }
      setAff(a);
      const { data: rs } = await supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false });
      setRefs(rs ?? []);
      setLoading(false);
    })();
  }, [user]);

  const link = aff ? `${window.location.origin}/?ref=${aff.code}` : "";

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast("Referral link copied"); }
    catch { toast("Copy failed"); }
  };

  return (
    <ScreenShell title="Affiliate Program" onBack={() => nav("dashboard")}>
      <p style={{ color: G.muted, fontSize: 13, lineHeight: 1.55, margin: "0 0 18px" }}>
        Share your link. Earn <span style={{ color: G.gold, fontWeight: 700 }}>{pct}%</span> commission
        on every approved deposit from people you refer — paid straight into your wallet.
      </p>

      {loading ? (
        <div style={{ color: G.muted, fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
              <div style={{ ...s.serif, fontSize: 18, fontWeight: 700, color: G.gold }}>{aff?.total_referrals ?? refs.length}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Referrals</div>
            </div>
            <div style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
              <div style={{ ...s.serif, fontSize: 18, fontWeight: 700, color: G.green }}>${Number(aff?.total_commission ?? 0).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>Commission earned</div>
            </div>
          </div>

          <label style={s.label}>YOUR REFERRAL CODE</label>
          <div style={{ ...s.input, fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: G.gold, textAlign: "center", letterSpacing: 2 }}>{aff?.code}</div>

          <label style={{ ...s.label, marginTop: 14 }}>SHARE LINK</label>
          <div style={{ ...s.input, fontSize: 12, color: G.muted, wordBreak: "break-all" }}>{link}</div>
          <button style={{ ...s.btnGold, marginTop: 12 }} onClick={copy}>Copy link</button>

          <h3 style={{ ...s.serif, fontSize: 16, fontWeight: 600, margin: "26px 0 10px" }}>Your referrals</h3>
          {refs.length === 0 ? (
            <div style={{ ...s.card, padding: 16, textAlign: "center", color: G.muted, fontSize: 13 }}>No referrals yet. Share your link to get started.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {refs.map(r => (
                <div key={r.id} style={{ ...s.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>{r.referred_user_id.slice(0, 8)}…</div>
                    <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ ...s.serif, fontSize: 14, fontWeight: 600, color: G.green }}>+${Number(r.total_commission).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ScreenShell>
  );
}