import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { supabase } from "@/integrations/supabase/client";

export function Support({ nav }: { nav: (s: string) => void }) {
  const { G } = useAurum();
  const [body, setBody] = useState("Loading…");
  useEffect(() => { supabase.from("support_content").select("body").eq("id", 1).maybeSingle().then(({ data }) => setBody(data?.body ?? "")); }, []);
  return (
    <ScreenShell title="Help & Support" onBack={() => nav("dashboard")}>
      <div style={{ color: G.text, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{body}</div>
    </ScreenShell>
  );
}

export function Privacy({ nav }: { nav: (s: string) => void }) {
  const { G } = useAurum();
  const [body, setBody] = useState("Loading…");
  useEffect(() => { supabase.from("privacy_content").select("body").eq("id", 1).maybeSingle().then(({ data }) => setBody(data?.body ?? "")); }, []);
  return (
    <ScreenShell title="Privacy Policy" onBack={() => nav("dashboard")}>
      <div style={{ color: G.text, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{body}</div>
    </ScreenShell>
  );
}

export function Currency({ nav }: { nav: (s: string) => void }) {
  const { G, s, profile } = useAurum();
  const lockedUntil = profile ? new Date(profile.currency_locked_until) : null;
  const stillLocked = lockedUntil && lockedUntil > new Date();
  return (
    <ScreenShell title="Currency" onBack={() => nav("dashboard")}>
      <div style={{ ...s.card }}>
        <div style={{ fontSize: 11, color: G.muted }}>YOUR CURRENCY</div>
        <div style={{ ...s.serif, fontSize: 32, fontWeight: 600, color: G.gold, marginTop: 6 }}>{profile?.currency}</div>
        {stillLocked ? (
          <p style={{ color: G.muted, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>
            Your currency is locked until <strong style={{ color: G.text }}>{lockedUntil!.toLocaleDateString()}</strong> (60 days after registration). After that date, contact support to change it.
          </p>
        ) : (
          <p style={{ color: G.muted, fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>You may now request a currency change. Please contact support.</p>
        )}
      </div>
    </ScreenShell>
  );
}