"use client";

import { useMemo, useState } from "react";
import countryMeta from "@/data/countryMeta.json";
import type { Continent, RegionSelection } from "@/types/destination";

const CONTINENTS: { value: Continent; label: string }[] = [
  { value: "Asia", label: "아시아" },
  { value: "Europe", label: "유럽" },
  { value: "Africa", label: "아프리카" },
  { value: "Oceania", label: "오세아니아" },
  { value: "Americas", label: "아메리카" },
];

interface Props {
  value: RegionSelection | null;
  onChange: (selection: RegionSelection) => void;
}

export function RegionPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return countryMeta.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <p className="mb-2 text-sm text-neutral-400">대륙으로 선택</p>
        <div className="grid grid-cols-3 gap-2">
          {CONTINENTS.map((c) => {
            const selected = value?.type === "continent" && value.continent === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ type: "continent", continent: c.value })}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                  selected
                    ? "border-orange-500 bg-orange-500/20 text-orange-300"
                    : "border-neutral-700 bg-neutral-900 text-neutral-200"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-neutral-400">또는 국가로 선택</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="국가명 검색 (영문, 예: Japan)"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base outline-none focus:border-neutral-400"
        />
        {matches.length > 0 && (
          <ul className="mt-2 divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800">
            {matches.map((c) => (
              <li key={c.iso3}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ type: "country", iso3: c.iso3, name: c.name });
                    setQuery(c.name);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-800"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {value?.type === "country" && (
          <p className="mt-2 text-sm text-orange-300">선택됨: {value.name}</p>
        )}
      </div>
    </div>
  );
}
