# e-Zone

e-Zone is a static HTML, CSS, and JavaScript website for browsing and managing books with Firebase as the backend. The project is designed for Vercel deployment and uses Firebase Authentication plus Firestore instead of local JSON files, so data remains persistent in production.

## Overview

This project was originally built around local JSON storage, which does not work reliably on Vercel serverless hosting. It has been refactored into a frontend-first Firebase app where authentication, user profiles, books, and feedback are stored in Firestore.

## Features

- Static website with no Express or Node backend
- Firebase Authentication for signup, login, logout, and session tracking
- Firestore-based storage for users, owner/admin records, books, and feedback
- Dynamic book loading on the frontend
- Feedback form that writes directly to Firestore
- Owner-only access for management pages such as dashboard, logs, uploads, and purchase links
- User dashboard for normal authenticated users
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

## Firebase Setup

1. Create a Firebase project.
2. Enable `Authentication > Sign-in method > Email/Password`.
3. Create a Firestore database.
4. Open `firebase.js` and replace the config values if you are using your own Firebase project.
5. Add Firestore rules that allow public book reads and authenticated writes as needed.

Example starter rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /books/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /feedback/{doc} {
      allow read, write: if request.auth != null;
    }

    match /users/{doc} {
      allow read, write: if request.auth != null;
    }

    match /admins/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Run Locally

This is a static site, so there is no build step and no backend server to start.

You can run it with any static file server, for example:

1. Open the folder in VS Code.
2. Use the Live Server extension, or any static hosting tool you prefer.
3. Visit the local URL in your browser.

## Deploy on Vercel

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Deploy it as a static site.
4. Make sure your Firebase project is configured and your Firestore/Auth rules are ready.

No custom Node server is required.

## Important Security Note

- Firebase web app config values are safe to expose in the frontend.
- Real admin or owner credentials should not be published in your GitHub README or shared publicly.
- For production use, manage sensitive credentials privately in Firebase Authentication and review your Firestore rules carefully.

## Future Improvements

- Move book cover and QR uploads to Firebase Storage
- Add search and filtering improvements
- Add update/news posts from the owner
- Add stronger role-based Firestore rules
- Add analytics and audit logging

## Author

Built for the e-Zone website project.
