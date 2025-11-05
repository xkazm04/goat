# Project Vision & Architecture – Strategic Overview  
---

## 1. Vision  
> **Create a gamified experience for creators and daily internet entertainment consumers to compose ranking lists in areas of Gaming, Sports, Media.
- **Core Mission** – Empower users to rank areas they enjoy in a fun way, curate their own rankings, and collaborate with friends or the community.  
---

## 2. Value Proposition  

| Area | What We Deliver | Impact |
|------|----------------|--------|
| **Excellent UX** | Public lists with engaging user interaction techniques, high level visual quality and AI assistant helping currating the backlog. | 1000 users interacted with the app|
| **Backlog & Ranking** | Drag‑and‑drop match grid, backlog items, comparison modal. | 25 % reduction in feature adoption friction. |

---

## 3. Architectural Pillars  

### Feature‑Centric Containers  
- **Landing** – `LandingLayout` → `LandingMain` + `UserListsSection`.  
- **Backlog** – `BacklogItem` orchestrator → `BacklogItemWrapper` (drag) + `BacklogItemContent` (visual).  
- **Match** – `MatchContainer` (dnd‑kit context) → `MatchGrid`/`Podium` + `BacklogGroups`.  

### Interaction & Data Flow  
- **Drag‑and‑Drop** – dnd‑kit’s `useDraggable` is wrapped by `BacklogItemWrapper`.  
- **Context Menus** – Right‑click actions are delivered through `ContextMenu` with animated entry/exit.  
- **Modals** – `CompositionModal` opens on card click; modal logic lives in the parent container to keep z‑index and backdrop logic central.
---

## 4. Strategic Recommendations  

| Recommendation | Why It Matters | How To Execute |
|----------------|----------------|----------------|
| **Plan for Horizontal Scaling of Backlog** | The app is expected to handle thousands of items; need to optimise data fetching. | Implement pagination + server‑side filtering for backlog queries; use SWR / React Query patterns in custom hooks. |

- TBD feature: Game releases, Award events
---
