import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAurum } from "./AurumContext";
import { MessageCircle, Mail, Phone, Users, Megaphone, Send } from "lucide-react";

export type SupportContacts = {
  whatsapp?: string;
  email?: string;
  phone?: string;
  whatsapp_group?: string;
  whatsapp_channel?: string;
  telegram_channel?: string;
};

export function useSupportContacts() {
  const [c, setC] = useState<SupportContacts>({});
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "support_contacts").maybeSingle()
      .then(({ data }) => setC((data?.value as any) || {}));
  }, []);
  return c;
}

export function ContactButtons({ vertical = false }: { vertical?: boolean }) {
  const { G } = useAurum();
  const c = useSupportContacts();
  const items: { icon: any; label: string; href: string; color: string }[] = [];
  if (c.whatsapp) items.push({ icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${c.whatsapp.replace(/[^\d]/g, "")}`, color: "#25D366" });
  if (c.email) items.push({ icon: Mail, label: "Email", href: `mailto:${c.email}`, color: "#EA4335" });
  if (c.phone) items.push({ icon: Phone, label: "Call", href: `tel:${c.phone}`, color: "#1DA1F2" });
  if (c.whatsapp_group) items.push({ icon: Users, label: "WhatsApp Group", href: c.whatsapp_group, color: "#128C7E" });
  if (c.whatsapp_channel) items.push({ icon: Megaphone, label: "WhatsApp Channel", href: c.whatsapp_channel, color: "#25D366" });
  if (c.telegram_channel) items.push({ icon: Send, label: "Telegram Channel", href: c.telegram_channel, color: "#229ED9" });
  if (items.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: vertical ? "1fr" : "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      {items.map(it => {
        const Ic = it.icon;
        return (
          <a key={it.label} href={it.href} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: G.card, border: `1px solid ${G.border}`, color: G.text, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 32, height: 32, borderRadius: 16, background: it.color + "22", color: it.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic size={18} />
            </span>
            {it.label}
          </a>
        );
      })}
    </div>
  );
}