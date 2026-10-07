// Pulls each album's English Wikipedia intro and writes src/data/wiki.json.
// The intro is sent to the Decisions API as factual grounding next to the curated profile.
// Run: node scripts/fetch-wiki.mjs
import { readFile, writeFile } from "node:fs/promises";

const albumsUrl = new URL("../src/data/albums.json", import.meta.url);
const wikiUrl = new URL("../src/data/wiki.json", import.meta.url);
const albums = JSON.parse(await readFile(albumsUrl, "utf8"));
const headers = { "user-agent": "decisions-music/0.1 (https://github.com/kostyniuk/decisions-music)" };

async function api(params) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Wikipedia ${res.status} for ${url}`);
  return res.json();
}

const wiki = {};
for (const a of albums) {
  const { query } = await api({ action: "query", list: "search", srsearch: `${a.title} ${a.artist} album`, srlimit: "5" });
  // Prefer the page whose title is the album itself, e.g. "Igor (album)" or "Blonde (Frank Ocean album)".
  const norm = (s) => s.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9$]/g, "");
  const page = query.search.find((p) => norm(p.title) === norm(a.title)) ?? query.search[0];
  const { query: q } = await api({ action: "query", prop: "extracts", exintro: "1", explaintext: "1", titles: page.title });
  const extract = q.pages[0]?.extract?.trim() ?? "";
  wiki[a.id] = { title: page.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, intro: extract };
  console.log(a.id, "→", page.title, `(${extract.length} chars)`);
}
await writeFile(wikiUrl, JSON.stringify(wiki, null, 2) + "\n");
