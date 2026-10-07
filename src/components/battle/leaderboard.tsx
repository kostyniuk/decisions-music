"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/albums";
import { LEVELS, type AlbumScore } from "@/lib/scoring";
import type { Side } from "./arena";
import { Cover } from "./arena";
import { levelStyle, ScoreBar } from "./bits";

type Props = {
  albums: Album[];
  scores: Map<string, AlbumScore> | null;
  loading: boolean;
  inArena: Record<Side, string>;
  onPick: (side: Side, album: Album) => void;
};

function AlbumTile({
  album,
  rank,
  score,
  index,
  loading,
  inArena,
  onPick,
}: {
  album: Album;
  rank: number | null;
  score?: AlbumScore;
  index: number;
  loading: boolean;
  inArena: Side | null;
  onPick: Props["onPick"];
}) {
  return (
    <motion.li
      layout
      layoutId={album.id}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.015 }}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.08]",
        inArena && "ring-2 ring-fuchsia-400/70",
      )}
    >
      <div className="relative aspect-square">
        <Cover album={album} sizes="(min-width: 1024px) 14rem, 45vw" className="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {rank !== null && (
          <motion.span
            key={rank}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-display absolute top-2 left-2 grid size-8 place-items-center rounded-full bg-black/70 text-lg backdrop-blur",
              rank === 1 && "bg-amber-300 text-black",
              rank === 2 && "bg-zinc-200 text-black",
              rank === 3 && "bg-amber-700 text-white",
            )}
          >
            {rank}
          </motion.span>
        )}

        {/* Description + arena controls on hover */}
        <div className="absolute inset-0 flex flex-col justify-between bg-black/80 p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <p className="line-clamp-6 text-xs leading-relaxed text-white/80">{album.description}</p>
          <div className="flex gap-1.5">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                onClick={() => onPick(side, album)}
                className="flex-1 rounded-md bg-white/10 py-1 text-[11px] font-medium uppercase tracking-wider hover:bg-fuchsia-500/70"
              >
                {side === "left" ? "◀ Left" : "Right ▶"}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3 group-hover:opacity-0">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{album.title}</p>
              <p className="truncate text-xs text-white/55">
                {album.artist} · {album.year}
              </p>
            </div>
            {score && !loading && (
              <span className={cn("font-display text-2xl tabular-nums", levelStyle(score.level).text)}>{Math.round(score.score)}</span>
            )}
          </div>
          {loading ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: (index % 6) * 0.08 }}
              />
            </div>
          ) : (
            score && <ScoreBar score={score.score} level={score.level} delay={0.2 + index * 0.03} />
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function Leaderboard({ albums, scores, loading, inArena, onPick }: Props) {
  const ranked = scores ? [...albums].sort((a, b) => (scores.get(b.id)?.score ?? -1) - (scores.get(a.id)?.score ?? -1)) : albums;
  const rankOf = new Map(ranked.map((a, i) => [a.id, i + 1]));
  const sideOf = (id: string): Side | null => (inArena.left === id ? "left" : inArena.right === id ? "right" : null);

  const tile = (album: Album, index: number) => (
    <AlbumTile
      key={album.id}
      album={album}
      index={index}
      rank={scores && !loading ? rankOf.get(album.id)! : null}
      score={scores?.get(album.id)}
      loading={loading}
      inArena={sideOf(album.id)}
      onPick={onPick}
    />
  );

  const tiers = [...LEVELS.map((l) => l.label).reverse(), "Refused"]
    .map((level) => ({ level, albums: ranked.filter((a) => scores?.get(a.id)?.level === level) }))
    .filter((t) => t.albums.length > 0);

  return (
    <Tabs defaultValue="ranked" className="gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl uppercase tracking-wide">{scores ? "Leaderboard" : "The roster"}</h2>
        <TabsList>
          <TabsTrigger value="ranked">Ranked</TabsTrigger>
          <TabsTrigger value="tiers" disabled={!scores}>
            Tiers
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="ranked">
        <LayoutGroup>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{ranked.map(tile)}</ul>
        </LayoutGroup>
      </TabsContent>

      <TabsContent value="tiers" className="space-y-8">
        <LayoutGroup>
          <AnimatePresence>
            {tiers.map((tier) => (
              <motion.section key={tier.level} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest", levelStyle(tier.level).badge)}>
                    {tier.level}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-white/40">{tier.albums.length}</span>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{tier.albums.map(tile)}</ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </LayoutGroup>
      </TabsContent>
    </Tabs>
  );
}
