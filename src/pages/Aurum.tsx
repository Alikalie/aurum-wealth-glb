import { useState, useEffect, useRef } from "react";

const G = {
  bg: "#0D0D0F", gold: "#C89633", card: "#111113", border: "#1A1A1D",
  text: "#F5F3EE", muted: "#5A5855", inactive: "#3A3A3D",
  green: "#97C459", red: "#F09595", teal: "#5DCAA5", blue: "#85B7EB", amber: "#EF9F27",
};

const s = {
  app: { background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties,
  phone: { maxWidth: 390, margin: "0 auto", background: G.bg, minHeight: "100vh", position: "relative" as const, overflow: "hidden" },
  scroll: { height: "100vh", overflowY: "auto" as const, WebkitOverflowScrolling: "touch" as const },
  serif: { fontFamily: "'Playfair Display', serif" },
  input: { width: "100%", background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "14px 16px", color: G.text, fontSize: 15, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const },
  label: { fontSize: 12, color: G.muted, marginBottom: 6, display: "block", letterSpacing: 0.4 },
  btnGold: { width: "100%", background: G.gold, color: "#1a1208", border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  btnGhost: { width: "100%", background: "transparent", color: G.text, border: `1px solid ${G.border}`, borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnDark: { width: "100%", background: G.card, color: G.text, border: `1px solid ${G.border}`, borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  card: { background: G.card, border: `1px solid ${G.border}`, borderRadius: 18, padding: 18 },
  divider: { display: "flex", alignItems: "center", gap: 12, color: G.muted, fontSize: 12, margin: "18px 0" },
  hLine: { flex: 1, height: 1, background: G.border },
};

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Toast = ({ msg }: { msg: string | null }) => msg ? (
  <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: G.card, border: `1px solid ${G.gold}`, color: G.text, padding: "12px 20px", borderRadius: 12, fontSize: 14, zIndex: 1000, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>{msg}</div>
) : null;

const Sparkline = ({ data, color, w = 280, h = 60 }: { data: number[]; color: string; w?: number; h?: number }) => {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /></svg>;
};

const COUNTRIES = [
  {code:"AF",name:"Afghanistan",dial:"+93",flag:"🇦🇫"},{code:"AL",name:"Albania",dial:"+355",flag:"🇦🇱"},{code:"DZ",name:"Algeria",dial:"+213",flag:"🇩🇿"},{code:"AD",name:"Andorra",dial:"+376",flag:"🇦🇩"},{code:"AO",name:"Angola",dial:"+244",flag:"🇦🇴"},{code:"AG",name:"Antigua and Barbuda",dial:"+1268",flag:"🇦🇬"},{code:"AR",name:"Argentina",dial:"+54",flag:"🇦🇷"},{code:"AM",name:"Armenia",dial:"+374",flag:"🇦🇲"},{code:"AU",name:"Australia",dial:"+61",flag:"🇦🇺"},{code:"AT",name:"Austria",dial:"+43",flag:"🇦🇹"},{code:"AZ",name:"Azerbaijan",dial:"+994",flag:"🇦🇿"},{code:"BS",name:"Bahamas",dial:"+1242",flag:"🇧🇸"},{code:"BH",name:"Bahrain",dial:"+973",flag:"🇧🇭"},{code:"BD",name:"Bangladesh",dial:"+880",flag:"🇧🇩"},{code:"BB",name:"Barbados",dial:"+1246",flag:"🇧🇧"},{code:"BY",name:"Belarus",dial:"+375",flag:"🇧🇾"},{code:"BE",name:"Belgium",dial:"+32",flag:"🇧🇪"},{code:"BZ",name:"Belize",dial:"+501",flag:"🇧🇿"},{code:"BJ",name:"Benin",dial:"+229",flag:"🇧🇯"},{code:"BT",name:"Bhutan",dial:"+975",flag:"🇧🇹"},{code:"BO",name:"Bolivia",dial:"+591",flag:"🇧🇴"},{code:"BA",name:"Bosnia and Herzegovina",dial:"+387",flag:"🇧🇦"},{code:"BW",name:"Botswana",dial:"+267",flag:"🇧🇼"},{code:"BR",name:"Brazil",dial:"+55",flag:"🇧🇷"},{code:"BN",name:"Brunei",dial:"+673",flag:"🇧🇳"},{code:"BG",name:"Bulgaria",dial:"+359",flag:"🇧🇬"},{code:"BF",name:"Burkina Faso",dial:"+226",flag:"🇧🇫"},{code:"BI",name:"Burundi",dial:"+257",flag:"🇧🇮"},{code:"CV",name:"Cabo Verde",dial:"+238",flag:"🇨🇻"},{code:"KH",name:"Cambodia",dial:"+855",flag:"🇰🇭"},{code:"CM",name:"Cameroon",dial:"+237",flag:"🇨🇲"},{code:"CA",name:"Canada",dial:"+1",flag:"🇨🇦"},{code:"CF",name:"Central African Republic",dial:"+236",flag:"🇨🇫"},{code:"TD",name:"Chad",dial:"+235",flag:"🇹🇩"},{code:"CL",name:"Chile",dial:"+56",flag:"🇨🇱"},{code:"CN",name:"China",dial:"+86",flag:"🇨🇳"},{code:"CO",name:"Colombia",dial:"+57",flag:"🇨🇴"},{code:"KM",name:"Comoros",dial:"+269",flag:"🇰🇲"},{code:"CG",name:"Congo",dial:"+242",flag:"🇨🇬"},{code:"CD",name:"Congo (DRC)",dial:"+243",flag:"🇨🇩"},{code:"CR",name:"Costa Rica",dial:"+506",flag:"🇨🇷"},{code:"CI",name:"Côte d'Ivoire",dial:"+225",flag:"🇨🇮"},{code:"HR",name:"Croatia",dial:"+385",flag:"🇭🇷"},{code:"CU",name:"Cuba",dial:"+53",flag:"🇨🇺"},{code:"CY",name:"Cyprus",dial:"+357",flag:"🇨🇾"},{code:"CZ",name:"Czechia",dial:"+420",flag:"🇨🇿"},{code:"DK",name:"Denmark",dial:"+45",flag:"🇩🇰"},{code:"DJ",name:"Djibouti",dial:"+253",flag:"🇩🇯"},{code:"DM",name:"Dominica",dial:"+1767",flag:"🇩🇲"},{code:"DO",name:"Dominican Republic",dial:"+1809",flag:"🇩🇴"},{code:"EC",name:"Ecuador",dial:"+593",flag:"🇪🇨"},{code:"EG",name:"Egypt",dial:"+20",flag:"🇪🇬"},{code:"SV",name:"El Salvador",dial:"+503",flag:"🇸🇻"},{code:"GQ",name:"Equatorial Guinea",dial:"+240",flag:"🇬🇶"},{code:"ER",name:"Eritrea",dial:"+291",flag:"🇪🇷"},{code:"EE",name:"Estonia",dial:"+372",flag:"🇪🇪"},{code:"SZ",name:"Eswatini",dial:"+268",flag:"🇸🇿"},{code:"ET",name:"Ethiopia",dial:"+251",flag:"🇪🇹"},{code:"FJ",name:"Fiji",dial:"+679",flag:"🇫🇯"},{code:"FI",name:"Finland",dial:"+358",flag:"🇫🇮"},{code:"FR",name:"France",dial:"+33",flag:"🇫🇷"},{code:"GA",name:"Gabon",dial:"+241",flag:"🇬🇦"},{code:"GM",name:"Gambia",dial:"+220",flag:"🇬🇲"},{code:"GE",name:"Georgia",dial:"+995",flag:"🇬🇪"},{code:"DE",name:"Germany",dial:"+49",flag:"🇩🇪"},{code:"GH",name:"Ghana",dial:"+233",flag:"🇬🇭"},{code:"GR",name:"Greece",dial:"+30",flag:"🇬🇷"},{code:"GD",name:"Grenada",dial:"+1473",flag:"🇬🇩"},{code:"GT",name:"Guatemala",dial:"+502",flag:"🇬🇹"},{code:"GN",name:"Guinea",dial:"+224",flag:"🇬🇳"},{code:"GW",name:"Guinea-Bissau",dial:"+245",flag:"🇬🇼"},{code:"GY",name:"Guyana",dial:"+592",flag:"🇬🇾"},{code:"HT",name:"Haiti",dial:"+509",flag:"🇭🇹"},{code:"HN",name:"Honduras",dial:"+504",flag:"🇭🇳"},{code:"HU",name:"Hungary",dial:"+36",flag:"🇭🇺"},{code:"IS",name:"Iceland",dial:"+354",flag:"🇮🇸"},{code:"IN",name:"India",dial:"+91",flag:"🇮🇳"},{code:"ID",name:"Indonesia",dial:"+62",flag:"🇮🇩"},{code:"IR",name:"Iran",dial:"+98",flag:"🇮🇷"},{code:"IQ",name:"Iraq",dial:"+964",flag:"🇮🇶"},{code:"IE",name:"Ireland",dial:"+353",flag:"🇮🇪"},{code:"IL",name:"Israel",dial:"+972",flag:"🇮🇱"},{code:"IT",name:"Italy",dial:"+39",flag:"🇮🇹"},{code:"JM",name:"Jamaica",dial:"+1876",flag:"🇯🇲"},{code:"JP",name:"Japan",dial:"+81",flag:"🇯🇵"},{code:"JO",name:"Jordan",dial:"+962",flag:"🇯🇴"},{code:"KZ",name:"Kazakhstan",dial:"+7",flag:"🇰🇿"},{code:"KE",name:"Kenya",dial:"+254",flag:"🇰🇪"},{code:"KI",name:"Kiribati",dial:"+686",flag:"🇰🇮"},{code:"KP",name:"North Korea",dial:"+850",flag:"🇰🇵"},{code:"KR",name:"South Korea",dial:"+82",flag:"🇰🇷"},{code:"KW",name:"Kuwait",dial:"+965",flag:"🇰🇼"},{code:"KG",name:"Kyrgyzstan",dial:"+996",flag:"🇰🇬"},{code:"LA",name:"Laos",dial:"+856",flag:"🇱🇦"},{code:"LV",name:"Latvia",dial:"+371",flag:"🇱🇻"},{code:"LB",name:"Lebanon",dial:"+961",flag:"🇱🇧"},{code:"LS",name:"Lesotho",dial:"+266",flag:"🇱🇸"},{code:"LR",name:"Liberia",dial:"+231",flag:"🇱🇷"},{code:"LY",name:"Libya",dial:"+218",flag:"🇱🇾"},{code:"LI",name:"Liechtenstein",dial:"+423",flag:"🇱🇮"},{code:"LT",name:"Lithuania",dial:"+370",flag:"🇱🇹"},{code:"LU",name:"Luxembourg",dial:"+352",flag:"🇱🇺"},{code:"MG",name:"Madagascar",dial:"+261",flag:"🇲🇬"},{code:"MW",name:"Malawi",dial:"+265",flag:"🇲🇼"},{code:"MY",name:"Malaysia",dial:"+60",flag:"🇲🇾"},{code:"MV",name:"Maldives",dial:"+960",flag:"🇲🇻"},{code:"ML",name:"Mali",dial:"+223",flag:"🇲🇱"},{code:"MT",name:"Malta",dial:"+356",flag:"🇲🇹"},{code:"MH",name:"Marshall Islands",dial:"+692",flag:"🇲🇭"},{code:"MR",name:"Mauritania",dial:"+222",flag:"🇲🇷"},{code:"MU",name:"Mauritius",dial:"+230",flag:"🇲🇺"},{code:"MX",name:"Mexico",dial:"+52",flag:"🇲🇽"},{code:"FM",name:"Micronesia",dial:"+691",flag:"🇫🇲"},{code:"MD",name:"Moldova",dial:"+373",flag:"🇲🇩"},{code:"MC",name:"Monaco",dial:"+377",flag:"🇲🇨"},{code:"MN",name:"Mongolia",dial:"+976",flag:"🇲🇳"},{code:"ME",name:"Montenegro",dial:"+382",flag:"🇲🇪"},{code:"MA",name:"Morocco",dial:"+212",flag:"🇲🇦"},{code:"MZ",name:"Mozambique",dial:"+258",flag:"🇲🇿"},{code:"MM",name:"Myanmar",dial:"+95",flag:"🇲🇲"},{code:"NA",name:"Namibia",dial:"+264",flag:"🇳🇦"},{code:"NR",name:"Nauru",dial:"+674",flag:"🇳🇷"},{code:"NP",name:"Nepal",dial:"+977",flag:"🇳🇵"},{code:"NL",name:"Netherlands",dial:"+31",flag:"🇳🇱"},{code:"NZ",name:"New Zealand",dial:"+64",flag:"🇳🇿"},{code:"NI",name:"Nicaragua",dial:"+505",flag:"🇳🇮"},{code:"NE",name:"Niger",dial:"+227",flag:"🇳🇪"},{code:"NG",name:"Nigeria",dial:"+234",flag:"🇳🇬"},{code:"MK",name:"North Macedonia",dial:"+389",flag:"🇲🇰"},{code:"NO",name:"Norway",dial:"+47",flag:"🇳🇴"},{code:"OM",name:"Oman",dial:"+968",flag:"🇴🇲"},{code:"PK",name:"Pakistan",dial:"+92",flag:"🇵🇰"},{code:"PW",name:"Palau",dial:"+680",flag:"🇵🇼"},{code:"PS",name:"Palestine",dial:"+970",flag:"🇵🇸"},{code:"PA",name:"Panama",dial:"+507",flag:"🇵🇦"},{code:"PG",name:"Papua New Guinea",dial:"+675",flag:"🇵🇬"},{code:"PY",name:"Paraguay",dial:"+595",flag:"🇵🇾"},{code:"PE",name:"Peru",dial:"+51",flag:"🇵🇪"},{code:"PH",name:"Philippines",dial:"+63",flag:"🇵🇭"},{code:"PL",name:"Poland",dial:"+48",flag:"🇵🇱"},{code:"PT",name:"Portugal",dial:"+351",flag:"🇵🇹"},{code:"QA",name:"Qatar",dial:"+974",flag:"🇶🇦"},{code:"RO",name:"Romania",dial:"+40",flag:"🇷🇴"},{code:"RU",name:"Russia",dial:"+7",flag:"🇷🇺"},{code:"RW",name:"Rwanda",dial:"+250",flag:"🇷🇼"},{code:"KN",name:"Saint Kitts and Nevis",dial:"+1869",flag:"🇰🇳"},{code:"LC",name:"Saint Lucia",dial:"+1758",flag:"🇱🇨"},{code:"VC",name:"Saint Vincent and the Grenadines",dial:"+1784",flag:"🇻🇨"},{code:"WS",name:"Samoa",dial:"+685",flag:"🇼🇸"},{code:"SM",name:"San Marino",dial:"+378",flag:"🇸🇲"},{code:"ST",name:"São Tomé and Príncipe",dial:"+239",flag:"🇸🇹"},{code:"SA",name:"Saudi Arabia",dial:"+966",flag:"🇸🇦"},{code:"SN",name:"Senegal",dial:"+221",flag:"🇸🇳"},{code:"RS",name:"Serbia",dial:"+381",flag:"🇷🇸"},{code:"SC",name:"Seychelles",dial:"+248",flag:"🇸🇨"},{code:"SL",name:"Sierra Leone",dial:"+232",flag:"🇸🇱"},{code:"SG",name:"Singapore",dial:"+65",flag:"🇸🇬"},{code:"SK",name:"Slovakia",dial:"+421",flag:"🇸🇰"},{code:"SI",name:"Slovenia",dial:"+386",flag:"🇸🇮"},{code:"SB",name:"Solomon Islands",dial:"+677",flag:"🇸🇧"},{code:"SO",name:"Somalia",dial:"+252",flag:"🇸🇴"},{code:"ZA",name:"South Africa",dial:"+27",flag:"🇿🇦"},{code:"SS",name:"South Sudan",dial:"+211",flag:"🇸🇸"},{code:"ES",name:"Spain",dial:"+34",flag:"🇪🇸"},{code:"LK",name:"Sri Lanka",dial:"+94",flag:"🇱🇰"},{code:"SD",name:"Sudan",dial:"+249",flag:"🇸🇩"},{code:"SR",name:"Suriname",dial:"+597",flag:"🇸🇷"},{code:"SE",name:"Sweden",dial:"+46",flag:"🇸🇪"},{code:"CH",name:"Switzerland",dial:"+41",flag:"🇨🇭"},{code:"SY",name:"Syria",dial:"+963",flag:"🇸🇾"},{code:"TW",name:"Taiwan",dial:"+886",flag:"🇹🇼"},{code:"TJ",name:"Tajikistan",dial:"+992",flag:"🇹🇯"},{code:"TZ",name:"Tanzania",dial:"+255",flag:"🇹🇿"},{code:"TH",name:"Thailand",dial:"+66",flag:"🇹🇭"},{code:"TL",name:"Timor-Leste",dial:"+670",flag:"🇹🇱"},{code:"TG",name:"Togo",dial:"+228",flag:"🇹🇬"},{code:"TO",name:"Tonga",dial:"+676",flag:"🇹🇴"},{code:"TT",name:"Trinidad and Tobago",dial:"+1868",flag:"🇹🇹"},{code:"TN",name:"Tunisia",dial:"+216",flag:"🇹🇳"},{code:"TR",name:"Türkiye",dial:"+90",flag:"🇹🇷"},{code:"TM",name:"Turkmenistan",dial:"+993",flag:"🇹🇲"},{code:"TV",name:"Tuvalu",dial:"+688",flag:"🇹🇻"},{code:"UG",name:"Uganda",dial:"+256",flag:"🇺🇬"},{code:"UA",name:"Ukraine",dial:"+380",flag:"🇺🇦"},{code:"AE",name:"United Arab Emirates",dial:"+971",flag:"🇦🇪"},{code:"GB",name:"United Kingdom",dial:"+44",flag:"🇬🇧"},{code:"US",name:"United States",dial:"+1",flag:"🇺🇸"},{code:"UY",name:"Uruguay",dial:"+598",flag:"🇺🇾"},{code:"UZ",name:"Uzbekistan",dial:"+998",flag:"🇺🇿"},{code:"VU",name:"Vanuatu",dial:"+678",flag:"🇻🇺"},{code:"VA",name:"Vatican City",dial:"+379",flag:"🇻🇦"},{code:"VE",name:"Venezuela",dial:"+58",flag:"🇻🇪"},{code:"VN",name:"Vietnam",dial:"+84",flag:"🇻🇳"},{code:"YE",name:"Yemen",dial:"+967",flag:"🇾🇪"},{code:"ZM",name:"Zambia",dial:"+260",flag:"🇿🇲"},{code:"ZW",name:"Zimbabwe",dial:"+263",flag:"🇿🇼"},
];

const TICKERS = [
  { sym: "BTC", chg: "+2.4%", up: true }, { sym: "AAPL", chg: "+0.8%", up: true },
  { sym: "ETH", chg: "-1.2%", up: false }, { sym: "NVDA", chg: "+3.1%", up: true },
  { sym: "SPY", chg: "-0.3%", up: false },
];

const FEATURES = [
  { icon: "◆", color: G.gold, t: "Zero commission trades", d: "Trade stocks and ETFs with no fees, ever. Keep more of what you earn." },
  { icon: "✦", color: G.teal, t: "AI-powered insights", d: "Personalized recommendations driven by real-time market analysis." },
  { icon: "⛨", color: G.blue, t: "Bank-grade security", d: "256-bit encryption and SIPC protection up to $500,000." },
  { icon: "$", color: G.amber, t: "Start with $1", d: "Fractional shares let you invest in premium stocks for any amount." },
  { icon: "◉", color: G.green, t: "Instant diversification", d: "Curated portfolios balanced across sectors and asset classes." },
  { icon: "⚡", color: G.red, t: "Real-time everything", d: "Live prices, instant settlements, and immediate notifications." },
];

const MOVERS = [
  { sym: "AAPL", name: "Apple Inc.", price: "$189.42", chg: "+2.4%", up: true, color: G.blue, data: [3, 4, 3.5, 5, 4.5, 6, 5.5, 7, 8] },
  { sym: "TSLA", name: "Tesla", price: "$242.18", chg: "-1.8%", up: false, color: G.red, data: [8, 7, 7.5, 6, 6.5, 5, 5.5, 4, 3] },
  { sym: "NVDA", name: "NVIDIA", price: "$481.23", chg: "+3.1%", up: true, color: G.green, data: [4, 5, 4.5, 6, 7, 6.5, 8, 7.5, 9] },
  { sym: "BTC", name: "Bitcoin", price: "$43,210", chg: "+2.4%", up: true, color: G.amber, data: [5, 6, 5.5, 7, 6.5, 8, 7.5, 9, 8.5] },
];

const HOLDINGS = [
  { sym: "AAPL", name: "Apple Inc.", shares: "12 shares", value: "$2,273.04", pl: "+$184.20", up: true, color: G.blue },
  { sym: "NVDA", name: "NVIDIA", shares: "5 shares", value: "$2,406.15", pl: "+$612.40", up: true, color: G.green },
  { sym: "BTC", name: "Bitcoin", shares: "0.08 BTC", value: "$3,456.80", pl: "+$245.10", up: true, color: G.amber },
  { sym: "TSLA", name: "Tesla", shares: "8 shares", value: "$1,937.44", pl: "-$92.30", up: false, color: G.red },
  { sym: "VOO", name: "Vanguard S&P 500", shares: "4 shares", value: "$1,820.00", pl: "+$78.00", up: true, color: G.teal },
];

const TXNS = [
  { day: "Today", items: [
    { type: "buy", sym: "AAPL", time: "10:42 AM", amt: "-$945.20" },
    { type: "div", sym: "VOO", time: "9:15 AM", amt: "+$12.40" },
  ]},
  { day: "Yesterday", items: [
    { type: "sell", sym: "TSLA", time: "3:22 PM", amt: "+$1,210.00" },
    { type: "buy", sym: "BTC", time: "11:08 AM", amt: "-$500.00" },
  ]},
  { day: "Earlier", items: [
    { type: "buy", sym: "NVDA", time: "Mar 18", amt: "-$1,802.50" },
    { type: "div", sym: "AAPL", time: "Mar 15", amt: "+$8.40" },
  ]},
];

const NavIcon = ({ name, active }: { name: string; active: boolean }) => {
  const c = active ? G.gold : G.inactive;
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "Home") return <svg {...props}><path d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></svg>;
  if (name === "Markets") return <svg {...props}><path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h6v6"/></svg>;
  if (name === "Transactions") return <svg {...props}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>;
  return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
};

function AuthShell({ title, children, onBack }: { title: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div style={{ ...s.scroll, position: "relative" }}>
      <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 400, height: 300, background: `radial-gradient(circle, ${G.gold}22 0%, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ padding: "20px 22px 100px", position: "relative" }}>
        <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 20, background: G.card, border: `1px solid ${G.border}`, color: G.text, cursor: "pointer", fontSize: 18 }}>←</button>
        <h1 style={{ ...s.serif, fontSize: 32, margin: "28px 0 8px", fontWeight: 600 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Landing({ nav }: { nav: (s: string) => void }) {
  return (
    <div style={s.scroll}>
      <div style={{ position: "relative", padding: "32px 22px 24px" }}>
        <div style={{ position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)", width: 500, height: 400, background: `radial-gradient(circle, ${G.gold}33 0%, transparent 60%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: G.card, border: `1px solid ${G.border}`, borderRadius: 20, padding: "6px 12px", fontSize: 11, letterSpacing: 0.6, color: G.muted }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: G.gold, animation: "pulse 1.5s infinite" }} />
            TRUSTED BY 180K+ INVESTORS
          </div>
          <h1 style={{ ...s.serif, fontSize: 42, lineHeight: 1.1, margin: "20px 0 14px", fontWeight: 600 }}>
            Grow your <em style={{ color: G.gold, fontStyle: "italic" }}>wealth</em> with clarity.
          </h1>
          <p style={{ color: G.muted, fontSize: 15, lineHeight: 1.5, margin: 0 }}>The investment platform built for serious investors who value precision, security, and beautiful design.</p>
        </div>
      </div>

      <div style={{ overflowX: "auto", padding: "8px 22px 20px", display: "flex", gap: 10, scrollbarWidth: "none" }}>
        {TICKERS.map(t => (
          <div key={t.sym} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 100, flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.sym}</div>
            <div style={{ fontSize: 12, color: t.up ? G.green : G.red, marginTop: 2 }}>{t.chg}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={s.btnGold} onClick={() => nav("register")}>Create free account</button>
        <button style={s.btnGhost} onClick={() => nav("login")}>Sign in to Aurum</button>
        <button style={s.btnDark} onClick={() => nav("dashboard")}><GoogleIcon /> Continue with Google</button>
        <p style={{ fontSize: 11, color: G.muted, textAlign: "center", margin: "6px 0 0", lineHeight: 1.5 }}>By continuing, you agree to our Terms and Privacy Policy.</p>
      </div>

      <div style={{ display: "flex", margin: "32px 22px 0", border: `1px solid ${G.border}`, borderRadius: 14, background: G.card }}>
        {[{ n: "$2.4B+", l: "Assets tracked" }, { n: "180k+", l: "Members" }, { n: "4.9★", l: "Rated" }].map((x, i) => (
          <div key={i} style={{ flex: 1, padding: "16px 8px", textAlign: "center", borderLeft: i ? `1px solid ${G.border}` : "none" }}>
            <div style={{ ...s.serif, fontSize: 20, color: G.gold, fontWeight: 600 }}>{x.n}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "40px 22px 0" }}>
        <div style={{ fontSize: 11, color: G.gold, letterSpacing: 1.5, fontWeight: 600 }}>WHY AURUM</div>
        <h2 style={{ ...s.serif, fontSize: 28, margin: "8px 0 24px", fontWeight: 600 }}>Built different. Built for you.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + "1A", border: `1px solid ${f.color}33`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.t}</div>
                <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.5 }}>{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "40px 22px 0" }}>
        <div style={{ fontSize: 11, color: G.gold, letterSpacing: 1.5, fontWeight: 600 }}>TESTIMONIALS</div>
        <h2 style={{ ...s.serif, fontSize: 28, margin: "8px 0 20px", fontWeight: 600 }}>Loved by investors.</h2>
        {[{ q: "Aurum changed how I think about investing. The interface is gorgeous and the insights are spot on.", n: "Sarah Chen", a: "Portfolio up 34% YoY", i: "SC" }, { q: "Finally, a platform that respects my time and intelligence. Every detail feels considered.", n: "Marcus Webb", a: "Joined 2 years ago", i: "MW" }].map((t, i) => (
          <div key={i} style={{ ...s.card, marginBottom: 12 }}>
            <p style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.6, margin: "0 0 14px", color: G.text }}>"{t.q}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 19, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{t.i}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.n}</div>
                <div style={{ fontSize: 12, color: G.gold }}>{t.a}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: "40px 22px 60px", background: G.card, border: `1px solid ${G.gold}55`, borderRadius: 18, padding: 24, textAlign: "center" }}>
        <h2 style={{ ...s.serif, fontSize: 26, margin: "0 0 10px", fontWeight: 600 }}>Ready to begin?</h2>
        <p style={{ color: G.muted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>Join thousands of investors building wealth with clarity.</p>
        <button style={s.btnGold} onClick={() => nav("register")}>Open your free account</button>
      </div>
    </div>
  );
}

function Login({ nav, toast }: { nav: (s: string) => void; toast: (m: string) => void }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [show, setShow] = useState(false), [load, setLoad] = useState(false);
  const submit = () => {
    if (!email || !pw) { toast("Please fill all fields"); return; }
    setLoad(true);
    setTimeout(() => { setLoad(false); nav("dashboard"); }, 1200);
  };
  return (
    <AuthShell title="Welcome back." onBack={() => nav("landing")}>
      <p style={{ color: G.muted, fontSize: 14, margin: "0 0 24px" }}>Sign in to continue building your wealth.</p>
      <button style={s.btnDark} onClick={() => nav("dashboard")}><GoogleIcon /> Continue with Google</button>
      <div style={s.divider}><div style={s.hLine} />or sign in with email<div style={s.hLine} /></div>
      <label style={s.label}>EMAIL</label>
      <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      <label style={{ ...s.label, marginTop: 14 }}>PASSWORD</label>
      <div style={{ position: "relative" }}>
        <input style={s.input} type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
        <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: G.muted, cursor: "pointer", fontSize: 12 }}>{show ? "HIDE" : "SHOW"}</button>
      </div>
      <div style={{ textAlign: "right", margin: "10px 0 20px" }}>
        <button onClick={() => nav("forgot")} style={{ background: "none", border: "none", color: G.gold, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Forgot password?</button>
      </div>
      <button style={s.btnGold} onClick={submit} disabled={load}>{load ? "Signing in…" : "Sign in"}</button>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: G.muted }}>
        New to Aurum? <button onClick={() => nav("register")} style={{ background: "none", border: "none", color: G.gold, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Create account</button>
      </p>
    </AuthShell>
  );
}

function Register({ nav, toast }: { nav: (s: string) => void; toast: (m: string) => void }) {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false), [show2, setShow2] = useState(false), [load, setLoad] = useState(false);
  const [open, setOpen] = useState(false), [search, setSearch] = useState("");
  const strength = pw.length === 0 ? 0 : pw.length < 6 ? 1 : pw.length < 10 ? 2 : 3;
  const strLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strColor = ["", G.red, G.amber, G.green][strength];
  const match = pw && pw2 ? pw === pw2 : null;
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const submit = () => {
    if (!name || !email || !phone || !pw || !pw2) { toast("Please fill all fields"); return; }
    if (pw !== pw2) { toast("Passwords don't match"); return; }
    setLoad(true);
    setTimeout(() => { setLoad(false); nav("dashboard"); }, 1400);
  };
  return (
    <AuthShell title="Create account." onBack={() => nav("landing")}>
      <p style={{ color: G.muted, fontSize: 14, margin: "0 0 24px" }}>Start your journey to financial clarity.</p>
      <button style={s.btnDark} onClick={() => nav("dashboard")}><GoogleIcon /> Continue with Google</button>
      <div style={s.divider}><div style={s.hLine} />or with email<div style={s.hLine} /></div>

      <label style={s.label}>FULL NAME</label>
      <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />

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
      {pw && (
        <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
          {[1, 2, 3].map(i => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strColor : G.border }} />))}
          <span style={{ fontSize: 11, color: strColor, marginLeft: 8, fontWeight: 600 }}>{strLabel}</span>
        </div>
      )}

      <label style={{ ...s.label, marginTop: 14 }}>CONFIRM PASSWORD</label>
      <div style={{ position: "relative" }}>
        <input style={{ ...s.input, borderColor: match === false ? G.red : match === true ? G.green : G.border }} type={show2 ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" />
        <button onClick={() => setShow2(!show2)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: G.muted, cursor: "pointer", fontSize: 12 }}>{show2 ? "HIDE" : "SHOW"}</button>
      </div>
      {match !== null && <div style={{ fontSize: 12, color: match ? G.green : G.red, marginTop: 6 }}>{match ? "✓ Passwords match" : "✗ Passwords don't match"}</div>}

      <button style={{ ...s.btnGold, marginTop: 22 }} onClick={submit} disabled={load}>{load ? "Creating account…" : "Create account"}</button>
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: G.muted }}>
        Already have an account? <button onClick={() => nav("login")} style={{ background: "none", border: "none", color: G.gold, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button>
      </p>
    </AuthShell>
  );
}

