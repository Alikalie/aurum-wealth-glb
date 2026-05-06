import { useEffect, useState } from "react";
import { AurumProvider, useAurum } from "@/aurum/AurumContext";
import { Toast } from "@/aurum/ui";
import { Landing, Login, Register, Forgot } from "@/aurum/screens/Auth";
import { Dashboard } from "@/aurum/screens/Dashboard";
import { PaymentMethods } from "@/aurum/screens/PaymentMethods";
import { Deposit } from "@/aurum/screens/Deposit";
import { DepositsHistory } from "@/aurum/screens/DepositsHistory";
import { Withdraw } from "@/aurum/screens/Withdraw";
import { Sell } from "@/aurum/screens/Sell";
import { Support, Privacy, Currency } from "@/aurum/screens/Content";
import { TransactionDetails } from "@/aurum/screens/TransactionDetails";
import { TransactionsHistory } from "@/aurum/screens/TransactionsHistory";
import { MyProducts } from "@/aurum/screens/MyProducts";
import { ProductDetails } from "@/aurum/screens/ProductDetails";
import { Affiliate } from "@/aurum/screens/Affiliate";
import { ServiceGate } from "@/aurum/ServiceGate";

function Shell() {
  const { s, G, user, loading } = useAurum();
  const [screen, setScreen] = useState("landing");
  const [txId, setTxId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  // Capture ?ref= referral code from URL and stash for use after signup
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) {
      localStorage.setItem("aurum-ref-code", ref.toUpperCase());
    }
  }, []);

  // Inject fonts + global style once; refresh body bg when palette changes
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    document.body.style.background = G.bg;
    document.body.style.margin = "0";
  }, [G.bg]);

  // Auto-route to dashboard on login, landing on logout
  useEffect(() => {
    if (loading) return;
    if (user && (screen === "landing" || screen === "login" || screen === "register" || screen === "forgot")) {
      setScreen("dashboard");
    }
    if (!user && screen !== "landing" && screen !== "login" && screen !== "register" && screen !== "forgot") {
      setScreen("landing");
    }
  }, [user, loading, screen]);

  const nav = (sc: string, payload?: any) => {
    if (sc === "tx-details" && payload) setTxId(payload);
    if (sc === "product-details" && payload) setProductId(payload);
    setScreen(sc);
  };

  return (
    <ServiceGate>
    <div style={s.app}>
      <div style={s.phone}>
        {screen === "landing" && <Landing nav={nav} />}
        {screen === "login" && <Login nav={nav} />}
        {screen === "register" && <Register nav={nav} />}
        {screen === "forgot" && <Forgot nav={nav} />}
        {screen === "dashboard" && <Dashboard nav={nav} navTo={nav} />}
        {screen === "payment-methods" && <PaymentMethods nav={nav} />}
        {screen === "deposit" && <Deposit nav={nav} />}
        {screen === "deposits-history" && <DepositsHistory nav={nav} />}
        {screen === "withdraw" && <Withdraw nav={nav} />}
        {screen === "sell" && <Sell nav={nav} />}
        {screen === "my-products" && <MyProducts nav={nav} />}
        {screen === "product-details" && <ProductDetails nav={nav} productId={productId} />}
        {screen === "tx-details" && <TransactionDetails nav={nav} txId={txId} />}
        {screen === "transactions-history" && <TransactionsHistory nav={nav} />}
        {screen === "affiliate" && <Affiliate nav={nav} />}
        {screen === "support" && <Support nav={nav} />}
        {screen === "privacy" && <Privacy nav={nav} />}
        {screen === "currency" && <Currency nav={nav} />}
        <Toast />
      </div>
    </div>
    </ServiceGate>
  );
}

export default function App() {
  return (
    <AurumProvider>
      <Shell />
    </AurumProvider>
  );
}