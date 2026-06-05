import { useEffect, useRef, useState } from "react";
import { useAurum } from "../AurumContext";
import { ScreenShell } from "../ui";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string; at: string };

export function AIConsultant({ nav }: { nav: (s: string) => void }) {
  const { s, G, user, toast, isAdmin } = useAurum();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load today's prior consultations so the count and history are visible.
  useEffect(() => {
    if (!user) return;
    if (isAdmin) { setRemaining(null); return; }
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    supabase
      .from("ai_consultations")
      .select("question,response,used_at")
      .eq("user_id", user.id)
      .gte("used_at", since.toISOString())
      .order("used_at", { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as any[];
        const history: Msg[] = [];
        for (const r of rows) {
          history.push({ role: "user", content: r.question, at: r.used_at });
          if (r.response) history.push({ role: "assistant", content: r.response, at: r.used_at });
        }
        setMsgs(history);
        setRemaining(Math.max(0, 3 - rows.length));
      });
  }, [user, isAdmin]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const ask = async () => {
    const q = input.trim();
    if (!q) return;
    if (!isAdmin && remaining !== null && remaining <= 0) {
      toast("Daily limit reached (3/day)");
      return;
    }
    setInput("");
    setMsgs(m => [...m, { role: "user", content: q, at: new Date().toISOString() }]);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-consultant", { body: { question: q } });
    setLoading(false);
    if (error || (data && data.error)) {
      const errMsg = (data && data.error) || error?.message || "Something went wrong";
      toast(errMsg);
      setMsgs(m => [...m, { role: "assistant", content: `⚠ ${errMsg}`, at: new Date().toISOString() }]);
      return;
    }
    setMsgs(m => [...m, { role: "assistant", content: data.response, at: new Date().toISOString() }]);
    if (typeof data.remaining === "number") setRemaining(data.remaining);
  };

  const SUGGESTED = [
    "How do daily payouts on Aurum work?",
    "Which product would suit me best right now?",
    "How can I diversify across products?",
  ];

  return (
    <ScreenShell title="AI Investment Consultant" onBack={() => nav("dashboard")}>
      <div style={{ ...s.card, padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.5 }}>{isAdmin ? "ADMIN MODE" : "DAILY QUESTIONS LEFT"}</div>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 700, color: G.gold }}>{isAdmin ? "Unlimited" : `${remaining ?? "—"} / 3`}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: G.gold + "22", border: `1px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✦</div>
      </div>

      <div ref={scrollRef} style={{ minHeight: 240, maxHeight: 380, overflowY: "auto", padding: 4, marginBottom: 10 }}>
        {msgs.length === 0 && !loading && (
          <div style={{ color: G.muted, fontSize: 13, textAlign: "center", padding: "30px 10px", lineHeight: 1.5 }}>
            Ask anything about your Aurum products, how cycles work, or how to plan your next investment. Your consultant knows your wallet and active products.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
            <div style={{ maxWidth: "85%", padding: "10px 12px", borderRadius: 14, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? G.gold : G.card, color: m.role === "user" ? "#1a1208" : G.text, border: m.role === "user" ? "none" : `1px solid ${G.border}` }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
            <div style={{ padding: "10px 14px", borderRadius: 14, background: G.card, border: `1px solid ${G.border}`, color: G.muted, fontSize: 13 }}>Thinking…</div>
          </div>
        )}
      </div>

      {msgs.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {SUGGESTED.map(q => (
            <button key={q} onClick={() => setInput(q)} style={{ ...s.btnGhost, fontSize: 12, padding: 10, textAlign: "left" }}>💡 {q}</button>
          ))}
        </div>
      )}

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={!isAdmin && remaining === 0 ? "Daily limit reached — back tomorrow" : "Ask your consultant…"}
        disabled={(!isAdmin && remaining === 0) || loading}
        rows={2}
        style={{ ...s.input, resize: "none", fontFamily: "inherit" }}
      />
      <button style={{ ...s.btnGold, marginTop: 10 }} onClick={ask} disabled={loading || !input.trim() || (!isAdmin && remaining === 0)}>
        {loading ? "Sending…" : "Ask consultant"}
      </button>
      <p style={{ fontSize: 11, color: G.muted, textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
        For educational guidance only. Not regulated financial advice.
      </p>
    </ScreenShell>
  );
}