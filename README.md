# Timesheet App

A minimal and clean web app for logging work hours.  
Designed to make time tracking **simple**, **fast**, and **accessible from anywhere**.

<div align="center">
  <img src="https://user-images.githubusercontent.com/00000000/placeholder-screenshot.png" width="600" alt="UI Preview">
</div>

## Features

- **Google Sign-In** authentication (secure via Firebase Auth)
- **Add / Edit / Delete** work log entries
- Automatic **hour + week number** calculation
- **Weekly & Monthly summaries** (instant updates)
- **CSV export** for submitting work hours
- Light/Dark **theme toggle**
- Works on desktop & mobile

## Tech Stack

| Area | Technology |
|-----|------------|
| Frontend | JS, HTML, CSS |
| Backend / Auth | Firebase Authentication |
| Database | Firestore |
| Hosting | Firebase Hosting |


## Getting Started (Local Development)

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login
firebase login

# Start local dev preview with live reload
firebase emulators:start
