import {
  List,
  Film,
  FolderOpen,
  Layout,
  User,
} from "lucide-react";
import { createElement } from "react";
import type { SearchDomain } from "@/lib/search";
import { GoatTrophy, GoatMusic, GoatGamepad, GoatBook } from "@/components/visual/GoatIcons";

// =============================================================================
// Category constants (shared across CommandPalette features)
// =============================================================================

export const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  Sports: { primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24" },
  Music: { primary: "#8b5cf6", secondary: "#7c3aed", accent: "#a78bfa" },
  Games: { primary: "#10b981", secondary: "#059669", accent: "#34d399" },
  Stories: { primary: "#ec4899", secondary: "#db2777", accent: "#f472b6" },
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Sports: createElement(GoatTrophy, { className: "w-4 h-4" }),
  Music: createElement(GoatMusic, { className: "w-4 h-4" }),
  Games: createElement(GoatGamepad, { className: "w-4 h-4" }),
  Stories: createElement(GoatBook, { className: "w-4 h-4" }),
};

// =============================================================================
// Domain constants (for universal search across entity types)
// =============================================================================

export const DOMAIN_ICONS: Record<SearchDomain, React.ReactNode> = {
  lists: createElement(List, { className: "w-4 h-4" }),
  items: createElement(Film, { className: "w-4 h-4" }),
  groups: createElement(FolderOpen, { className: "w-4 h-4" }),
  blueprints: createElement(Layout, { className: "w-4 h-4" }),
  users: createElement(User, { className: "w-4 h-4" }),
};

export const DOMAIN_LABELS: Record<SearchDomain, string> = {
  lists: "Lists",
  items: "Items",
  groups: "Collections",
  blueprints: "Blueprints",
  users: "Users",
};

export const DOMAIN_COLORS: Record<SearchDomain, string> = {
  lists: "#06b6d4",
  items: "#f59e0b",
  groups: "#8b5cf6",
  blueprints: "#10b981",
  users: "#ec4899",
};

export const DOMAIN_FILTERS: Record<string, SearchDomain> = {
  "/list": "lists",
  "/lists": "lists",
  "/item": "items",
  "/items": "items",
  "/group": "groups",
  "/groups": "groups",
  "/collection": "groups",
  "/blueprint": "blueprints",
  "/blueprints": "blueprints",
  "/user": "users",
  "/users": "users",
};
