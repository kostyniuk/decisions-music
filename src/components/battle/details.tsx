"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/albums";

export function MoodChips({ moods, max = 4, className }: { moods: string[]; max?: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-1", className)}>
      {moods.slice(0, max).map((mood, i) => (
        <motion.span
          key={mood}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.04 }}
          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60"
        >
          {mood}
        </motion.span>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</dt>
      <dd className="mt-0.5 text-xs leading-relaxed text-white/70">{children}</dd>
    </div>
  );
}

/** Collapsible deep-dive into the profile the Decisions API is judging. */
export function AlbumDetails({ album }: { album: Album }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full max-w-[20rem]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1 whitespace-nowrap text-[11px] uppercase tracking-widest text-white/40 hover:text-white/80"
      >
        {open ? "less" : (
          <>
            <span className="sm:hidden">details</span>
            <span className="hidden sm:inline">what the model reads</span>
          </>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="size-3" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.dl
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="mt-3 space-y-3 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 text-left backdrop-blur"
          >
            <Row label="Sound">{album.sound}</Row>
            <Row label="Standout tracks">{album.standoutTracks.join(" · ")}</Row>
            {album.features.length > 0 && <Row label="Features">{album.features.join(", ")}</Row>}
            <Row label="Produced by">{album.producers.join(", ")}</Row>
            <Row label="Themes">{album.themes.join(", ")}</Row>
            <Row label="Fits">{album.settings.join(", ")}</Row>
            <Row label="Context">{album.context}</Row>
            {album.wiki && (
              <a href={album.wiki.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-fuchsia-300 hover:underline">
                Wikipedia <ExternalLink className="size-3" />
              </a>
            )}
          </motion.dl>
        )}
      </AnimatePresence>
    </div>
  );
}
