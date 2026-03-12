"use client";

import { useCompareContext } from "@/components/CompareProvider";
import { useEffect } from "react";

export default function ClearCompareSlugs() {
  const { clear } = useCompareContext();

  // Clear the compare slugs when the compare page loads
  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
