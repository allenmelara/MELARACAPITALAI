"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { Mission } from "@/lib/missions";

const STORAGE_KEY = "melara:dismissed-missions";

export default function MissionsList({ missions }: { missions: Mission[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setDismissed(JSON.parse(stored));
    } catch {
      // Ignore malformed localStorage — missions just won't stay dismissed.
    }
  }, []);

  function dismiss(id: string) {
    setDismissed((current) => {
      const next = [...current, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const visible = missions.filter((m) => !dismissed.includes(m.id));
  if (visible.length === 0) return null;

  return (
    <section className="dash-section missions-list">
      <h2>Suggestions for you</h2>
      <ul className="dash-list">
        {visible.map((m) => (
          <li key={m.id} className="mission-row">
            <Link href={m.ctaHref} className="mission-row-link">
              <span className="dash-list-title">{m.title}</span>
              <span className="dash-list-meta">{m.description}</span>
            </Link>
            <button className="mission-dismiss" onClick={() => dismiss(m.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
