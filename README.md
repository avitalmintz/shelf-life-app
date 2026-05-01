# Screenshot Shelf

Screenshot Shelf is a mobile app for organizing screenshots. You take a screenshot on your iPhone, open the iOS share sheet, and send it to Screenshot Shelf. The app saves the image locally and uses the Anthropic API to fill in a title, a category, notes, and any visible link in the image. Later you can search, filter by category, or set a reminder.

The app is a React PWA wrapped with Capacitor for iOS. It includes a native iOS Share Extension so screenshots can come in from any app via the system share sheet. All data is stored on the device. There is no server and no cloud sync.

## What it does

1. You share a screenshot from another iOS app into Screenshot Shelf via the share sheet.
2. The Share Extension queues the image so it is not lost if the main app is not open yet.
3. When the main app opens, it imports the queued image and saves it immediately.
4. In the background, the app sends the image to the Anthropic API. The model returns:
   - a short title
   - a category from the active list (built-in or custom)
   - notes summarizing what the screenshot is about
   - any URL or link visible in the image
5. The image and its metadata are stored locally. Full-quality images go in IndexedDB. Smaller fallback copies go in localStorage.
6. From the app you can browse your shelf, search, filter by category, set a date and time reminder (which fires as a native iOS notification), export, or clear all.

## Categories

- The app ships with a set of built-in categories, each of which can be turned on or off.
- You can add custom categories. For each custom category you write a short prompt that tells the AI when to assign that category.
- The AI categorization step picks from whatever categories are currently active.

## Tech stack

- Web: React 18, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui, Radix UI
- State and routing: React Router, TanStack Query
- Mobile: Capacitor 8 for iOS, Swift Share Extension
- AI: Anthropic SDK
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

1. Select your iPhone as the run target.
2. Set your Apple developer team under Signing and Capabilities.
3. Make sure the App and ShareExt targets share the same App Group.
4. Press Cmd+R to install.

## Configuration

AI categorization uses an Anthropic API key that lives only on the device. Add it from Profile, AI categorization inside the app.

There is no cloud sync. Saved items, custom categories, image storage, and the API key are all local to the device or browser.

## Notes

- iOS sometimes blocks a Share Extension from automatically opening the host app. When that happens, Screenshot Shelf posts a local notification. Tapping it opens the app and imports any queued screenshots.
- Screenshots saved before the higher-quality image store was added cannot be upgraded retroactively. New imports use the improved storage path.
- Generated build artifacts (dist, ios/DerivedData, Xcode user data, copied Capacitor web assets) are intentionally gitignored.
