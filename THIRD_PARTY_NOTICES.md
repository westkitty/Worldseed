# Third-Party Notices & Visual Asset Licensing

WORLDSEED adheres strictly to open-source, permissive, and CC0/Public Domain licensing standards.

## Dependencies
- **React & React DOM**: MIT License (Copyright (c) Meta Platforms, Inc. and affiliates)
- **Lucide React**: ISC License (Copyright (c) Lucide Contributors)
- **Vite & @vitejs/plugin-react**: MIT License (Copyright (c) 2019-present Evan You & Vite Contributors)
- **TypeScript**: Apache License 2.0 (Copyright (c) Microsoft Corporation)
- **Vitest**: MIT License (Copyright (c) 2021-present Anthony Fu, Matias Capeletto)
- **TailwindCSS**: MIT License (Copyright (c) Tailwind Labs, Inc.)
- **Three.js**: MIT License (Copyright (c) 2010-present three.js authors)

## Typography
- WORLDSEED bundles **no font files**. Type uses the CSS generic families `ui-serif`, `ui-sans-serif` and `ui-monospace` with named platform fallbacks, so nothing is redistributed and nothing is fetched.
- The previous build linked Cinzel, Plus Jakarta Sans and JetBrains Mono from `fonts.googleapis.com`. That was a required public network request at runtime and it silently failed inside the offline native macOS wrapper. It has been removed.

## Visual Assets & Procedural Graphics
- All procedural sprite generators, pixel atlases, biome textures, and architectural icons located in `src/visuals/` are released under **Creative Commons Zero v1.0 Universal (CC0-1.0)** public domain dedication.
- The shared planetary surface compositor (`src/visuals/terrain/planetSurface.ts`), the Three.js hero scene, its atmosphere shader, and its procedurally generated cloud and moon textures are likewise original project work under **CC0-1.0**.
- Zero external copyrighted, scraped, or proprietary assets are utilized.
- No asset, font, script, style or model is fetched from a network at runtime, in either the browser build or the native macOS wrapper.
