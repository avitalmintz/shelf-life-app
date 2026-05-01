# Screenshot Shelf

Screenshot Shelf is a mobile-first app for saving screenshots before they disappear into the camera roll. Share a screenshot into the app, let AI sort it into the right shelf, and come back to it when it matters.

The app is built as a React PWA and wrapped with Capacitor for iOS. It stores data locally on the device and includes an iOS Share Extension so screenshots can be sent to the app from the native share sheet.

## What It Does

- Imports screenshots from the iOS share sheet
- Queues shared screenshots until the main app opens
- Saves screenshots immediately, then categorizes them in the background
- Uses AI to generate a title, category, notes, and visible link when available
- Supports custom categories with user-written AI guidance
- Lets users enable or disable built-in categories
- Stores higher-quality images in IndexedDB with smaller localStorage fallbacks
- Supports reminder date and time with native iOS notifications
- Includes search, resurfacing, status tracking, export, and clear-all tools

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui, Radix UI
- React Router
- TanStack Query
- Capacitor 8 for iOS
- Swift Share Extension and Capacitor plugins
- Anthropic SDK for AI screenshot categorization
- Vitest and Testing Library

## Project Structure

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

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Run checks:

```bash
npm run build
npm run lint
npm test -- --run
```

## iOS Development

Build and sync the web app into the native project:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:

- Select your iPhone as the run target
- Set your Apple developer team under Signing & Capabilities
- Make sure the App and ShareExt targets use the same App Group
- Press `Cmd + R` to install

## Configuration

AI categorization uses an Anthropic API key stored locally on the device. Add it inside the app from Profile -> AI categorization.

The app does not currently include cloud sync. Saved items, custom categories, image storage, and API keys are local to the device/browser.

## Notes

- iOS may block a Share Extension from automatically opening the main app. When that happens, Screenshot Shelf posts a local notification; tapping it opens the app and imports the queued screenshots.
- Existing screenshots that were saved before the higher-quality image store was added cannot be restored to a sharper version. New imports use the improved storage path.
- Generated build artifacts such as `dist`, `ios/DerivedData`, Xcode user data, and Capacitor copied web assets are intentionally ignored.
