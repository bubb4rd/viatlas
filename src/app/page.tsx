import { MapShell } from "@/features/map/components/map-shell";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">Viatlas: interactive map of Leonida</h1>
      <MapShell />
    </main>
  );
}
