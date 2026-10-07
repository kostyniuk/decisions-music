"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/scoring";

/** Tailwind classes per rubric level, strongest = hottest. */
export const LEVEL_STYLES: Record<Level | "Refused", { text: string; bar: string; badge: string }> = {
  Defining: { text: "text-fuchsia-300", bar: "from-fuchsia-500 to-amber-300", badge: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40" },
  Strong: { text: "text-violet-300", bar: "from-violet-500 to-fuchsia-400", badge: "bg-violet-500/20 text-violet-200 border-violet-400/40" },
  Present: { text: "text-sky-300", bar: "from-sky-500 to-violet-400", badge: "bg-sky-500/15 text-sky-200 border-sky-400/30" },
  Faint: { text: "text-slate-300", bar: "from-slate-500 to-sky-400", badge: "bg-slate-500/15 text-slate-300 border-slate-400/30" },
  "No match": { text: "text-zinc-500", bar: "from-zinc-700 to-zinc-500", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
  Refused: { text: "text-red-300", bar: "from-red-900 to-red-700", badge: "bg-red-500/10 text-red-300 border-red-500/30" },
};

export const levelStyle = (level: string) => LEVEL_STYLES[level as Level] ?? LEVEL_STYLES.Refused;

/** A number that springs to its new value instead of jumping. */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  useEffect(() => spring.set(value), [spring, value]);
  return <motion.span className={cn("tabular-nums", className)}>{display}</motion.span>;
}

/** Bouncing equalizer shown while the Decisions API is thinking. */
export function Equalizer({ className, bars = 5 }: { className?: string; bars?: number }) {
  return (
    <span className={cn("inline-flex h-4 items-end gap-0.5", className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-current"
          style={{ height: "100%", originY: 1 }}
          animate={{ scaleY: [0.25, 1, 0.4, 0.8, 0.25] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/** Animated gradient bar for a 0–100 score. */
export function ScoreBar({ score, level, delay = 0, className }: { score: number; level: string; delay?: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <motion.div
        className={cn("h-full rounded-full bg-gradient-to-r", levelStyle(level).bar)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(score, 2)}%` }}
        transition={{ type: "spring", stiffness: 70, damping: 16, delay }}
      />
    </div>
  );
}

/** Mini histogram of the probability the API assigned to each rubric level. */
export function Distribution({ distribution }: { distribution: { label: string; probability: number }[] }) {
  return (
    <div className="flex h-14 items-end gap-1.5">
      {distribution.map((d, i) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative flex h-10 w-full items-end overflow-hidden rounded-sm bg-white/5">
            <motion.div
              className={cn("w-full rounded-sm bg-gradient-to-t", levelStyle(d.label).bar)}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(d.probability * 100, 3)}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 15, delay: 0.15 + i * 0.05 }}
            />
          </div>
          <span className="hidden w-full truncate text-center text-[9px] uppercase tracking-wide text-white/40 sm:block">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
