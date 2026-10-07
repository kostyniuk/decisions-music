"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Crown, Disc3, Shuffle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/albums";
import type { AlbumScore } from "@/lib/scoring";
import { CountUp, Distribution, Equalizer, levelStyle } from "./bits";
import { AlbumDetails, MoodChips } from "./details";

export type Side = "left" | "right";

type SlotProps = {
  side: Side;
  album: Album;
  score?: AlbumScore;
  direction: 1 | -1;
  loading: boolean;
  outcome: "win" | "lose" | "tie" | null;
  onStep: (delta: 1 | -1) => void;
};

function Cover({ album, className, sizes }: { album: Album; className?: string; sizes: string }) {
  return album.cover ? (
    <Image src={album.cover} alt={`${album.title} cover`} fill sizes={sizes} className={cn("object-cover", className)} />
  ) : (
    <div className={cn("grid size-full place-items-center bg-gradient-to-br from-zinc-800 to-zinc-950", className)}>
      <Disc3 className="size-1/3 text-white/20" />
    </div>
  );
}

function Slot({ side, album, score, direction, loading, outcome, onStep }: SlotProps) {
  const style = score ? levelStyle(score.level) : null;
  return (
    <motion.div
      className="relative flex flex-col items-center gap-4"
      animate={{ opacity: outcome === "lose" ? 0.55 : 1, scale: outcome === "win" ? 1.03 : outcome === "lose" ? 0.96 : 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <Button variant="ghost" size="icon" onClick={() => onStep(-1)} aria-label={`Previous album (${side})`} className="text-white/60 hover:text-white">
        <ChevronUp />
      </Button>

      <div className="relative aspect-square w-full max-w-[20rem]" style={{ perspective: 1000 }}>
        {/* Winner glow */}
        <AnimatePresence>
          {outcome === "win" && (
            <motion.div
              key="glow"
              className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-amber-400 blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        <div className="relative size-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={album.id}
              custom={direction}
              className="absolute inset-0"
              variants={{
                enter: (d: number) => ({ y: `${d * 100}%`, rotateX: d * -35, opacity: 0 }),
                center: { y: 0, rotateX: 0, opacity: 1 },
                exit: (d: number) => ({ y: `${d * -100}%`, rotateX: d * 35, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <Cover album={album} sizes="20rem" />
            </motion.div>
          </AnimatePresence>

          {loading && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-white/25 to-transparent"
              initial={{ y: "-100%" }}
              animate={{ y: "100%" }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>

        <AnimatePresence>
          {outcome === "win" && (
            <motion.div
              key="crown"
              className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 p-2 text-black shadow-lg shadow-amber-500/50"
              initial={{ scale: 0, rotate: -40, y: 20 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0, rotate: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.5 }}
            >
              <Crown className="size-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button variant="ghost" size="icon" onClick={() => onStep(1)} aria-label={`Next album (${side})`} className="text-white/60 hover:text-white">
        <ChevronDown />
      </Button>

      <AnimatePresence mode="wait">
        <motion.div
          key={album.id}
          className="w-full max-w-[20rem] text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="font-display text-lg uppercase leading-tight tracking-wide text-balance sm:text-2xl">{album.title}</h3>
          <p className="text-xs text-white/60 sm:text-sm">
            {album.artist} · {album.year}
          </p>
          <div className="mt-2 hidden sm:block">
            <p className="line-clamp-4 min-h-[4lh] text-xs leading-relaxed text-white/45">{album.description}</p>
          </div>
          <MoodChips moods={album.moods} className="mt-2 hidden min-h-[2lh] content-start sm:flex" />
        </motion.div>
      </AnimatePresence>

      <div className="flex h-36 w-full max-w-[20rem] flex-col items-center justify-start gap-2">
        {loading ? (
          <Equalizer className="mt-6 h-8 text-fuchsia-300" bars={7} />
        ) : score && style ? (
          <>
            <div className="flex items-baseline gap-2">
              <CountUp value={score.score} decimals={1} className={cn("font-display text-4xl sm:text-6xl", style.text)} />
              <span className="hidden text-sm text-white/40 sm:inline">/100</span>
            </div>
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:text-xs", style.badge)}>
              {score.level}
              {!score.refused && <span className="ml-1.5 hidden opacity-60 sm:inline">{Math.round(score.confidence * 100)}% sure</span>}
            </span>
            {!score.refused && (
              <div className="w-full">
                <Distribution distribution={score.distribution} />
              </div>
            )}
          </>
        ) : (
          <span className="mt-6 text-xs uppercase tracking-[0.3em] text-white/25">awaiting a word</span>
        )}
      </div>

      <AlbumDetails key={album.id} album={album} />
    </motion.div>
  );
}

type ArenaProps = {
  left: Album;
  right: Album;
  scores: Map<string, AlbumScore> | null;
  directions: Record<Side, 1 | -1>;
  loading: boolean;
  onStep: (side: Side, delta: 1 | -1) => void;
  onTopTwo: () => void;
  onShuffle: () => void;
};

export function Arena({ left, right, scores, directions, loading, onStep, onTopTwo, onShuffle }: ArenaProps) {
  const l = scores?.get(left.id);
  const r = scores?.get(right.id);
  const outcomeFor = (me?: AlbumScore, them?: AlbumScore) =>
    loading || !me || !them ? null : me.score === them.score ? "tie" : me.score > them.score ? "win" : "lose";
  const tie = outcomeFor(l, r) === "tie";

  return (
    <section className="relative">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-8">
        <Slot side="left" album={left} score={l} direction={directions.left} loading={loading} outcome={outcomeFor(l, r)} onStep={(d) => onStep("left", d)} />

        <div className="mt-24 flex flex-col items-center justify-center gap-3 sm:mt-40">
          <AnimatePresence mode="wait">
            <motion.span
              key={tie ? "tie" : "vs"}
              className="font-display bg-gradient-to-b from-white to-white/30 bg-clip-text text-4xl text-transparent select-none sm:text-6xl"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={loading ? { scale: [1, 1.15, 1], rotate: [0, -4, 4, 0], opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={loading ? { duration: 0.6, repeat: Infinity } : { type: "spring", stiffness: 300, damping: 15 }}
            >
              {tie ? "TIE" : "VS"}
            </motion.span>
          </AnimatePresence>
          <Button variant="outline" size="sm" onClick={onTopTwo} disabled={!scores} className="gap-1.5" aria-label="Battle the top 2">
            <Trophy /> <span className="hidden sm:inline">Top 2</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onShuffle} className="gap-1.5 text-white/60" aria-label="Shuffle">
            <Shuffle /> <span className="hidden sm:inline">Shuffle</span>
          </Button>
        </div>

        <Slot side="right" album={right} score={r} direction={directions.right} loading={loading} outcome={outcomeFor(r, l)} onStep={(d) => onStep("right", d)} />
      </div>
    </section>
  );
}

export { Cover };
