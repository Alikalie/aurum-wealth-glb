import { useState, useEffect } from "react";
import { useAurum } from "../AurumContext";
import { COUNTRIES } from "../data";
import { ScreenShell } from "../ui";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/i18n";
import { NewsFeed } from "./NewsFeed";

const FEATURES = [
  { icon: "◆", t: "Zero commission trades", d: "Trade stocks and ETFs with no fees, ever. Keep more of what you earn." },
  { icon: "✦", t: "AI-powered insights", d: "Personalized recommendations driven by real-time market analysis." },
  { icon: "⛨", t: "Bank-grade security", d: "256-bit encryption and SIPC protection up to $500,000." },
  { icon: "$", t: "Start with $1", d: "Fractional shares let you invest in premium stocks for any amount." },
];

export function Landing({ nav }: { nav: (s: string) => void }) {
  const { s, G } = useAurum();
  return (
    <div style={s.scroll}>
      <div style={{ position: "relative", padding: "32px 22px 24px" }}>
        <div style={{ position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)", width: 500, height: 400, background: `radial-gradient(circle, ${G.gold}33 0%, transparent 60%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ ...s.serif, fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>Aurum</div>
            <span style={{ fontSize: 10, color: G.muted, letterSpacing: 1.5, marginLeft: 4, paddingTop: 6 }}>WEALTH</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: G.card, border: `1px solid ${G.border}`, borderRadius: 20, padding: "6px 12px", fontSize: 11, letterSpacing: 0.6, color: G.muted }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: G.gold }} />
            TRUSTED BY 180K+ INVESTORS
          </div>
          <h1 style={{ ...s.serif, fontSize: 40, lineHeight: 1.05, margin: "20px 0 14px", fontWeight: 600 }}>
            Welcome to <em style={{ color: G.gold, fontStyle: "italic" }}>Aurum</em>
          </h1>
          <p style={{ color: G.muted, fontSize: 15, lineHeight: 1.55, margin: 0 }}>Grow your wealth with clarity. Daily-earning investment cycles, instant deposits & withdrawals — built for investors who value precision.</p>
        </div>
      </div>

      <div style={{ padding: "8px 22px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={s.btnGold} onClick={() => nav("register")}>Get Started — Create Account</button>
        <button style={s.btnGhost} onClick={() => nav("login")}>Sign in to Aurum</button>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button style={{ ...s.btnGhost, padding: "12px", fontSize: 13 }} onClick={() => { document.getElementById("aurum-news")?.scrollIntoView({ behavior: "smooth" }); }}>📰 News</button>
          <button style={{ ...s.btnGhost, padding: "12px", fontSize: 13 }} onClick={() => { document.getElementById("aurum-why")?.scrollIntoView({ behavior: "smooth" }); }}>✨ Why Aurum</button>
          <button style={{ ...s.btnGhost, padding: "12px", fontSize: 13 }} onClick={() => nav("register")}>📈 Invest</button>
        </div>
        <p style={{ fontSize: 11, color: G.muted, textAlign: "center", margin: "6px 0 0", lineHeight: 1.5 }}>By continuing, you agree to our Terms and Privacy Policy.</p>
      </div>

      <div id="aurum-news" style={{ padding: "32px 22px 0" }}>
        <NewsFeed />
      </div>

      <div id="aurum-why" style={{ padding: "40px 22px 60px" }}>
        <div style={{ fontSize: 11, color: G.gold, letterSpacing: 1.5, fontWeight: 600 }}>WHY AURUM</div>
        <h2 style={{ ...s.serif, fontSize: 28, margin: "8px 0 24px", fontWeight: 600 }}>Built different. Built for you.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: G.gold + "1A", border: `1px solid ${G.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.t}</div>
                <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.5 }}>{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Login({ nav }: { nav: (s: string) => void }) {
  const { s, G, toast } = useAurum();
  const [email, setEmail] = useState(() => localStorage.getItem("aurum-remember-email") || "");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false), [load, setLoad] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem("aurum-remember-email"));
  const submit = async () => {
    if (!email || !pw) { toast("Please fill all fields"); return; }
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast("Enter a valid email"); return; }
    setLoad(true);
    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: pw });
    setLoad(false);
    if (error) { toast(error.message); return; }
    if (remember) localStorage.setItem("aurum-remember-email", trimmedEmail);
    else localStorage.removeItem("aurum-remember-email");
    nav("dashboard");
  };
  return (
    <ScreenShell title="Welcome back." onBack={() => nav("landing")}>
      <p style={{ color: G.muted, fontSize: 14, margin: "0 0 24px" }}>Sign in to continue building your wealth.</p>
      <label style={s.label}>EMAIL</label>
      <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <label style={{ ...s.label, marginTop: 14 }}>PASSWORD</label>
      <div style={{ position: "relative" }}>
        <input style={s.input} type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
        <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: G.muted, cursor: "pointer", fontSize: 12 }}>{show ? "HIDE" : "SHOW"}</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.text, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: G.gold, cursor: "pointer" }} />
          Remember me
        </label>
        <button onClick={() => nav("forgot")} style={{ background: "none", border: "none", color: G.gold, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Forgot password?</button>
      </div>
      <button style={s.btnGold} onClick={submit} disabled={load}>{load ? "Signing in…" : "Sign in"}</button>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: G.muted }}>
        New to Aurum? <button onClick={() => nav("register")} style={{ background: "none", border: "none", color: G.gold, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Create account</button>
      </p>
    </ScreenShell>
  );
}

const CURRENCY_OPTIONS = Array.from(new Set(COUNTRIES.map(c => c.currency))).sort();

export function Register({ nav }: { nav: (s: string) => void }) {
  const { s, G, toast } = useAurum();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(COUNTRIES.find(c => c.code === "US")!);
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [phone, setPhone] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false), [load, setLoad] = useState(false);
  const [open, setOpen] = useState(false), [search, setSearch] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  // When country changes, suggest its currency
  useEffect(() => { setCurrency(country.currency); }, [country]);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) { toast("Enter your first and last name"); return; }
    if (firstName.length > 50 || lastName.length > 50) { toast("Name too long"); return; }
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast("Enter a valid email"); return; }
    if (!phone || phone.length < 5 || phone.length > 15) { toast("Enter a valid phone number"); return; }
    if (!pw || !pw2) { toast("Please fill all fields"); return; }
    if (pw !== pw2) { toast("Passwords don't match"); return; }
    if (pw.length < 8) { toast("Password must be at least 8 characters"); return; }
    setLoad(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: pw,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          country_code: country.code,
          country_name: country.name,
          currency,
          language,
          phone: country.dial + phone,
        },
      },
    });
    setLoad(false);
    if (error) {
      if (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered")) {
        toast("This email is already registered. Try signing in.");
      } else {
        toast(error.message);
      }
      return;
    }
    toast("Account created!");
    nav("dashboard");
  };

  return (
    <ScreenShell title="Create account." onBack={() => nav("landing")}>
      <p style={{ color: G.muted, fontSize: 14, margin: "0 0 24px" }}>Start your journey to financial clarity.</p>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={s.label}>FIRST NAME</label>
          <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" maxLength={50} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.label}>LAST NAME</label>
          <input style={s.input} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" maxLength={50} />
        </div>
      </div>

      <label style={{ ...s.label, marginTop: 14 }}>EMAIL</label>
      <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />

      <label style={{ ...s.label, marginTop: 14 }}>COUNTRY</label>
      <button onClick={() => setOpen(!open)} style={{ ...s.input, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{country.flag} {country.name}</span><span style={{ color: G.muted }}>▾</span>
      </button>
      {open && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, marginTop: 6, maxHeight: 280, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <input style={{ ...s.input, borderRadius: 0, border: "none", borderBottom: `1px solid ${G.border}` }} placeholder="Search countries..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map(c => (
              <div key={c.code} onClick={() => { setCountry(c); setOpen(false); setSearch(""); }} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${G.border}` }}>
                <span>{c.flag} {c.name}</span><span style={{ color: G.muted }}>{c.dial}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <label style={{ ...s.label, marginTop: 14 }}>INVESTMENT CURRENCY</label>
      <select style={{ ...s.input, appearance: "none" }} value={currency} onChange={e => setCurrency(e.target.value)}>
        {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <p style={{ fontSize: 11, color: G.muted, margin: "6px 2px 0" }}>Auto-set from your country. Locked for 60 days after registration.</p>

      <label style={{ ...s.label, marginTop: 14 }}>LANGUAGE</label>
      <button onClick={() => setLangOpen(!langOpen)} style={{ ...s.input, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{LANGUAGES.find(l => l.code === language)?.native} ({LANGUAGES.find(l => l.code === language)?.name})</span>
        <span style={{ color: G.muted }}>▾</span>
      </button>
      {langOpen && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, marginTop: 6, maxHeight: 240, overflowY: "auto" }}>
          {LANGUAGES.map(l => (
            <div key={l.code} onClick={() => { setLanguage(l.code); setLangOpen(false); }} style={{ padding: "12px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${G.border}`, display: "flex", justifyContent: "space-between" }}>
              <span>{l.native}</span><span style={{ color: G.muted }}>{l.name}</span>
            </div>
          ))}
        </div>
      )}

      <label style={{ ...s.label, marginTop: 14 }}>CONTACT NUMBER</label>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 86, background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: G.gold, fontSize: 14, fontWeight: 600 }}>{country.flag} {country.dial}</div>
        <input style={{ ...s.input, flex: 1 }} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="Phone number" />
      </div>

      <label style={{ ...s.label, marginTop: 14 }}>PASSWORD</label>
      <div style={{ position: "relative" }}>
        <input style={s.input} type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
        <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: G.muted, cursor: "pointer", fontSize: 12 }}>{show ? "HIDE" : "SHOW"}</button>
      </div>
      <p style={{ fontSize: 11, color: G.muted, margin: "6px 2px 0" }}>At least 8 characters. Avoid common passwords.</p>

      <label style={{ ...s.label, marginTop: 14 }}>CONFIRM PASSWORD</label>
      <input style={s.input} type={show ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" />

      <button style={{ ...s.btnGold, marginTop: 22 }} onClick={submit} disabled={load}>{load ? "Creating account…" : "Create account"}</button>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: G.muted }}>
        Already have an account? <button onClick={() => nav("login")} style={{ background: "none", border: "none", color: G.gold, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button>
      </p>
    </ScreenShell>
  );
}

export function Forgot({ nav }: { nav: (s: string) => void }) {
  const { s, G, toast } = useAurum();
  const [email, setEmail] = useState(""), [sent, setSent] = useState(false);
  const send = async () => {
    if (!email) { toast("Enter your email"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
    if (error) { toast(error.message); return; }
    setSent(true);
  };
  return (
    <ScreenShell title={sent ? "Check your inbox." : "Reset your password."} onBack={() => sent ? setSent(false) : nav("login")}>
      {!sent ? (
        <>
          <p style={{ color: G.muted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>Enter your email and we'll send you a link to reset your password.</p>
          <label style={s.label}>EMAIL</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <button style={{ ...s.btnGold, marginTop: 22 }} onClick={send}>Send reset link</button>
        </>
      ) : (
        <>
          <p style={{ color: G.muted, fontSize: 14, margin: "0 0 8px", lineHeight: 1.5 }}>We sent a password reset link to</p>
          <p style={{ color: G.gold, fontSize: 15, fontWeight: 600, margin: "0 0 20px" }}>{email}</p>
          <button style={s.btnGold} onClick={() => nav("login")}>Back to sign in</button>
        </>
      )}
    </ScreenShell>
  );
}