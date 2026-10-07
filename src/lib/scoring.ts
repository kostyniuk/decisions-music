import type { Decision, DecisionCreateParams } from "openai/resources/decisions";

/** Ordered rubric, weakest to strongest. The API returns the chosen level plus a probability per level. */
export const LEVELS = [
  { label: "No match", description: "The word has nothing to do with this album's sound, mood or themes." },
  { label: "Faint", description: "A loose or occasional connection; you'd have to squint." },
  { label: "Present", description: "Clearly part of the album, but not what defines it." },
  { label: "Strong", description: "A major, recurring element of the album's identity." },
  { label: "Defining", description: "The album is practically the textbook example of this word." },
] as const satisfies DecisionCreateParams.QuestionParamScore.Level[];

export type AlbumScore = {
  id: string;
  /** Expected score in 0–100 (one decimal), computed from the full level distribution so ties break smoothly. */
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

export type Level = (typeof LEVELS)[number]["label"];
