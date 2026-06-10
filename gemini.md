# Chronotypical — Developer Guide for Gemini

Welcome to the **Chronotypical** repository! This document provides an architectural overview, directory structure, data formats, engine details, and local development instructions to help Gemini or any developer agent quickly understand and contribute to the project.

---

## 📖 Project Overview
**Chronotypical** is a **Deterministic Micro-Fiction Engine** built with React, TypeScript, Vite, Tailwind CSS, and Framer Motion. 

The story is told through small narrative fragments stored as MDX files. Depending on the reader's mode, these fragments are either served chronologically or drawn non-linearly using a seed-based, pseudo-random selection algorithm.

### Reading Modes
1. **Traveler Mode (`/traveler`)**: A non-linear journey. Narrative fragments are drawn deterministically from a pool using a pseudo-random number generator (PRNG) seeded with the user's custom seed combined with the number of fragments they have already read. Eligible fragments are filtered by their chronological constraints and DAG prerequisites (dependencies).
2. **Partner Mode (`/partner`)**: A linear, chronological sequence where fragments are sorted and read sequentially from first to last based on their `chronological_order` metadata.
3. **Onboarding (`/onboarding`)**: An initial setup page where the reader defines the name of the **Protagonist**, the **Partner**, and inputs or generates a story **Seed**.

---

## 📁 Repository Structure

```
Chronotypical/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts          # Configures React, Tailwind, MDX, and the custom Local MDX Editor API
├── scripts/
│   └── manifestParser.js   # Script that compiles MDX frontmatter into a JSON manifest
├── src/
│   ├── main.tsx            # Application entry point
│   ├── App.tsx             # Routing & global navigation dispatcher
│   ├── App.css
│   ├── index.css
│   ├── manifest.json       # Generated story manifest (derived from src/content/*.mdx)
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Layout.tsx
│   │   └── FragmentViewer.tsx # Handles rendering of fragment body, warnings reveal, and swipe gesture logic
│   ├── content/            # All story fragments (MDX files)
│   │   ├── frag-002.mdx
│   │   ├── ...
│   │   └── frag-166.mdx
│   ├── engine/
│   │   └── PoolEngine.ts   # Core deterministic fragment selection algorithm
│   ├── routes/
│   │   ├── Onboarding.tsx  # User setup: Protagonist name, Partner name, and Seed
│   │   ├── TravelerMode.tsx
│   │   ├── PartnerMode.tsx
│   │   └── Editor.tsx      # A developer-only Visual Editor for managing narrative fragments
│   ├── store/
│   │   ├── useStoryStore.ts  # Zustand store for reading state (names, seed, read progress)
│   │   └── useEditorStore.ts # Zustand store for managing the developer visual editor state
│   └── types/
│       └── index.ts        # TypeScript interfaces for FragmentMetadata
```

---

## 🧩 Narrative Fragments (`src/content/`)

All narrative content is written in MDX files located inside `src/content/`. Each fragment file uses **gray-matter** YAML frontmatter to describe its properties, dependencies, and requirements.

### Metadata Schema
```typescript
export interface FragmentMetadata {
  id: string;                  // Unique identifier matching the file name (e.g., "frag-002")
  title: string;               // Display title or label
  chronological_order: number; // Position in chronological narrative (used for sorting)
  requires: string[];          // IDs of other fragments that MUST be read before this one becomes eligible
  required_pool_count: number; // The minimum total number of fragments that must be read before this one is unlocked
  tags: string[];              // Semantic tags or categories
  warnings: string[];          // Content warnings (e.g., "strong-language", "death"). If present, blurs content until clicked
}
```

### Writing MDX Content
MDX fragments receive two standard props: `protagonist_name` and `partner_name`. Write narrative text utilizing JSX curly braces to inject these names dynamically:

```md
---
id: frag-999
title: "A Glimpse of Tomorrow"
chronological_order: 999
requires: ["frag-002"]
required_pool_count: 5
tags: ["future", "revelation"]
warnings: ["existential-dread"]
---
"Look," {props.protagonist_name} whispered, pointing to the shimmering horizon. 
{props.partner_name} didn't look up immediately, too busy studying the old maps.
```

---

## ⚙️ Core Engine: Deterministic Choice Selection

The selection of the next fragment in **Traveler Mode** is resolved by `getNextDeterministicFragment` in `src/engine/PoolEngine.ts`. 

### Selection Algorithm
1. **Exclude read fragments:** Filter out any fragment ID already present in `readFragments`.
2. **Apply pool threshold:** Keep only unread fragments where the number of read fragments is $\ge$ `required_pool_count`.
3. **Filter by prerequisites (DAG):** Keep only fragments where all dependencies in `requires` are already present in `readFragments`.
4. **Deadlock prevention:** If no fragments match, warn the console and return `null`.
5. **Deterministic Seed generation:** Compute a specific seed string for the current step:
   $$\text{Seed String} = \text{baseSeed} + \text{"-"} + \text{readFragments.length}$$
6. **PRNG Selection:** Feed the seed string into `seedrandom`. Sort the eligible pool alphabetically by `id` to ensure strict environment consistency, and select the item at the index generated by the PRNG:
   $$\text{index} = \lfloor \text{prng()} \times \text{eligiblePool.length} \rfloor$$

---

## 🛠️ Local Development & Scripts

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

### 3. Generate/Rebuild Manifest
To compile all fragment frontmatter attributes into `src/manifest.json`:
```bash
node scripts/manifestParser.js
```
*(Note: The manifest parser runs automatically prior to launching the dev server or executing builds).*

### 4. Local MDX Visual Editor
When running in development mode (`import.meta.env.DEV`), you can access a visual roster and markdown editor at:
```
http://localhost:5173/editor
```
This interface is powered by a custom Vite plugin (`localEditorPlugin` in `vite.config.ts`) that intercepts `/api/fragments` requests. It allows you to:
- View the complete roster of narrative fragments.
- Modify text, metadata, and dependencies directly.
- Add or delete fragments, which immediately synchronizes with the filesystem and automatically rebuilds the JSON manifest file.

---

## 📝 Tips for Contributing

- **Creating New Fragments:** You can either create them manually inside `src/content/` or use the `/editor` route when running the app locally.
- **Modifying Metadata:** If you manually update frontmatter in `.mdx` files, ensure you run `node scripts/manifestParser.js` to synchronize the app manifest, or restart the dev server to trigger the script.
- **DAG Integrity:** When adding dependencies in `requires`, ensure you do not introduce circular dependencies, which could result in a story deadlock.
