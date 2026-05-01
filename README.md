# Screenshot Shelf

Screenshot Shelf is a mobile app that organizes your iPhone screenshots by content. You share a screenshot into the app from any other app, and the AI sorts it onto the right shelf based on what is in the image. From there you can search, filter, add your own categories, or set a reminder for later.

The app is a React PWA wrapped with Capacitor for iOS. It includes a native iOS Share Extension so screenshots can come in from any app via the system share sheet. Everything (images, categories, API key) stays on your device. There is no server and no cloud sync.

## What it does

- **Semantic sorting.** When you save a screenshot, the AI reads what is in the image (a recipe, a flight confirmation, a tweet, a meme, a settings page) and files it on the right shelf for you.
- **Auto-filled details.** Each screenshot gets a short title, notes describing what it shows, and any URL or link the model can read off the image.
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
- Generated build artifacts (dist, ios/DerivedData, Xcode user data, copied Capacitor web assets) are intentionally gitignored.
