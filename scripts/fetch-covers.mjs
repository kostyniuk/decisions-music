// Resolves album cover URLs via the Deezer public API and writes src/data/covers.json.
// Run: node scripts/fetch-covers.mjs
import { readFile, writeFile } from "node:fs/promises";

const albumsUrl = new URL("../src/data/albums.json", import.meta.url);
const coversUrl = new URL("../src/data/covers.json", import.meta.url);
const albums = JSON.parse(await readFile(albumsUrl, "utf8"));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function search(q) {
  const url = new URL("https://api.deezer.com/search/album");
  url.searchParams.set("q", q);
  const res = await fetch(url);
  return res.ok ? ((await res.json()).data ?? []) : [];
}

const covers = {};
for (const a of albums) {
  const title = norm(a.title);
  const artist = norm(a.artist);
  const byArtist = (r) => norm(r.artist.name) === artist;
  const results = [
    ...(await search(`artist:"${a.artist}" album:"${a.title}"`)),
    ...(await search(`${a.artist} ${a.title}`)),
  ];
  const hit =
    results.find((r) => byArtist(r) && norm(r.title) === title) ??
    results.find((r) => byArtist(r) && norm(r.title).startsWith(title));
  covers[a.id] = hit?.cover_xl ?? null;
  console.log(a.id, hit ? `✓ ${hit.title} — ${hit.artist.name}` : "✗ not found");
}
await writeFile(coversUrl, JSON.stringify(covers, null, 2) + "\n");
