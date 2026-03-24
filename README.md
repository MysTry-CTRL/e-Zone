# e-Zone

e-Zone is a static HTML, CSS, and JavaScript website for browsing and managing books with Firebase as the backend. The project is designed for Vercel deployment and uses Firebase Authentication plus Firestore instead of local JSON files, so data remains persistent in production.

## Overview

This project was originally built around local JSON storage, which does not work reliably on Vercel serverless hosting. It has been refactored into a frontend-first Firebase app where authentication, user profiles, books, and feedback are stored in Firestore.

## Features

- Static website with no Express or Node backend
- Firebase Authentication for signup, login, logout, and session tracking
- Social sign-in with Google, Apple, Microsoft, Facebook, and GitHub through Firebase Authentication
- Branded social sign-in buttons with provider logos on the login and signup screens
- Google, Apple, Microsoft, and GitHub sign-in buttons now use local SVG logo assets for cleaner rendering
- Firestore-based storage for users, owner/admin records, books, and feedback
- Dynamic book loading on the frontend
- Feedback form that writes directly to Firestore
- Restored animated footer quick links and social links across shared pages
- Custom link-preview popup for hovered and focused links on desktop
- Owner-only access for management pages such as dashboard, logs, uploads, and purchase links
- User dashboard for normal authenticated users
- Restored custom modal system for profile customization, popups, and owner dashboard actions
- Mobile-safe fallback behavior that disables blocking custom pop-up modals on mobile browsers
- Phones now use the brand logo as a slide-out menu trigger in portrait mode while the `e-Zone` text remains a direct home link
- Compact tablets in the roughly 7 to 10 inch range use the same compact menu behavior in both portrait and landscape
- Larger tablets in the roughly 11 to 14.6 inch range use the compact menu in portrait and return to the desktop-style header in landscape
- Phone landscape mode is intentionally disabled with a rotate-back overlay so the handset UI stays portrait-only
- PCs and laptops keep the current desktop-style topbar behavior unchanged
- Shared topbar and compact-menu spacing have been tightened so responsive layouts keep cleaner gaps and alignment
- Shared page-grid and card-cell spacing has been normalized so dashboard, books, feedback, and footer layouts keep more consistent gaps across pages
- Local profile preferences such as a dark/light theme choice, avatar preview, privacy toggles, and reduced motion
- Upgraded action center with a shared dark/light theme toggle, quick links, live page context, an identity badge, and account status cards
- Vercel-friendly architecture with persistent cloud data storage

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Firebase v12 modular SDK via CDN
- Firebase Authentication
- Cloud Firestore
- Vercel

## Main Pages

- `index.html` - homepage
- `books.html` - books listing and discovery
- `book.html` - book details
- `category.html` - category-based listing
- `signup.html` - user registration
- `login.html` - user login
- `feedback.html` - feedback center
- `contact.html` - contact/support form
- `user-dashboard.html` - normal user dashboard
- `dashboard.html` - owner dashboard
- `admin.html` - upload and manage books
- `uploaded-books.html` - uploaded books overview
- `logs.html` - user and feedback activity overview
- `purchase-links.html` - books with external links

## Firestore Collections

The site currently uses these main collections:

- `users` - user profiles synced after signup/login
- `admins` - owner/admin profile records
- `books` - uploaded book records
- `feedback` - user feedback and contact submissions

## Project Structure

```text
.
|-- index.html
|-- books.html
|-- book.html
|-- category.html
|-- signup.html
|-- login.html
|-- feedback.html
|-- contact.html
|-- dashboard.html
|-- admin.html
|-- logs.html
|-- uploaded-books.html
|-- purchase-links.html
|-- user-dashboard.html
|-- style.css
|-- script.js
|-- firebase.js
|-- package.json
```

## How It Works

- `firebase.js` initializes Firebase and exposes Firebase Auth and Firestore helpers
- `script.js` handles page logic, authentication state, Firestore reads/writes, and UI updates
- All pages load the shared frontend logic through a module script
- Books and feedback are fetched dynamically from Firestore
- Authenticated users can submit feedback
- The reserved owner account gets access to admin-only pages and controls
- The restored custom modal system is injected and managed from the shared frontend script
- On mobile browsers, blocking custom modal popups are replaced with inline notices or normal page navigation
- On phones in portrait mode, the topbar logo opens a slide-out menu containing the current topbar links except the action center and theme toggle
- On compact tablets in the roughly 7 to 10 inch range, the same compact slide-out menu stays active in both portrait and landscape
- On larger tablets in the roughly 11 to 14.6 inch range, portrait stays compact while landscape returns to the current desktop-style topbar
- On phones in landscape mode, the interface shows a portrait-only overlay instead of trying to support a landscape layout
- On PCs and laptops, the current desktop header and navigation stay unchanged
- Profile customization preferences are stored locally in the browser so they persist across reloads
- The action center is enhanced from the shared script so every page gets the same quick links, live stats, a dark/light-only theme toggle, and an identity badge with avatar plus role
- Shared footer links are enhanced from the frontend script so hover animations and social link pills stay consistent across pages
- Desktop links now show a custom in-page preview popup with the resolved link target when hovered or focused

## Authentication Notes

- Normal users register through `signup.html`
- The reserved owner account signs in directly through `login.html`
- Owner registration is blocked from the public signup form
- Login and signup screens also support Google, Apple, Microsoft, Facebook, and GitHub sign-in
- If Firestore profile syncing fails after authentication, the session can still continue with a local fallback profile

## Important Security Note

- Firebase web app config values are safe to expose in the frontend.
- Real admin or owner credentials should not be published in your GitHub README or shared publicly.
- For production use, manage sensitive credentials privately in Firebase Authentication and review your Firestore rules carefully.

## Author

Built for the e-Zone website project.
