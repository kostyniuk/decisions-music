import "server-only";
import OpenAI from "openai";
import type { Decision, DecisionCreateParams, DecisionInputPart } from "openai/resources/decisions";
import { albums, type Album } from "@/lib/albums";

export const DECISIONS_MODEL = process.env.DECISIONS_MODEL ?? "gpt-6-luna";

/** Ordered rubric, weakest to strongest. The API returns the chosen level plus a probability per level. */
export const LEVELS = [
  { label: "No match", description: "The word has nothing to do with this album's sound, mood or themes." },
  { label: "Faint", description: "A loose or occasional connection; you'd have to squint." },
  { label: "Present", description: "Clearly part of the album, but not what defines it." },
  { label: "Strong", description: "A major, recurring element of the album's identity." },
  { label: "Defining", description: "The album is practically the textbook example of this word." },
] satisfies DecisionCreateParams.QuestionParamScore.Level[];

export type AlbumScore = {
  id: string;
  /** Expected score in 0–100, computed from the full level distribution so ties break smoothly. */
  score: number;
  level: string;
  confidence: number;
  distribution: { label: string; probability: number }[];
  refused: boolean;
};

export type ScoreResponse = {
  word: string;
  model: string;
  latencyMs: number;
  usage: Decision["usage"];
  scores: AlbumScore[];
};

const client = new OpenAI();

const describe = (a: Album) => `[${a.id}] "${a.title}" by ${a.artist} (${a.year}): ${a.description}`;

const coverCache = new Map<string, Promise<string | null>>();

/** The Decisions API only accepts inline data URLs for images, so covers are fetched and base64-encoded once per server. */
function coverDataUrl(album: Album) {
  if (!album.cover) return Promise.resolve(null);
  let cached = coverCache.get(album.id);
  if (!cached) {
    const small = album.cover.replace("/1000x1000-", "/250x250-");
    cached = fetch(small)
      .then(async (res) => {
        if (!res.ok) return null;
        const bytes = Buffer.from(await res.arrayBuffer()).toString("base64");
        return `data:${res.headers.get("content-type") ?? "image/jpeg"};base64,${bytes}`;
      })
      .catch(() => null);
    coverCache.set(album.id, cached);
  }
  return cached;
}

async function buildInput(withCovers: boolean): Promise<DecisionCreateParams["input"]> {
  const intro =
    "Catalog of rap / hip-hop / adjacent R&B albums released 2015 or later. Each entry is tagged with its id in brackets. " +
    "Judge albums on their actual music, lyrics, mood and cultural reputation — use your own knowledge, not just the blurb.";
  if (!withCovers) return [intro, ...albums.map(describe)].join("\n\n");

  const parts: DecisionInputPart[] = [{ type: "input_text", text: intro }];
  const covers = await Promise.all(albums.map(coverDataUrl));
  albums.forEach((album, i) => {
    parts.push({ type: "input_text", text: describe(album) + (covers[i] ? " Cover art:" : "") });
    const image = covers[i];
    if (image) parts.push({ type: "input_image", image_url: image, detail: "low" });
  });
  return [{ role: "user", content: parts }];
}

function toAlbumScore(id: string, answer: Decision["answers"][number] | undefined): AlbumScore {
  if (!answer || answer.type !== "score") {
    return { id, score: 0, level: "Refused", confidence: 0, distribution: [], refused: true };
  }
  const maxValue = Math.max(...answer.probabilities.map((p) => p.value), 1);
  const expected = answer.probabilities.reduce((sum, p) => sum + p.probability * p.value, 0);
  const chosen = answer.probabilities.find((p) => p.value === answer.score);
  return {
    id,
    score: Math.round((expected / maxValue) * 100),
    level: chosen?.label ?? LEVELS[Math.min(answer.score, LEVELS.length - 1)].label,
    confidence: answer.confidence,
    distribution: answer.probabilities.map(({ label, probability }) => ({ label, probability })),
    refused: false,
  };
}

export async function scoreAlbums(word: string, withCovers: boolean): Promise<ScoreResponse> {
  const started = performance.now();
  const decision = await client.decisions.create({
    model: DECISIONS_MODEL,
    input: await buildInput(withCovers),
    questions: albums.map((album) => ({
      type: "score",
      name: album.id,
      instructions: `How strongly does the album [${album.id}] "${album.title}" by ${album.artist} embody the word or vibe "${word}"?`,
      levels: LEVELS,
    })),
  });
  const latencyMs = Math.round(performance.now() - started);

  // Answers come back in question order; match by name first in case a refusal drops it.
  const byName = new Map(decision.answers.map((answer, i) => [answer.name ?? albums[i]?.id, answer]));
  return {
    word,
    model: decision.model,
    latencyMs,
    usage: decision.usage,
    scores: albums.map((album) => toAlbumScore(album.id, byName.get(album.id))),
  };
}
