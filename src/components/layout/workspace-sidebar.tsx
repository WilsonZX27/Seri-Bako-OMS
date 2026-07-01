"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Factory, GripVertical, Star, StarOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getFlatNavItems, getVisibleNavGroups } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type WorkspaceSidebarProps = {
  role: UserRole;
  mobile?: boolean;
  onNavigate?: () => void;
};

const prefKey = "seri-bako-workspace-preferences-v1";

type Preferences = {
  collapsedGroups: string[];
  favorites: string[];
};

function loadPrefs(): Preferences {
  if (typeof window === "undefined") return { collapsedGroups: [], favorites: ["/purchase-requests", "/stock-count/scan", "/items"] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(prefKey) ?? "{}") as Partial<Preferences>;
    return {
      collapsedGroups: parsed.collapsedGroups ?? [],
      favorites: parsed.favorites ?? ["/purchase-requests", "/stock-count/scan", "/items"],
    };
  } catch {
    return { collapsedGroups: [], favorites: ["/purchase-requests", "/stock-count/scan", "/items"] };
  }
}

function savePrefs(preferences: Preferences) {
  window.localStorage.setItem(prefKey, JSON.stringify(preferences));
}

export function WorkspaceSidebar({ role, mobile = false, onNavigate }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<Preferences>({ collapsedGroups: [], favorites: [] });
  const groups = useMemo(() => getVisibleNavGroups(role), [role]);
  const flatItems = useMemo(() => getFlatNavItems(role), [role]);
  const favorites = preferences.favorites
    .map((href) => flatItems.find((item) => item.href.split("?")[0] === href.split("?")[0] || item.href === href))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  useEffect(() => {
    setPreferences(loadPrefs());
  }, []);

  function patchPreferences(next: Preferences) {
    setPreferences(next);
    savePrefs(next);
  }

  function toggleGroup(groupId: string) {
    const collapsed = new Set(preferences.collapsedGroups);
    if (collapsed.has(groupId)) collapsed.delete(groupId);
    else collapsed.add(groupId);
    patchPreferences({ ...preferences, collapsedGroups: Array.from(collapsed) });
  }

  function toggleFavorite(href: string) {
    const exists = preferences.favorites.includes(href);
    patchPreferences({
      ...preferences,
      favorites: exists ? preferences.favorites.filter((item) => item !== href) : [href, ...preferences.favorites],
    });
  }

  function moveFavorite(href: string, direction: -1 | 1) {
    const current = [...preferences.favorites];
    const index = current.indexOf(href);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
    patchPreferences({ ...preferences, favorites: current });
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Factory className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Seri Bako</p>
          <p className="text-xs text-muted-foreground">ERP Workspace</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        {favorites.length ? (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-accent" />
              Favorites
            </div>
            <div className="space-y-1">
              {favorites.map((item) => {
                const active = pathname === item.href.split("?")[0];
                const Icon = item.icon;
                return (
                  <div key={item.href} className={cn("group flex items-center rounded-md", active ? "bg-primary/10" : "hover:bg-secondary")}>
                    <Link href={item.href} onClick={onNavigate} className={cn("flex h-9 min-w-0 flex-1 items-center gap-2 px-2 text-sm", active ? "text-primary" : "text-muted-foreground")}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                    <button type="button" className="px-1 text-muted-foreground hover:text-foreground" onClick={() => moveFavorite(item.href, -1)} aria-label="Move favorite up">
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="px-2 text-muted-foreground hover:text-foreground" onClick={() => toggleFavorite(item.href)} aria-label="Unpin favorite">
                      <StarOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const collapsed = preferences.collapsedGroups.includes(group.id);
            return (
              <div key={group.id} className="rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-semibold uppercase text-muted-foreground hover:bg-secondary"
                >
                  <GroupIcon className="h-4 w-4" />
                  <span className="flex-1">{group.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed ? "-rotate-90" : "rotate-0")} />
                </button>
                {!collapsed ? (
                  <div className="mt-1 space-y-1 pl-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const hrefPath = item.href.split("?")[0];
                      const active = pathname === hrefPath;
                      const isFavorite = preferences.favorites.includes(item.href);
                      return (
                        <div key={`${group.id}-${item.href}-${item.label}`} className={cn("group flex items-center rounded-md", active ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                          <Link
                            href={item.disabled ? "#" : item.href}
                            onClick={onNavigate}
                            className={cn("flex h-9 min-w-0 flex-1 items-center gap-2 px-2 text-sm", active ? "text-primary-foreground" : item.disabled ? "text-muted-foreground/50" : "text-muted-foreground hover:text-foreground")}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                          {!item.disabled ? (
                            <button type="button" className={cn("px-2 opacity-0 group-hover:opacity-100", active ? "text-primary-foreground" : "text-muted-foreground")} onClick={() => toggleFavorite(item.href)} aria-label={isFavorite ? "Unpin page" : "Pin page"}>
                              <Star className={cn("h-3.5 w-3.5", isFavorite ? "fill-accent text-accent" : "")} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      {!mobile ? (
        <div className="border-t p-4">
          <div className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">
            Navigation, favorites, dashboard widgets, and table preferences are stored per user workspace.
          </div>
        </div>
      ) : null}
    </div>
  );
}
