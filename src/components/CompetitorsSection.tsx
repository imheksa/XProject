"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_COMPETITORS } from "@/lib/mockData";

interface Competitor {
  id: string;
  username: string;
  followersCount: number;
  followingCount: number;
  postsLast30d: number;
  vsYourFollowers: number;
  vsYourPosts30d: number;
}

const MAX_COMPETITORS = 3;

export default function CompetitorsSection({ demo }: { demo: boolean }) {
  const [competitors, setCompetitors] = useState<Competitor[]>(demo ? MOCK_COMPETITORS : []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(!demo);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demo) return;
    api<{ competitors: Competitor[] }>("/api/competitors")
      .then(({ competitors }) => setCompetitors(competitors))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [demo]);

  async function handleAdd() {
    const username = input.trim();
    if (!username) return;
    setError(null);

    if (demo) {
      if (competitors.length >= MAX_COMPETITORS) {
        setError(`You can track up to ${MAX_COMPETITORS} competitors at a time.`);
        return;
      }
      setCompetitors((prev) => [
        ...prev,
        {
          id: `demo-competitor-${Date.now()}`,
          username: username.replace(/^@/, ""),
          followersCount: Math.round(800 + Math.random() * 3000),
          followingCount: Math.round(200 + Math.random() * 800),
          postsLast30d: Math.round(5 + Math.random() * 40),
          vsYourFollowers: 0,
          vsYourPosts30d: 0,
        },
      ]);
      setInput("");
      return;
    }

    setAdding(true);
    try {
      const { competitors } = await api<{ competitors: Competitor[] }>("/api/competitors", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setCompetitors(competitors);
      setInput("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    if (demo) {
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    try {
      await api(`/api/competitors/${id}`, { method: "DELETE" });
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-1 font-semibold">Compare with a competitor</div>
      <div className="mb-4 text-sm text-neutral-500">Track up to {MAX_COMPETITORS} accounts and see how you stack up.</div>

      {error && (
        <div className="mb-3 rounded-lg border border-[#d03b3b]/40 bg-[#d03b3b]/10 p-2 text-xs text-[#e66767]">{error}</div>
      )}

      {competitors.length < MAX_COMPETITORS && (
        <div className="mb-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="@username"
            className="flex-1 rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      )}

      {loading && <div className="text-sm text-neutral-500">Loading…</div>}

      <div className="flex flex-col gap-3">
        {competitors.map((c) => (
          <div key={c.id} className="rounded-lg border border-neutral-800 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">@{c.username}</div>
              <button onClick={() => handleRemove(c.id)} className="text-xs text-neutral-500 hover:text-white">
                Remove
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <CompareStat label="Followers" value={c.followersCount} diff={c.vsYourFollowers} />
              <CompareStat label="Following" value={c.followingCount} />
              <CompareStat label="Posts (30d)" value={c.postsLast30d} diffNeutral={c.vsYourPosts30d} />
            </div>
          </div>
        ))}
        {!loading && competitors.length === 0 && (
          <div className="text-sm text-neutral-500">No competitors tracked yet.</div>
        )}
      </div>
    </section>
  );
}

function CompareStat({
  label,
  value,
  diff,
  diffNeutral,
}: {
  label: string;
  value: number;
  diff?: number;
  diffNeutral?: number;
}) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-mono text-base font-bold tabular-nums">{value.toLocaleString()}</div>
      {diff !== undefined && (
        <div className={`text-xs ${diff > 0 ? "text-[#d03b3b]" : diff < 0 ? "text-[#0ca30c]" : "text-neutral-500"}`}>
          {diff > 0 ? `+${diff} vs you` : diff < 0 ? `${diff} vs you` : "even with you"}
        </div>
      )}
      {diffNeutral !== undefined && (
        <div className="text-xs text-neutral-500">
          {diffNeutral > 0 ? `+${diffNeutral}` : diffNeutral} vs you
        </div>
      )}
    </div>
  );
}