function Forgot({ nav, toast }: { nav: (s: string) => void; toast: (m: string) => void }) {
  const [email, setEmail] = useState(""), [sent, setSent] = useState(false), [cd, setCd] = useState(0);
  useEffect(() => { if (cd <= 0) return; const t = setInterval(() => setCd(c => c - 1), 1000); return () => clearInterval(t); }, [cd]);
  const send = () => { if (!email) { toast("Enter your email"); return; } setSent(true); setCd(30); };
  const resend = () => { if (cd > 0) return; setCd(30); toast("Email resent"); };
  return (
    <AuthShell title={sent ? "Check your inbox." : "Reset your password."} onBack={() => sent ? setSent(false) : nav("login")}>
      {!sent ? (
        <>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: G.gold + "1A", border: `1px solid ${G.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>✉</div>
          <p style={{ color: G.muted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>Enter your email and we'll send you a link to reset your password.</p>
          <label style={s.label}>EMAIL</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <button style={{ ...s.btnGold, marginTop: 22 }} onClick={send}>Send reset link</button>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: G.muted }}>
            Remember it? <button onClick={() => nav("login")} style={{ background: "none", border: "none", color: G.gold, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button>
          </p>
        </>
      ) : (
        <>
          <div style={{ position: "relative", width: 80, height: 80, marginBottom: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: G.gold + "1A", border: `1px solid ${G.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✉</div>
            <div style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, background: G.green, color: "#0D0D0F", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>✓</div>
          </div>
          <p style={{ color: G.muted, fontSize: 14, margin: "0 0 8px", lineHeight: 1.5 }}>We sent a password reset link to</p>
          <p style={{ color: G.gold, fontSize: 15, fontWeight: 600, margin: "0 0 20px" }}>{email}</p>
          <div style={{ ...s.card, marginBottom: 18 }}>
            {[["1", "Open the email"], ["2", "Tap the reset link"], ["3", "Choose a new password"]].map(([n, t]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: G.gold + "22", color: G.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{n}</div>
                <span style={{ fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
          <button onClick={resend} disabled={cd > 0} style={{ ...s.btnGhost, marginBottom: 10, opacity: cd > 0 ? 0.5 : 1 }}>{cd > 0 ? `Resend in ${cd}s` : "Resend email"}</button>
          <button style={s.btnGold} onClick={() => nav("login")}>Back to sign in</button>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: G.muted }}>
            Wrong email? <button onClick={() => setSent(false)} style={{ background: "none", border: "none", color: G.gold, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Change it</button>
          </p>
        </>
      )}
    </AuthShell>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ ...s.card, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: G.gold + "1A", border: `1px solid ${G.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 14 }}>{icon}</div>
      <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.5, maxWidth: 260 }}>{sub}</div>
    </div>
  );
}

function HomeTab() {
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 13, color: G.muted }}>Good morning</div>
          <div style={{ ...s.serif, fontSize: 22, fontWeight: 600 }}>Jane Doe</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>JD</div>
      </div>
      <div style={{ ...s.card, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, letterSpacing: 0.5 }}>BALANCE</div>
        <div style={{ ...s.serif, fontSize: 34, fontWeight: 600, margin: "8px 0 4px" }}>$0.00</div>
        <div style={{ fontSize: 12, color: G.muted }}>Fund your account to get started</div>
      </div>
      <EmptyState icon="✦" title="Welcome to Aurum" sub="Your personalized insights will appear here once you start investing." />
    </div>
  );
}

function PortfolioTab() {
  const segs = [{ l: "Stocks", v: 38, c: G.teal }, { l: "Crypto", v: 32, c: G.gold }, { l: "ETFs", v: 18, c: G.blue }, { l: "Other", v: 12, c: "#5A5855" }];
  const C = 2 * Math.PI * 60;
  let off = 0;
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 20px" }}>Portfolio</h1>
      <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
          <svg width={150} height={150} viewBox="0 0 150 150">
            {segs.map((sg, i) => {
              const dash = (sg.v / 100) * C;
              const el = <circle key={i} cx={75} cy={75} r={60} fill="none" stroke={sg.c} strokeWidth={16} strokeDasharray={`${dash} ${C}`} strokeDashoffset={-off} transform="rotate(-90 75 75)" />;
              off += dash;
              return el;
            })}
          </svg>
          <div style={{ position: "absolute", top: 0, left: 0, width: 150, height: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 11, color: G.muted }}>Portfolio</div>
            <div style={{ ...s.serif, fontSize: 18, fontWeight: 600 }}>$13,834</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {segs.map(sg => (
            <div key={sg.l} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: sg.c }} />
              <div style={{ flex: 1, fontSize: 13 }}>{sg.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{sg.v}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>Holdings</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {HOLDINGS.map(h => (
          <div key={h.sym} style={{ ...s.card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: h.color + "22", color: h.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{h.sym.slice(0, 3)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{h.shares}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.value}</div>
              <div style={{ fontSize: 11, color: h.up ? G.green : G.red }}>{h.pl}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketsTab() {
  const idx = [{ n: "S&P 500", v: "4,783.45", c: "+0.8%", up: true }, { n: "NASDAQ", v: "15,012", c: "+1.2%", up: true }, { n: "BTC", v: "$43,210", c: "+2.4%", up: true }, { n: "Gold", v: "$2,034", c: "-0.3%", up: false }, { n: "Oil", v: "$78.42", c: "+1.1%", up: true }];
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 16px" }}>Markets</h1>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <input style={{ ...s.input, paddingLeft: 40 }} placeholder="Search assets..." />
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", marginBottom: 20, scrollbarWidth: "none" }}>
        {idx.map(i => (
          <div key={i.n} style={{ ...s.card, padding: 12, minWidth: 110, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: G.muted }}>{i.n}</div>
            <div style={{ fontSize: 14, fontWeight: 600, margin: "4px 0" }}>{i.v}</div>
            <div style={{ fontSize: 11, color: i.up ? G.green : G.red }}>{i.c}</div>
          </div>
        ))}
      </div>
      <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>All assets</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MOVERS.concat(MOVERS).map((m, i) => (
          <div key={i} style={{ ...s.card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: m.color + "22", color: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{m.sym.slice(0, 3)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.sym}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{m.name}</div>
            </div>
            <Sparkline data={m.data} color={m.up ? G.green : G.red} w={50} h={24} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.price}</div>
              <div style={{ fontSize: 11, color: m.up ? G.green : G.red }}>{m.chg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTab() {
  const [f, setF] = useState("All");
  const filt = ["All", "Buy", "Sell", "Dividend"];
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <h1 style={{ ...s.serif, fontSize: 26, fontWeight: 600, margin: "0 0 16px" }}>Activity</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {filt.map(x => (
          <button key={x} onClick={() => setF(x)} style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${f === x ? G.gold : G.border}`, background: f === x ? G.gold : "transparent", color: f === x ? "#1a1208" : G.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{x}</button>
        ))}
      </div>
      {TXNS.map(g => (
        <div key={g.day} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: 0.6, marginBottom: 10 }}>{g.day.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.items.map((t, i) => {
              const cfg = t.type === "buy" ? { icon: "↓", c: G.green } : t.type === "sell" ? { icon: "↑", c: G.red } : { icon: "✦", c: G.gold };
              const amtColor = t.amt.startsWith("+") ? G.green : G.red;
              return (
                <div key={i} style={{ ...s.card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 19, background: cfg.c + "22", color: cfg.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{t.type} {t.sym}</div>
                    <div style={{ fontSize: 11, color: G.muted }}>{t.time}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: amtColor }}>{t.amt}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({ nav }: { nav: (s: string) => void }) {
  const [notif, setNotif] = useState(true), [dark, setDark] = useState(true);
  const Toggle = ({ v, on }: { v: boolean; on: () => void }) => (
    <button onClick={on} style={{ width: 40, height: 22, borderRadius: 11, background: v ? G.gold : G.border, border: "none", position: "relative", cursor: "pointer", padding: 0 }}>
      <div style={{ position: "absolute", top: 2, left: v ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: G.text, transition: "left 0.2s" }} />
    </button>
  );
  const items: { l: string; r: React.ReactNode; danger?: boolean; act?: () => void }[] = [
    { l: "Notifications", r: <Toggle v={notif} on={() => setNotif(!notif)} /> },
    { l: "Dark Mode", r: <Toggle v={dark} on={() => setDark(!dark)} /> },
    { l: "Security", r: <span style={{ color: G.muted }}>›</span> },
    { l: "Linked Accounts", r: <span style={{ color: G.muted }}>›</span> },
    { l: "Currency", r: <span style={{ color: G.muted, fontSize: 13 }}>USD ›</span> },
    { l: "Help & Support", r: <span style={{ color: G.muted }}>›</span> },
    { l: "Privacy Policy", r: <span style={{ color: G.muted }}>›</span> },
    { l: "Log Out", r: <span style={{ color: G.red }}>›</span>, danger: true, act: () => nav("landing") },
  ];
  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{ width: 78, height: 78, borderRadius: 39, background: G.gold, color: "#1a1208", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26 }}>JD</div>
        <div style={{ ...s.serif, fontSize: 22, fontWeight: 600, marginTop: 12 }}>Jane Doe</div>
        <div style={{ display: "inline-block", background: G.gold + "22", color: G.gold, padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, marginTop: 6 }}>★ PREMIUM</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ l: "Invested", v: "$13.5K" }, { l: "Returns", v: "+18%" }, { l: "Win rate", v: "72%" }].map(x => (
          <div key={x.l} style={{ ...s.card, flex: 1, padding: 14, textAlign: "center" }}>
            <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, color: G.gold }}>{x.v}</div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, overflow: "hidden" }}>
        {items.map((it, i) => (
          <div key={it.l} onClick={it.act} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: i ? `1px solid ${G.border}` : "none", cursor: it.act ? "pointer" : "default" }}>
            <span style={{ fontSize: 14, color: it.danger ? G.red : G.text, fontWeight: it.danger ? 600 : 400 }}>{it.l}</span>
            {it.r}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ nav }: { nav: (s: string) => void }) {
  const [tab, setTab] = useState("Home");
  const tabs = ["Home", "Portfolio", "Markets", "Activity", "Profile"];
  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <div style={{ height: "100vh", overflowY: "auto", paddingBottom: 80 }}>
        {tab === "Home" && <HomeTab />}
        {tab === "Portfolio" && <PortfolioTab />}
        {tab === "Markets" && <MarketsTab />}
        {tab === "Activity" && <ActivityTab />}
        {tab === "Profile" && <ProfileTab nav={nav} />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, background: G.card, borderTop: `1px solid ${G.border}`, display: "flex", padding: "8px 0 12px", zIndex: 100 }}>
        {tabs.map(t => {
          const active = t === tab;
          return (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", color: active ? G.gold : G.inactive, fontFamily: "inherit", position: "relative", padding: "6px 0" }}>
              {active && <div style={{ position: "absolute", top: 0, width: 24, height: 2, background: G.gold, borderRadius: 1 }} />}
              <NavIcon name={t} active={active} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [tMsg, setTMsg] = useState<string | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} body{margin:0;background:${G.bg}} *::-webkit-scrollbar{display:none}`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(link); document.head.removeChild(style); };
  }, []);

  const nav = (sc: string) => setScreen(sc);
  const toast = (msg: string) => {
    setTMsg(msg);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setTMsg(null), 2500);
  };

  return (
    <div style={s.app}>
      <div style={s.phone}>
        {screen === "landing" && <Landing nav={nav} />}
        {screen === "login" && <Login nav={nav} toast={toast} />}
        {screen === "register" && <Register nav={nav} toast={toast} />}
        {screen === "forgot" && <Forgot nav={nav} toast={toast} />}
        {screen === "dashboard" && <Dashboard nav={nav} />}
        <Toast msg={tMsg} />
      </div>
    </div>
  );
}
