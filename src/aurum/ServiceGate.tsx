import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAurum } from "./AurumContext";
import { ContactButtons } from "./SupportContacts";

export function ServiceGate({ children }: { children: ReactNode }) {
  const { profile, isAdmin, G, s } = useAurum();
  const [status, setStatus] = useState<{ enabled: boolean; blocked_countries: string[] } | null>(null);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "service_status").maybeSingle()
      .then(({ data }) => setStatus((data?.value as any) || { enabled: true, blocked_countries: [] }));
  }, []);
  if (!status) return <>{children}</>;
  if (isAdmin) return <>{children}</>;
  const cc = profile?.country_code || "";
  const blocked = !status.enabled || (status.blocked_countries || []).includes(cc);
  if (!blocked) return <>{children}</>;
  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...s.card, maxWidth: 420, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🚫</div>
        <div style={{ ...s.serif, fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Service Unavailable</div>
        <p style={{ color: G.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
          Service not available in your country use VPN or contact support with support contact buttons.
        </p>
        <ContactButtons vertical />
      </div>
    </div>
  );
}