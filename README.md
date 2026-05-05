# Screenshot Shelf

Screenshot Shelf is a mobile app that organizes your iPhone screenshots by content. You share a screenshot into the app from any other app, and the AI sorts it onto the right shelf based on what is in the image. From there you can search, filter, add your own categories, or set a reminder for later.

The app is a React PWA wrapped with Capacitor for iOS. It includes a native iOS Share Extension so screenshots can come in from any app via the system share sheet. Saved items, custom categories, and image storage stay on the device. AI categorization and source analysis run through a backend so API keys are not shipped inside the app.

## What it does

- **Semantic sorting.** When you save a screenshot, the AI reads what is in the image and files it on the right shelf for you.
- **Auto-filled details.** Each screenshot gets a short title, notes describing what it shows, and any exact URL the app can capture or read.
- **Source analysis.** The backend can analyze visual details, notes, visible text, and share-sheet metadata to produce likely source details and search candidates.
- **Categories you control.** Built-in categories can be toggled on or off. You can add your own categories by writing a short prompt that tells the AI when to use them.
- **Filter and search.** Browse a single shelf, or search across everything by title or notes.
- **Reminders.** Set a date and time on any screenshot. iOS fires a native notification when it is due.
- **Send from anywhere.** A native iOS Share Extension lets any app that supports the iOS share sheet send a screenshot straight into Screenshot Shelf.
- **Resurfacing, status tracking, export, and clear-all** for revisiting old screenshots, marking them handled, exporting a backup, or wiping everything at once.

## Tech stack

- Web: React 18, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui, Radix UI
- State and routing: React Router, TanStack Query
- Mobile: Capacitor 8 for iOS, Swift Share Extension
- Backend: Express with Anthropic SDK
- Tests: Vitest, Testing Library

## Project layout

```text
src/
  components/      Shared UI and app shell
  hooks/           Share import lifecycle
  lib/             Storage, AI, categories, reminders, image handling
  pages/           App routes
ios/
  App/             Capacitor iOS project
  App/ShareExt/    iOS Share Extension
server/
  index.mjs        Backend API for Claude-powered screenshot analysis
```

## Local development

```bash
npm install        # install deps
npm run dev        # start the web app
npm run build      # production build
npm run lint       # ESLint
npm test -- --run  # run tests once
```

## Backend configuration

Create a local environment file:

```bash
cp .env.example .env
```

Set:

```bash
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_SEARCH_API_KEY=...
VITE_SOURCE_API_URL=http://localhost:8787
```

Run the backend:

```bash
npm run server
```

For production/TestFlight, deploy the backend to a public HTTPS URL and rebuild the app with:

```bash
VITE_SOURCE_API_URL=https://your-backend-url
```

## Backend deployment

This repo includes `render.yaml` for Render. Create a Render web service from the GitHub repo, set `ANTHROPIC_API_KEY` and `BRAVE_SEARCH_API_KEY` in Render environment variables, and use the generated `https://...onrender.com` URL as `VITE_SOURCE_API_URL` before building the iOS archive.

## iOS build

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select your iPhone as the run target.
2. Set your Apple developer team under Signing and Capabilities.
3. Make sure the App and ShareExt targets share the same App Group.
4. Press Cmd+R to install.

## Notes

- iOS sometimes blocks a Share Extension from automatically opening the host app. When that happens, Screenshot Shelf posts a local notification. Tapping it opens the app and imports any queued screenshots.
- There is no cloud sync yet.
- Generated build artifacts (dist, ios/DerivedData, Xcode user data, copied Capacitor web assets) are intentionally gitignored.
