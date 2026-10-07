"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Album } from "@/lib/albums";
import { Arena, type Side } from "./arena";
import { Equalizer } from "./bits";
import { Leaderboard } from "./leaderboard";
import { useScores } from "./use-scores";

const SUGGESTIONS = ["rage", "heartbreak", "summer", "3am drive", "luxury", "chaos", "therapy", "vampire", "dance", "lonely"];

export function VibeBattle({ albums }: { albums: Album[] }) {
  const { state, history, run } = useScores();
  const [word, setWord] = useState("");
  const [withCovers, setWithCovers] = useState(false);
  const [slots, setSlots] = useState<Record<Side, number>>({ left: 0, right: 1 });
  const [directions, setDirections] = useState<Record<Side, 1 | -1>>({ left: 1, right: 1 });

  const loading = state.status === "loading";
  const scores = useMemo(
    () => (state.status === "done" ? new Map(state.data.scores.map((s) => [s.id, s])) : null),
    [state],
  );
  const left = albums[slots.left];
  const right = albums[slots.right];

  const step = (side: Side, delta: 1 | -1) => {
    setDirections((d) => ({ ...d, [side]: delta }));
    setSlots((s) => {
      const other = s[side === "left" ? "right" : "left"];
      let next = (s[side] + delta + albums.length) % albums.length;
      if (next === other) next = (next + delta + albums.length) % albums.length;
      return { ...s, [side]: next };
    });
  };

  const place = (side: Side, index: number) => {
    setSlots((s) => {
      const otherSide = side === "left" ? "right" : "left";
      // Picking the album already on the other side swaps them.
      if (s[otherSide] === index) return { [side]: index, [otherSide]: s[side] } as Record<Side, number>;
      setDirections((d) => ({ ...d, [side]: index > s[side] ? 1 : -1 }));
      return { ...s, [side]: index };
    });
  };

  const topTwo = () => {
    if (!scores) return;
    const [a, b] = [...albums.keys()].sort((i, j) => (scores.get(albums[j].id)?.score ?? 0) - (scores.get(albums[i].id)?.score ?? 0));
    place("left", a);
    place("right", b);
  };

  const shuffle = () => {
    const a = Math.floor(Math.random() * albums.length);
    let b = Math.floor(Math.random() * (albums.length - 1));
    if (b >= a) b++;
    place("left", a);
    place("right", b);
  };

  const submit = (w: string) => {
    setWord(w);
    void run(w, withCovers);
  };

  // W/S cycles the left slot, ↑/↓ the right one — unless you're typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      const map: Record<string, [Side, 1 | -1]> = { w: ["left", -1], s: ["left", 1], ArrowUp: ["right", -1], ArrowDown: ["right", 1] };
      const hit = map[e.key];
      if (!hit) return;
      e.preventDefault();
      step(...hit);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Backdrop follows whichever arena album is ahead (or the left one before scoring).
  const leader = scores && (scores.get(right.id)?.score ?? 0) > (scores.get(left.id)?.score ?? 0) ? right : left;

  return (
    <div className="grain relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-black">
        <AnimatePresence>
          {leader.cover && (
            <motion.div
              key={leader.id}
              className="absolute inset-[-20%]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45, scale: [1, 1.12, 1], rotate: [0, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.2 }, scale: { duration: 24, repeat: Infinity }, rotate: { duration: 30, repeat: Infinity } }}
            >
              <Image src={leader.cover} alt="" fill sizes="100vw" className="object-cover blur-3xl saturate-150" priority />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-8">
        <header className="flex flex-col items-center gap-6 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur">
            <Zap className="size-3 text-amber-300" /> Powered by the OpenAI Decisions API
          </motion.div>

          <h1 className="font-display text-6xl leading-none uppercase tracking-tight sm:text-8xl">
            {"Vibe Battle".split("").map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block bg-gradient-to-b from-white via-white to-fuchsia-300 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 40, rotate: -8 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: i * 0.04 }}
              >
                {ch === " " ? " " : ch}
              </motion.span>
            ))}
          </h1>

          <p className="max-w-xl text-balance text-white/60">
            Drop one word. Every album gets judged on how hard it embodies it. Then pit them against each other.
          </p>

          <form
            className="flex w-full max-w-xl flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(word);
            }}
          >
            <div className="relative flex gap-2 rounded-2xl border border-white/15 bg-black/40 p-2 shadow-2xl shadow-fuchsia-500/10 backdrop-blur-xl focus-within:border-fuchsia-400/60">
              <Input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="heartbreak, rage, summer, luxury…"
                maxLength={60}
                className="h-11 border-0 bg-transparent text-lg shadow-none focus-visible:ring-0 dark:bg-transparent"
                aria-label="Vibe word"
              />
              <Button type="submit" size="lg" disabled={!word.trim() || loading} className="h-11 gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 text-white hover:opacity-90">
                {loading ? <Equalizer className="h-4" /> : <Sparkles />}
                Judge
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  type="button"
                  key={s}
                  onClick={() => submit(s)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.03 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:border-fuchsia-400/50 hover:text-white"
                >
                  {s}
                </motion.button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-white/50">
              <Switch id="covers" checked={withCovers} onCheckedChange={setWithCovers} size="sm" />
              <Label htmlFor="covers" className="text-xs font-normal text-white/50">
                Let the model look at the cover art too (slower, uses image input)
              </Label>
            </div>
          </form>

          <AnimatePresence mode="wait">
            {state.status === "done" && (
              <motion.p key={state.data.word} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-white/40">
                <span className="text-white/70">“{state.data.word}”</span> · {state.data.model} · {state.data.latencyMs} ms ·{" "}
                {state.data.usage.total_tokens.toLocaleString()} tokens · {albums.length} questions in 1 call
              </motion.p>
            )}
            {state.status === "loading" && (
              <motion.p key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-xs text-fuchsia-200/80">
                <Equalizer className="h-3" /> Deciding “{state.word}” for {albums.length} albums…
              </motion.p>
            )}
            {state.status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: [0, -8, 8, -4, 4, 0] }}
                exit={{ opacity: 0 }}
                className="flex max-w-xl items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{state.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {history.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-white/40">
              recent:
              {history.map((h) => (
                <button key={h} onClick={() => submit(h)} className="rounded px-1.5 py-0.5 text-white/60 underline-offset-2 hover:text-white hover:underline">
                  {h}
                </button>
              ))}
            </div>
          )}
        </header>

        <Arena
          left={left}
          right={right}
          scores={scores}
          directions={directions}
          loading={loading}
          onStep={step}
          onTopTwo={topTwo}
          onShuffle={shuffle}
        />

        <Leaderboard
          albums={albums}
          scores={scores}
          loading={loading}
          inArena={{ left: left.id, right: right.id }}
          onPick={(side, album) => place(side, albums.indexOf(album))}
        />

        <footer className="pb-6 text-center text-xs text-white/30">
          W / S cycles the left album · ↑ / ↓ cycles the right · hover a tile to send it to the arena
        </footer>
      </main>
    </div>
  );
}
