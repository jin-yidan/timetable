# Timetable Widget

A minimalist, offline-first productivity application for managing daily schedules, upcoming tasks, and monthly goals.

## Overview

This application is a Progressive Web App (PWA) designed to provide a streamlined interface for personal organization. It runs entirely in the browser and stores data locally, ensuring privacy and offline availability.

## Core Features

### Daily Timeline
- **Flexible Time Entry**: Supports various input formats including natural language shortcuts like "now", "+30m", or "+1h", as well as standard 24-hour time.
- **Event Organization**: Create events with optional notes and importance flags.
- **Progress Tracking**: Real-time visual feedback via a progress bar based on completed tasks.
- **Auto-complete Suggestions**: Learns from previous entries to expedite the addition of recurring events.

### Task Management
- **Upcoming View**: A consolidated list of all unfinished tasks across future dates, grouped chronologically.
- **Task Status**: Quickly toggle completion status directly from the timeline.

### Monthly Planner
- **Long-term Goals**: A dedicated view for setting and tracking objectives for each month of the year.
- **Persistence**: Goals are saved independently and can be managed through a simplified edit mode.

## Technical Specifications

- **Offline Support**: Utilizes Service Workers to cache assets, allowing the app to function without an internet connection.
- **PWA Ready**: Can be installed as a standalone application on mobile devices and desktops.
- **Local Storage**: All data remains on the user's device via the Web Storage API.
- **Typography**: Optimized for readability using the Plus Jakarta Sans typeface.

## Installation and Usage

### Accessing the App
The application is hosted via GitHub Pages and can be accessed at:
https://jin-yidan.github.io/timetable/

### Installing as an App
1. **iOS (Safari)**: Tap the Share icon and select "Add to Home Screen".
2. **Android (Chrome)**: Tap the menu icon (three dots) and select "Install app".
3. **Desktop (Chrome/Edge)**: Click the installation icon in the address bar.

### Local Execution
To run the project locally without hosting:
1. Clone the repository to your machine.
2. Open `index.html` in a modern web browser.

## License
MIT License.
