"use client";

import { useCallback, useRef, useState } from "react";
import type { ScoreResponse } from "@/lib/scoring";

type State =
  | { status: "idle" }
  | { status: "loading"; word: string }
  | { status: "done"; data: ScoreResponse }
  | { status: "error"; word: string; message: string };

/** Fetches Decisions API scores for a word, caching per word + cover mode so revisiting a word is instant. */
export function useScores() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [history, setHistory] = useState<string[]>([]);
  const cache = useRef(new Map<string, ScoreResponse>());
  const latest = useRef(0);

  const run = useCallback(async (rawWord: string, withCovers: boolean) => {
    const word = rawWord.trim().toLowerCase();
    if (!word) return;
    const key = `${word}::${withCovers}`;
    const request = ++latest.current;
    setHistory((h) => [word, ...h.filter((w) => w !== word)].slice(0, 8));

    const cached = cache.current.get(key);
    if (cached) return setState({ status: "done", data: cached });

    setState({ status: "loading", word });
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, withCovers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      cache.current.set(key, json);
      if (request === latest.current) setState({ status: "done", data: json });
    } catch (error) {
      if (request === latest.current) {
        setState({ status: "error", word, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }, []);

  return { state, history, run };
}
