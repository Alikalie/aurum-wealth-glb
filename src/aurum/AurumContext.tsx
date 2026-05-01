import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PALETTES, buildStyles, ThemeMode } from "./theme";
import i18n from "@/i18n";
import { loadFxRates } from "./data";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  country_code: string | null;
  country_name: string | null;
  currency: string;
  currency_locked_until: string;
  payment_edit_locked: boolean;
  invested: number;
  earned: number;
  withdrawn: number;
  theme: string;
  language: string;
  is_blocked: boolean;
  account_number: number | null;
};

type Ctx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  themeMode: ThemeMode;
  G: typeof PALETTES["dark"];
  s: ReturnType<typeof buildStyles>;
  toast: (msg: string) => void;
  toastMsg: string | null;
  setThemeMode: (m: ThemeMode) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AurumCtx = createContext<Ctx | null>(null);

export function AurumProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("aurum-theme") as ThemeMode) || "dark";
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const G = PALETTES[themeMode];
  const s = buildStyles(G);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    localStorage.setItem("aurum-theme", m);
    if (user) supabase.from("profiles").update({ theme: m }).eq("user_id", user.id);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) { setProfile(null); setIsAdmin(false); return; }
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (p) {
      setProfile(p as Profile);
      if (p.theme === "dark" || p.theme === "light") {
        setThemeModeState(p.theme);
        localStorage.setItem("aurum-theme", p.theme);
      }
      if (p.language && p.language !== i18n.language) {
        i18n.changeLanguage(p.language);
      }
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    setIsAdmin((roles ?? []).some((r) => r.role === "admin"));

    // Apply pending referral code (if any) — only once per user
    const refCode = localStorage.getItem("aurum-ref-code");
    if (refCode) {
      const { data: existing } = await supabase.from("referrals").select("id").eq("referred_user_id", user.id).maybeSingle();
      if (!existing) {
        const { data: aff } = await supabase.from("affiliates").select("user_id").eq("code", refCode).maybeSingle();
        if (aff && aff.user_id !== user.id) {
          await supabase.from("referrals").insert({
            referrer_id: aff.user_id,
            referred_user_id: user.id,
            code: refCode,
          });
          await supabase.rpc as any;
          // increment counter best-effort
          await supabase.from("affiliates").update({ total_referrals: 1 } as any).eq("user_id", aff.user_id).select();
        }
      }
      localStorage.removeItem("aurum-ref-code");
    }
  }, [user]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    loadFxRates(supabase).catch(() => {});
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { refreshProfile(); }, [user, refreshProfile]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null); setIsAdmin(false);
  }, []);

  return (
    <AurumCtx.Provider value={{ user, session, profile, isAdmin, loading, themeMode, G, s, toast, toastMsg, setThemeMode, refreshProfile, signOut }}>
      {children}
    </AurumCtx.Provider>
  );
}

export function useAurum() {
  const ctx = useContext(AurumCtx);
  if (!ctx) throw new Error("useAurum must be inside AurumProvider");
  return ctx;
}