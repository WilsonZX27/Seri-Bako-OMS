export function activeNavigationHref(pathname: string, searchParams: Pick<URLSearchParams, "get" | "has">, hrefs: string[]): string | null {
  const matches = hrefs.filter(href => {
    const [targetPath, queryString] = href.split("?");
    if (queryString) {
      if (pathname !== targetPath) return false;
      return [...new URLSearchParams(queryString)].every(([key, value]) => searchParams.get(key) === value);
    }
    if (pathname.startsWith(`${targetPath}/`)) return true;
    return pathname === targetPath && !["step", "status", "type"].some(key => searchParams.has(key));
  });
  // A child workspace such as /people/ro wins over its /people parent.
  return matches.sort((a, b) => b.split("?")[0].length - a.split("?")[0].length || b.length - a.length)[0] ?? null;
}
