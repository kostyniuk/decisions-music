import OpenAI from "openai";
import { MOCK, scoreAlbums } from "@/lib/decisions";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { word?: unknown; withCovers?: unknown } | null;
  const word = typeof body?.word === "string" ? body.word.trim().slice(0, 60) : "";
  if (!word) return Response.json({ error: "Type a word to battle with." }, { status: 400 });

  if (!MOCK && !process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server." }, { status: 500 });
  }

  try {
    return Response.json(await scoreAlbums(word, body?.withCovers === true));
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return Response.json({ error: error.message }, { status: error.status ?? 502 });
    }
    console.error(error);
    return Response.json({ error: "Decisions API call failed." }, { status: 502 });
  }
}
