# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GraphQL-Inspect is a browser devtools extension (Manifest V2) that adds a "GraphQL-Inspect" panel to devtools. It listens to network traffic in the inspected tab, detects GraphQL requests (query/mutation over JSON, `application/graphql`, or form-urlencoded), parses the query AST, and displays queries/responses in a table + detail view (CodeMirror for the query, `@microlink/react-json-view` for variables/response).

Only a Firefox build target is currently wired up (`manifest.firefox.json` exists; `manifest.chrome.json` does not, even though `build.ts` accepts a `chrome` argument).

## Commands

- `npm run dev` — Vite dev server for iterating on the panel UI outside a real browser extension context. In the browser console, run `loadFake()` (defined on `window` in `src/main.tsx`) to populate the table from `public/test1.har`, or `fakeReq()` (see `src/fakes.ts`) for a single fake request.
- `npm run check` — typecheck only (`tsc --noEmit`), no bundling.
- `npm run build:firefox` — runs `build.ts` via `tsx`, which builds both Vite configs (main panel UI + devtools entry) into `dist/firefox`, then copies `manifest.firefox.json` → `manifest.json` and the `icons/` folder.
- `npm run bundle:firefox` — packages `dist/firefox` into an `.xpi` via `web-ext build`.
- `npm run start:firefox` — loads `dist/firefox` into a temporary Firefox profile via `web-ext run` for manual testing (open devtools → GraphQL-Inspect tab → visit a page using GraphQL).
- Extension can also be sideloaded from `dist/firefox` into Chrome/Edge for manual testing.
- `npm run test:e2e` — Playwright smoke tests (`e2e/`) that drive the Vite dev server (not the packaged extension) in Firefox, using the same `loadFake()` hook as manual testing to populate the table from `public/test1.har`. Runs on a dedicated port (5190, set in `playwright.config.ts`) to avoid clashing with anything else on 5173. `npm run test:e2e:ui` opens the Playwright UI runner.

Verification is via `npm run check`, `npm run test:e2e`, and manual testing per above.

## Architecture: two extension contexts, one store class

The extension runs the same core logic in two different browser-extension contexts that cannot share memory, so data has to be relayed between them via `browser.runtime.sendMessage`:

1. **Background/devtools context** (`devtools.html` → `src/background.ts`): has access to `browser.devtools.network` and actually observes and parses requests. Owns the real `GraphQLRequestStore` (`src/gql/index.ts`), listens for `onRequestFinished`/`onNavigated`, and rebroadcasts store events (`requestsAdded`, `updateAll`) as `ExtMessage`s tagged with the inspected tab's ID.
2. **Panel UI context** (`index.html` → `src/main.tsx` → `App.tsx`): renders the actual React UI. When running inside a real extension (`isInWebExt()` in `src/util.ts`), it uses `GraphQLRequestStoreProxy` (`src/gql/proxy.ts`) instead of the real store — the proxy overrides `parseNetworkRequest` to throw (parsing only ever happens in the background context) and rebuilds its `requests` array purely from incoming `ExtMessage`s, matched to the correct tab via `tabId`. When *not* in an extension (plain `npm run dev`), `main.tsx` uses the real `GraphQLRequestStore` directly so the UI can be developed without a browser extension host at all.

Both store classes share the same event-based interface (`mitt` emitter with `requestsAdded`/`updateAll` events), which is what lets `App.tsx` and the components stay agnostic to which context they're running in.

Cross-context messages are typed in `src/util.ts` as the `ExtMessage` union (`toExtMessage` stamps every message with a random `id` and the `tabId` it targets); message types are `ping`, `requestsAdded`, `clearAll`, `updateAll`.

## GraphQL parsing pipeline (`src/gql/utils.ts`)

- `isGraphQL(entry)` sniffs a HAR-format network entry's content-type and body shape to decide if it's a GraphQL call (handles single and batched/array JSON bodies, `application/graphql`, and form-urlencoded `query` params).
- `parseEntry(entry)` extracts the query/variables (per batch item if applicable), parses the query with `graphql-js`'s `parse`, and pairs each parsed query with the corresponding slice of the response body — producing an array of `GQLRequest` (defined in `src/gql/index.ts`), since one HTTP request can carry a batch of GraphQL operations.
- `parseQuery`/`internalParse`/`parseOperation`/`parseFields` walk the GraphQL AST into a simplified, JSON-serializable tree (`ParsedQuery.data`) used to render the operation name/type and fields in the UI — this is a bespoke simplified representation, not the raw AST (though the raw AST is also kept as `rawParse`, JSON-stringified).

## State persistence

The "clear on navigation" setting is the only persisted user preference (`src/util.ts`, `useAppState` zustand store). It reads/writes `browser.storage.local` when running as an extension, falling back to `localStorage` otherwise (see `isInWebExt()` branches in both `getClearOnNavFromStore` and `setClearOnNav`) — keep both branches in sync if this pattern is extended to new settings.

## Attribution

Network request parsing logic originates from https://github.com/Ghirro/graphql-network. Original project by Matthias Kind (`lokmeinmatz`).
