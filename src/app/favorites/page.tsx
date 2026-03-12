import { loadSchoolsBySource } from "@/lib/data/loadSchools";
import FavoritesList from "@/components/FavoritesList";
import PageTransition from "@/components/PageTransition";

export const metadata = { title: "Favorites" };

export default function FavoritesPage() {
  const all = [...loadSchoolsBySource("csrankings"), ...loadSchoolsBySource("niche")];
  const unique = [...new Map(all.map((s) => [s.slug, s])).values()];
  return (
    <PageTransition>
      <div id="main-content" className="py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Saved Schools</h1>
          <p className="text-subtext0">Schools you&apos;ve hearted for quick access.</p>
        </div>
        <FavoritesList allSchools={unique} />
      </div>
    </PageTransition>
  );
}
