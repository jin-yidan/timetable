# Timetable

A simple timetable app for managing daily events. Works as a web app, PWA, macOS desktop widget, or iOS app with iCloud sync.

[中文版](README_CN.md)

## Download

**macOS App:** [Download Timetable.zip](../../releases/latest)

1. Download and unzip
2. Drag Timetable.app to Applications
3. First launch: System Settings → Privacy & Security → Click "Open Anyway"

**iOS App:** Build from source in Xcode (see below)

## Features

- **Timeline**: Daily events as a list or 24-hour time blocks
- **Week View**: See your whole week at a glance
- **Upcoming**: All unfinished tasks grouped by date
- **Planner**: Set monthly goals for the year
- **Recurring Events**: Daily, weekly, or monthly repeats
- **Chinese Holidays**: Public holidays and 24 solar terms
- **Calendar Sync**: Import events from iCal URLs (university timetables, etc.)
- **iCloud Sync**: Sync events, goals, and settings across macOS and iOS via CloudKit
- **Offline**: Works without internet after first load
- **Private**: All data stays on your devices, synced via your personal iCloud

## Platforms

| Platform | Min Version | Status |
|----------|------------|--------|
| macOS | 13.0 | ✅ |
| iOS | 16.0 | ✅ |
| Web / PWA | Any modern browser | ✅ |

## Usage

### Add an Event
1. Click "Add event"
2. Enter time (start and optional end time)
3. Type the title
4. Optional: add a note, set repeat, mark as important
5. Click "Add"

### Manage Events
- Click the circle to mark done
- Click ⋯ to edit or delete

### Navigate
- Arrow buttons for previous/next day/week
- Click date to jump to any date
- Tabs: Timeline, Week, Upcoming, Planner

### Import Calendar
1. Click the gear icon
2. Paste your iCal URL
3. Click Save

### iCloud Sync
Sync is automatic when running the native macOS or iOS app. Events, goals, recurring task status, and settings sync across all your devices signed into the same iCloud account.

## Build from Source

1. Open `xcode/Timetable.xcodeproj` in Xcode
2. Select a target:
   - **Timetable** — macOS app
   - **Timetable iOS** — iOS app
3. Select your signing team
4. Build and run (Cmd+R)

For iCloud sync, enable the iCloud (CloudKit) capability in Signing & Capabilities and select the container `iCloud.com.jinyidan.Timetable`.

## Web Version

Open `index.html` in any browser, or visit https://jin-yidan.github.io/timetable/

Install as PWA:
- iOS: Share → Add to Home Screen
- Android: Menu → Install app
- Desktop: Click install icon in address bar

## Data

All data is stored locally in your browser/app. The native apps optionally sync via iCloud CloudKit (your personal iCloud — no third-party servers).

## License

MIT
