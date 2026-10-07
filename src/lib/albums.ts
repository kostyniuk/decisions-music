import albumsJson from "@/data/albums.json";
import coversJson from "@/data/covers.json";

export type Album = {
  id: string;
  title: string;
  artist: string;
  year: number;
  description: string;
  cover: string | null;
};

const covers: Record<string, string | null> = coversJson;

export const albums: Album[] = albumsJson.map((album) => ({
  ...album,
  cover: covers[album.id] ?? null,
}));
