"use client";

import React, { useState } from "react";

const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { id: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  {
    id: "custom",
    label: "Custom Model",
    placeholder: "https://your-api.com",
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const handleSave = async (provider: string) => {
    setSaving(provider);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, keyValue: keys[provider] }),
      });
      if (res.ok) {
        setSaved(provider);
        setTimeout(() => setSaved(null), 2000);
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">
          Manage your API keys and preferences
        </p>

        {/* BYOK Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            🔑 Bring Your Own API Key (BYOK)
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Add your own AI provider keys. When set, all AI features use your
            key (your cost = $0 from us).
          </p>
          <div className="space-y-5">
            {AI_PROVIDERS.map((p) => (
              <div key={p.id}>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {p.label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={p.placeholder}
                    value={keys[p.id] ?? ""}
                    onChange={(e) =>
                      setKeys((k) => ({ ...k, [p.id]: e.target.value }))
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                  />
                  <button
                    onClick={() => handleSave(p.id)}
                    disabled={!keys[p.id] || saving === p.id}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saved === p.id ? "✓ Saved" : saving === p.id ? "…" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile section placeholder */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">👤 Profile</h2>
          <p className="text-gray-400 text-sm">
            Profile management coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
