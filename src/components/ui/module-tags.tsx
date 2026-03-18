"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { CAPABILITY_MODULES } from "@/types";

/**
 * Renders capability module tags capped to a single row.
 * Overflow tags are collapsed into a "+N" badge.
 * Uses useLayoutEffect to measure before the browser paints — no flicker.
 */
export function ModuleTags({ ids }: { ids: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxVisible, setMaxVisible] = useState<number | null>(null);

  // Filter to only valid module IDs up front
  const validIds = ids.filter((id) => CAPABILITY_MODULES.some((m) => m.id === id));

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || validIds.length === 0) return;

    const tagEls = Array.from(el.querySelectorAll<HTMLElement>("[data-tag]"));
    if (tagEls.length === 0) return;

    // All tags that share the same offsetTop as the first tag are on row 1
    const rowTop = tagEls[0].offsetTop;
    const firstRowCount = tagEls.filter((t) => t.offsetTop === rowTop).length;

    if (firstRowCount < validIds.length) {
      // Need a "+N" badge — give it the slot of the last visible tag
      setMaxVisible(Math.max(1, firstRowCount - 1));
    } else {
      setMaxVisible(firstRowCount);
    }
  }, [validIds.length]);

  const visible = maxVisible === null ? validIds : validIds.slice(0, maxVisible);
  const hiddenCount = validIds.length - visible.length;

  return (
    <div ref={containerRef} className="flex flex-wrap gap-1.5">
      {visible.map((id) => {
        const m = CAPABILITY_MODULES.find((x) => x.id === id)!;
        return (
          <span
            key={id}
            data-tag
            className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium whitespace-nowrap"
          >
            {m.icon} {m.label}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-700/60 text-slate-400 border border-slate-600/50 font-medium whitespace-nowrap">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
