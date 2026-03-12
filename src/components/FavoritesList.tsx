"use client";

import Link from "next/link";
import type { School } from "@/lib/data/schema";
import { useFavorites } from "@/hooks/useFavorites";
import GradeBadge from "./GradeBadge";
import SchoolLogo from "./SchoolLogo";
import HeartButton from "./HeartButton";

interface FavoritesListProps {
  allSchools: School[];
}

export default function FavoritesList({ allSchools }: FavoritesListProps) {
  const { favorites } = useFavorites();
  const favorited = allSchools.filter((s) => favorites.has(s.slug));

  if (favorited.length === 0) {
    return (
      <div className="text-center py-16 text-subtext0">
        <svg
          className="mx-auto mb-4 text-surface1"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="text-lg mb-4">No saved schools yet. Heart a school to save it here.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Browse Schools
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {favorited.map((school) => (
        <Link
          key={school.slug}
          href={`/school/${school.slug}`}
          className="block p-5 bg-mantle rounded-lg border border-surface0 hover:border-primary hover:shadow-[0_0_0_1px_var(--ctp-primary)] transition-all duration-150"
        >
          <div className="flex items-start gap-4">
            <SchoolLogo website={school.website} name={school.name} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {school.nicheRanking && (
                  <span className="text-primary font-mono text-sm font-bold">
                    #{school.nicheRanking}
                  </span>
                )}
                <span className="font-semibold text-lg truncate">{school.name}</span>
              </div>
              <p className="text-subtext0 text-sm">
                {school.city}, {school.state} · {school.region}
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <GradeBadge grade={school.nicheGrades.overall} label="Overall" />
                <GradeBadge grade={school.nicheGrades.academics} label="Academics" />
                <GradeBadge grade={school.nicheGrades.campusFood} label="Food" />
                <GradeBadge grade={school.nicheGrades.studentLife} label="Social" />
                <GradeBadge grade={school.nicheGrades.safety} label="Safety" />
              </div>
            </div>
            <div className="hidden sm:block text-right text-sm space-y-1 shrink-0">
              <div className="flex justify-end mb-1">
                <HeartButton slug={school.slug} size="sm" />
              </div>
              <div>
                <span className="text-subtext0">In-state: </span>
                <span className="font-medium">
                  {school.tuitionInState > 0 ? `$${school.tuitionInState.toLocaleString()}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-subtext0">Earnings: </span>
                <span className="font-medium text-green">
                  {school.medianEarnings6yr ? `$${school.medianEarnings6yr.toLocaleString()}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-subtext0">Accept: </span>
                <span className="font-medium">{(school.acceptanceRate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
