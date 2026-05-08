import { useEffect, useState } from "react";
import { useAurum } from "../AurumContext";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  deadline_at: string | null;
  created_at: string;
};

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { expired: true, text: "Expired" };
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const text = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  return { expired: false, text };
}

function NewsCard({ post }: { post: Post }) {
  const { G, s } = useAurum();
  const cd = useCountdown(post.deadline_at);
  const [open, setOpen] = useState(false);
  const SHORT = 120;
  const isLong = (post.body || "").length > SHORT;
  const preview = isLong ? post.body.slice(0, SHORT).trimEnd() + "…" : post.body;
  return (
    <div style={{ ...s.card, padding: 0, overflow: "hidden", marginBottom: 12 }}>
      {post.image_url && (
        <img src={post.image_url} alt={post.title} style={{ width: "100%", height: open ? 180 : 100, objectFit: "cover", display: "block", transition: "height 0.2s" }} />
      )}
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ ...s.serif, fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{post.title}</div>
          {cd && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, whiteSpace: "nowrap",
              background: cd.expired ? G.red + "22" : G.gold + "22",
              color: cd.expired ? G.red : G.gold,
              border: `1px solid ${cd.expired ? G.red + "55" : G.gold + "55"}`
            }}>{cd.expired ? "EXPIRED" : `⏱ ${cd.text}`}</span>
          )}
        </div>
        {post.body && (
          <p style={{ fontSize: 12, color: G.muted, lineHeight: 1.5, margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{open ? post.body : preview}</p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div style={{ fontSize: 10, color: G.inactive }}>{new Date(post.created_at).toLocaleDateString()}</div>
          {isLong && (
            <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", color: G.gold, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              {open ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewsFeed() {
  const { G, s } = useAurum();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from("news_posts").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(20).then(({ data }) => {
      setPosts((data ?? []) as Post[]); setLoaded(true);
    });
  }, []);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ ...s.serif, fontSize: 18, fontWeight: 600, marginBottom: 10 }}>News & updates</div>
      {loaded && posts.length === 0 ? (
        <div style={{ ...s.card, padding: 18, textAlign: "center", color: G.muted, fontSize: 13 }}>
          No announcements yet — check back soon.
        </div>
      ) : posts.map(p => <NewsCard key={p.id} post={p} />)}
    </div>
  );
}