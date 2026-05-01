export type ThemeMode = "dark" | "light";

export type Palette = {
  bg: string;
  gold: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  inactive: string;
  green: string;
  red: string;
  teal: string;
  blue: string;
  amber: string;
};

export const PALETTES: Record<ThemeMode, Palette> = {
  dark: {
    bg: "#0D0D0F",
    gold: "#C89633",
    card: "#111113",
    border: "#1A1A1D",
    text: "#F5F3EE",
    muted: "#5A5855",
    inactive: "#3A3A3D",
    green: "#97C459",
    red: "#F09595",
    teal: "#5DCAA5",
    blue: "#85B7EB",
    amber: "#EF9F27",
  },
  light: {
    bg: "#F7F5F0",
    gold: "#A87420",
    card: "#FFFFFF",
    border: "#E5E1D8",
    text: "#1A1612",
    muted: "#7A746B",
    inactive: "#B8B2A6",
    green: "#5A8F2C",
    red: "#C24545",
    teal: "#2E9B72",
    blue: "#3D7CB8",
    amber: "#C97A0E",
  },
};

export type StyleSet = {
  app: React.CSSProperties;
  phone: React.CSSProperties;
  scroll: React.CSSProperties;
  serif: React.CSSProperties;
  input: React.CSSProperties;
  label: React.CSSProperties;
  btnGold: React.CSSProperties;
  btnGhost: React.CSSProperties;
  btnDark: React.CSSProperties;
  card: React.CSSProperties;
  divider: React.CSSProperties;
  hLine: React.CSSProperties;
};

export const buildStyles = (G: Palette): StyleSet => ({
  app: { background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", fontSize: 13, letterSpacing: 0 },
  phone: { maxWidth: 390, margin: "0 auto", background: G.bg, minHeight: "100vh", position: "relative", overflow: "hidden" },
  scroll: { height: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch" },
  serif: { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", letterSpacing: -0.2 },
  input: { width: "100%", background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px", color: G.text, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  label: { fontSize: 11, color: G.muted, marginBottom: 5, display: "block", letterSpacing: 0.4 },
  btnGold: { width: "100%", background: G.gold, color: "#1a1208", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnGhost: { width: "100%", background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnDark: { width: "100%", background: G.card, color: G.text, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  card: { background: G.card, border: `1px solid ${G.border}`, borderRadius: 18, padding: 18 },
  divider: { display: "flex", alignItems: "center", gap: 12, color: G.muted, fontSize: 11, margin: "18px 0" },
  hLine: { flex: 1, height: 1, background: G.border },
});