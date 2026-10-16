# Hand-off Document: MistWalker

## Overview
MistWalker is a D&D campaign management tool.

## Technical Architecture
- **Framework:** React SPA (Vite)
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore (configured via `firebase-blueprint.json` and `firestore.rules`)
- **Backend/API:** Node.js Express server (`server.ts`)
- **Key Dependencies:** `react-konva` for canvas rendering.

## Important Considerations for Future Development
- **Database Schema:** Defined in `firebase-blueprint.json`. Update this file before making structural changes to the database.
- **Rules:** Security rules are maintained in `firestore.rules`.
- **AI Integration:** Uses Gemini API for AI features. Ensure API keys are managed securely via server-side proxies in `server.ts`.
- **Environment Variables:** All secrets and configuration must be managed in the `.env` file (and referenced in `.env.example`).
- **Dependencies:** Always check `package.json` for current versions and ensure compatibility when upgrading.

## Current State
- The application is functional and deployed as a web application.
- Recent changes focused on fixing `ReferenceError: Upload is not defined` by importing the `Upload` icon from `lucide-react` in `src/App.tsx`.
- Player view and synchronization features have been removed per previous requests.
