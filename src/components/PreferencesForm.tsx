"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { MOCK_PREFERENCES } from "@/lib/mockData";

export default function PreferencesForm({ demo }: { demo: boolean }) {
  const [niche, setNiche] = useState(demo ? MOCK_PREFERENCES.niche : "");
  const [keywords, setKeywords] = useState<string[]>(demo ? MOCK_PREFERENCES.keywords : []);
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (demo) return;
    api<{ preferences: { niche: string | null; keywords: string[] } }>("/api/preferences")
      .then(({ preferences }) => {
        setNiche(preferences.niche ?? "");
        setKeywords(preferences.keywords);
      })
      .catch(() => {});
  }, [demo]);

  function addKeyword() {
    const kw = keywordInput.trim();
    if (!kw || keywords.includes(kw) || keywords.length >= 20) return;
    setKeywords((prev) => [...prev, kw]);
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  async function handleSave() {
    if (demo) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return;
    }
    setSaving(true);
    try {
      await api("/api/preferences", { method: "PUT", body: JSON.stringify({ niche, keywords }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-1 font-semibold">Niche &amp; keyword alerts</div>
      <div className="mb-4 text-sm text-neutral-500">
        Get notified when a trending topic matches your niche or keywords.
      </div>

      <label className="mb-1 block text-xs text-neutral-500">Niche</label>
      <input
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        placeholder="e.g. Indie SaaS / dev tools"
        className="mb-4 w-full rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm outline-none focus:border-neutral-500"
      />

      <label className="mb-1 block text-xs text-neutral-500">Keywords</label>
      <input
        value={keywordInput}
        onChange={(e) => setKeywordInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addKeyword();
          }
        }}
        placeholder="Add a keyword and press Enter"
        className="mb-2 w-full rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm outline-none focus:border-neutral-500"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <span key={kw} className="flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1 text-xs">
            {kw}
            <button onClick={() => removeKeyword(kw)} className="text-neutral-500 hover:text-white">
              ×
            </button>
          </span>
        ))}
        {keywords.length === 0 && <span className="text-xs text-neutral-600">No keywords yet.</span>}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save preferences"}
      </button>
    </section>
  );
}
