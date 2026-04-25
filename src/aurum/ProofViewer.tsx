import { useEffect, useState } from "react";

type Props = {
  url: string;
  filename?: string;
  onClose: () => void;
  G: any;
};

/** Modal viewer for payment proofs: zoom, rotate, download with proper filename. */
export function ProofViewer({ url, filename, onClose, G }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Derive a friendly filename from the URL if not provided
  const decoded = (() => {
    try { return decodeURIComponent(url.split("/").pop() || "proof"); }
    catch { return url.split("/").pop() || "proof"; }
  })();
  const name = filename || decoded;
  const ext = (name.split(".").pop() || "").toLowerCase();
  const isPdf = ext === "pdf";

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      const obj = URL.createObjectURL(blob);
      a.href = obj;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  const btn = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600 as const,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
          background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isPdf ? "📄" : "🖼️"} {name}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>Payment proof</div>
        </div>
        {!isPdf && (
          <>
            <button style={btn} onClick={e => { e.stopPropagation(); setZoom(z => Math.max(0.25, z - 0.25)); }}>−</button>
            <span style={{ color: "#fff", fontSize: 12, minWidth: 44, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button style={btn} onClick={e => { e.stopPropagation(); setZoom(z => Math.min(5, z + 0.25)); }}>+</button>
            <button style={btn} onClick={e => { e.stopPropagation(); setZoom(1); setRot(0); }}>Reset</button>
            <button style={btn} onClick={e => { e.stopPropagation(); setRot(r => (r + 90) % 360); }}>↻ Rotate</button>
          </>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ ...btn, textDecoration: "none", display: "inline-block" }}
        >
          Open in tab
        </a>
        <button
          style={{ ...btn, background: G?.gold ?? "#C89633", color: "#1a1208", border: "none" }}
          onClick={e => { e.stopPropagation(); download(); }}
          disabled={downloading}
        >
          {downloading ? "Downloading…" : "↓ Download"}
        </button>
        <button style={btn} onClick={e => { e.stopPropagation(); onClose(); }}>✕</button>
      </div>

      {/* Content area */}
      <div
        onClick={onClose}
        style={{
          flex: 1, overflow: "auto", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}
      >
        {isPdf ? (
          <iframe
            src={url}
            title={name}
            onClick={e => e.stopPropagation()}
            style={{ width: "min(900px, 95%)", height: "85vh", border: "none", borderRadius: 8, background: "#fff" }}
          />
        ) : (
          <img
            src={url}
            alt={name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: zoom <= 1 ? "95%" : "none",
              maxHeight: zoom <= 1 ? "85vh" : "none",
              transform: `scale(${zoom}) rotate(${rot}deg)`,
              transformOrigin: "center center",
              transition: "transform 0.15s",
              userSelect: "none",
              cursor: zoom > 1 ? "move" : "default",
              borderRadius: 6,
              background: "#222",
            }}
          />
        )}
      </div>
    </div>
  );
}
