import albumsJson from "@/data/albums.json";
import coversJson from "@/data/covers.json";
import profilesJson from "@/data/profiles.json";
import wikiJson from "@/data/wiki.json";

export type AlbumProfile = {
  released: string;
  description: string;
  sound: string;
  producers: string[];
  features: string[];
  standoutTracks: string[];
  moods: string[];
  themes: string[];
  settings: string[];
  notFor: string[];
  context: string;
};

export type Album = AlbumProfile & {
  id: string;
  title: string;
  artist: string;
  year: number;
  cover: string | null;
  wiki: { title: string; url: string; intro: string } | null;
};

const covers: Record<string, string | null> = coversJson;
const profiles = new Map<string, AlbumProfile>(profilesJson.map(({ id, ...profile }) => [id, profile]));
const wiki: Record<string, Album["wiki"]> = wikiJson;

export const albums: Album[] = albumsJson.map(({ id, title, artist, year }) => {
  const profile = profiles.get(id);
  if (!profile) throw new Error(`Missing profile for album "${id}" in src/data/profiles.json`);
  return { id, title, artist, year, ...profile, cover: covers[id] ?? null, wiki: wiki[id] ?? null };
});
