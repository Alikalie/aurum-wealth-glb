import { useEffect, useRef, useState } from "react";
import { useAurum } from "./AurumContext";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Floating AI Consultant button — visible on every authenticated screen.
 * Opens an in-page chat modal that talks to the `ai-consultant` edge function.
 * Admins get unlimited free usage (server-enforced).
 */
export function AIFloatingButton() {
  const { G, user, isAdmin, toast } = useAurum();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, open]);

  if (!user) return null;

  const ask = async () => {
    const q = input.trim();
    if (!q || loading) return;
    if (!isAdmin && remaining !== null && remaining <= 0) {
      toast("Daily limit reached (3/day)");
      return;
    }
    setInput("");
    setMsgs(m => [...m, { role: "user", content: q }]);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-consultant", { body: { question: q } });
    setLoading(false);
    if (error || (data && data.error)) {
      const msg = (data && data.error) || error?.message || "Something went wrong";
      setMsgs(m => [...m, { role: "assistant", content: `⚠ ${msg}` }]);
      return;
    }
    setMsgs(m => [...m, { role: "assistant", content: data.response }]);
    if (typeof data.remaining === "number") setRemaining(data.remaining);
  };

  return (
    <>
      <button
        aria-label="AI Consultant"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", right: 16, bottom: 84, zIndex: 9998,
          width: 56, height: 56, borderRadius: 28,
          background: G.gold, color: "#1a1208", border: "none",
          fontSize: 24, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          display: open ? "none" : "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✦
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, height: "82vh", background: G.bg, color: G.text, borderTopLeftRadius: 18, borderTopRightRadius: 18, border: `1px solid ${G.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${G.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>✦ AI Consultant</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
                  {isAdmin ? "Admin · unlimited free use" : remaining !== null ? `${remaining} of 3 questions left today` : "3 questions/day"}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: G.muted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {msgs.length === 0 && !loading && (
                <div style={{ color: G.muted, fontSize: 13, textAlign: "center", padding: "30px 14px", lineHeight: 1.5 }}>
                  Ask anything about your products, balance, or how Aurum works. {isAdmin && "Admins can also ask about the admin dashboard."}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                  <div style={{ maxWidth: "86%", padding: "10px 12px", borderRadius: 14, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? G.gold : G.card, color: m.role === "user" ? "#1a1208" : G.text, border: m.role === "user" ? "none" : `1px solid ${G.border}` }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ padding: "10px 14px", borderRadius: 14, background: G.card, border: `1px solid ${G.border}`, color: G.muted, fontSize: 13, display: "inline-block" }}>Thinking…</div>
              )}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${G.border}`, display: "flex", gap: 8 }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                placeholder={!isAdmin && remaining === 0 ? "Daily limit reached — back tomorrow" : "Ask…"}
                disabled={(!isAdmin && remaining === 0) || loading}
                rows={2}
                style={{ flex: 1, background: G.card, color: G.text, border: `1px solid ${G.border}`, borderRadius: 10, padding: 10, fontFamily: "inherit", fontSize: 14, resize: "none" }}
              />
              <button onClick={ask} disabled={loading || !input.trim() || (!isAdmin && remaining === 0)} style={{ background: G.gold, color: "#1a1208", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}