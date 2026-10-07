import "server-only";
import OpenAI from "openai";
import type { Decision, DecisionCreateParams, DecisionInputPart } from "openai/resources/decisions";
import { albums, type Album } from "@/lib/albums";
import { LEVELS, type AlbumScore, type ScoreResponse } from "@/lib/scoring";

export const DECISIONS_MODEL = process.env.DECISIONS_MODEL ?? "gpt-6-luna";

// Lazily constructed so mock mode works without OPENAI_API_KEY.
let openai: OpenAI | undefined;
const client = { get decisions() { return (openai ??= new OpenAI()).decisions; } };

const list = (items: string[]) => (items.length ? items.join(", ") : "none");

/** Everything the model gets to know about one album: curated profile plus the Wikipedia intro for grounding. */
const describe = (a: Album) =>
  [
    `### [${a.id}] "${a.title}" by ${a.artist} (released ${a.released})`,
    `Summary: ${a.description}`,
    `Sound: ${a.sound}`,
    `Producers: ${list(a.producers)}. Features: ${list(a.features)}.`,
    `Standout tracks: ${list(a.standoutTracks)}.`,
    `Moods: ${list(a.moods)}.`,
    `Themes: ${list(a.themes)}.`,
    `Fits: ${list(a.settings)}. Does NOT fit: ${list(a.notFor)}.`,
    `Context: ${a.context}`,
    a.wiki ? `Wikipedia (${a.wiki.title}): ${a.wiki.intro}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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
    "Each profile covers sound, moods, themes, situations it fits and does not fit, reception, and a Wikipedia intro. " +
    "Judge albums on their actual music, lyrics, mood and cultural reputation. Treat the profiles as the primary source of facts; " +
    "use your own knowledge only to fill gaps, never to contradict them.";
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
    score: Math.round((expected / maxValue) * 1000) / 10,
    level: chosen?.label ?? LEVELS[Math.min(answer.score, LEVELS.length - 1)].label,
    confidence: answer.confidence,
    distribution: answer.probabilities.map(({ label, probability }) => ({ label, probability })),
    refused: false,
  };
}

export const MOCK = process.env.DECISIONS_MOCK === "1";

/** Deterministic fake /v1/decisions response for UI work without API access. Same shape as the real thing. */
async function mockDecision(params: DecisionCreateParams): Promise<Decision> {
  await new Promise((r) => setTimeout(r, 600));
  let seed = [...JSON.stringify(params.questions)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rand = () => ((seed = (seed * 1103515245 + 12345) | 0) >>> 0) / 2 ** 32;
  return {
    model: `${params.model} (mock)`,
    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, input_tokens_details: { cache_write_tokens: 0, cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } },
    answers: params.questions.map((q) => {
      const peak = rand() * (LEVELS.length - 1);
      const weights = LEVELS.map((_, v) => Math.exp(-((v - peak) ** 2)));
      const total = weights.reduce((a, b) => a + b, 0);
      const probabilities = LEVELS.map((l, v) => ({ label: l.label, value: v, probability: weights[v] / total }));
      const best = probabilities.reduce((a, b) => (b.probability > a.probability ? b : a));
      return { type: "score", name: q.name ?? null, score: best.value, confidence: best.probability, probabilities };
    }),
  };
}

export async function scoreAlbums(word: string, withCovers: boolean): Promise<ScoreResponse> {
  const params: DecisionCreateParams = {
    model: DECISIONS_MODEL,
    input: await buildInput(withCovers),
    questions: albums.map((album) => ({
      type: "score",
      name: album.id,
      instructions: `How strongly does the album [${album.id}] "${album.title}" by ${album.artist} embody the word or vibe "${word}"?`,
      levels: [...LEVELS],
    })),
  };
  // Time only the API call, not the one-off cover downloads in buildInput.
  const started = performance.now();
  const decision = MOCK ? await mockDecision(params) : await client.decisions.create(params);
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
