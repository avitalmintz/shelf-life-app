# Screenshot Shelf

> Save screenshots before they disappear into your camera roll.

Screenshot Shelf is a mobile-first app for organizing screenshots. Share one from iOS, let AI sort it onto the right shelf, and actually find it again when it matters — instead of losing it in a 12,000-photo scroll.

The app is a React PWA wrapped with Capacitor for iOS. Data lives locally on the device, and a native iOS Share Extension lets you send screenshots in straight from the system share sheet.

## What it does

- **Imports from the iOS share sheet** via a native Share Extension
- **Queues** shared screenshots until the main app is open
- **Saves first, categorizes later** — never blocks on AI
- **AI-generated titles, categories, notes, and visible links** (via the Anthropic API)
- **Custom categories** with user-written AI guidance, plus toggleable built-in ones
- **Reminders** with native iOS notifications (date and time)
- **Local-first storage** — full-quality images in IndexedDB with smaller localStorage fallbacks
- **Search, resurface, status tracking, export, and clear-all** tools

## Tech stack

- **Web** — React 18, TypeScript, Vite
- **UI** — Tailwind CSS, shadcn/ui, Radix UI
- **State / routing** — React Router, TanStack Query
- **Mobile** — Capacitor 8 (iOS), Swift Share Extension
- **AI** — Anthropic SDK
- **Tests** — Vitest, Testing Library

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
```

## Local development

```bash
npm install        # install deps
npm run dev        # start the web app
npm run build      # production build
npm run lint       # ESLint
npm test -- --run  # run tests once
```

## iOS build

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:

- Select your iPhone as the run target
- Set your Apple developer team under **Signing & Capabilities**
- Make sure the App and ShareExt targets share the same App Group
- Press `⌘R` to install

## Configuration

AI categorization uses an **Anthropic API key** that lives only on the device. Add it from **Profile → AI categorization** inside the app.

There is no cloud sync. Saved items, custom categories, image storage, and the API key are all local to the device or browser.

## Notes

- iOS sometimes blocks a Share Extension from auto-opening the host app. When that happens, Screenshot Shelf posts a local notification — tap it to open the app and import the queued screenshots.
- Screenshots saved before the higher-quality image store was added cannot be upgraded retroactively. New imports use the improved storage path.
- Generated build artifacts (`dist`, `ios/DerivedData`, Xcode user data, copied Capacitor web assets) are intentionally gitignored.
