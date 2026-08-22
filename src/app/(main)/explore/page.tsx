import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { SearchBar } from "@/components/explore/SearchBar";

export default function ExplorePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-1 py-4 sm:px-4">
      <div className="mb-6 flex justify-center">
        <SearchBar />
      </div>
      <ExploreGrid />
    </div>
  );
}
