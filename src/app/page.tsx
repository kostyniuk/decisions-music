import { VibeBattle } from "@/components/battle/vibe-battle";
import { albums } from "@/lib/albums";

export default function Home() {
  return <VibeBattle albums={albums} />;
}
