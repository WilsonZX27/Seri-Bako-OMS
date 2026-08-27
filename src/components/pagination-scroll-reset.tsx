"use client";

import { useEffect } from "react";

export function PaginationScrollReset({ page }: { page: number }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);

  return null;
}
