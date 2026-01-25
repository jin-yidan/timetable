# Timetable

A simple timetable app for managing daily events. Works as a web app or a macOS desktop widget.

## Download

[Download the latest release](../../releases/latest)

### Installation

1. Download `Reader.zip`
2. Unzip and run the app
3. **First launch:** System Settings → Privacy & Security → Click "Open Anyway"

## What it does

- **Timeline view**: See your events for any day in a list or as time blocks on a 24-hour grid
- **Week view**: See a whole week at a glance with events shown as blocks
- **Upcoming view**: See all your unfinished tasks grouped by date
- **Monthly planner**: Set goals for each month of the year
- **Chinese holidays**: Automatically shows Chinese public holidays and 24 solar terms (二十四节气)
- **School calendar sync**: Import events from an iCal URL (like university timetables)

## How to use

### Adding events
1. Click "Add event"
2. Enter start time and end time (optional)
3. Type the event title
4. Click "Note" if you want to add a note
5. Choose repeat option if it's recurring (daily, weekly, monthly)
6. Click the flag icon if it's important
7. Click "Add"

### Checking off events
Click the circle next to an event to mark it done.

### Editing or deleting events
Click the three dots (⋯) on an event, then choose Edit or Delete.

### Switching views
Use the tabs at the top: Timeline, Week, Upcoming, Planner.

### Navigating dates
- Use the arrow buttons to go to previous/next day or week
- Click the date picker to jump to any date

### Importing school calendar
1. Click the settings icon (gear) in the top right
2. Paste your iCal calendar URL
3. Click Save
4. Events will sync automatically and appear in blue

### macOS desktop widget
The `xcode` folder contains a macOS app that displays this timetable as a floating widget. To use it:
1. Open `xcode/Timetable.xcodeproj` in Xcode
2. Update the file path in `ContentView.swift` to point to your local `index.html`
3. Build and run

The widget can be resized, moved around, and made fullscreen. Right-click for options.

## Running locally

### Web version
Just open `index.html` in a browser. Works offline after first load.

### As a PWA
Visit https://jin-yidan.github.io/timetable/ and install it:
- iOS: Share → Add to Home Screen
- Android: Menu → Install app
- Desktop: Click install icon in address bar

## Data storage

Everything is stored in your browser's localStorage. Nothing is sent to any server. If you clear browser data, your events will be deleted.

## License

MIT
