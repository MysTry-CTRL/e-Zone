# e-Zone 📚✨

A playful futuristic ebook platform (Bangla + English) powered by **Firebase Auth + Firestore**.

## What This Project Uses 🚀
- HTML + CSS + JavaScript (no custom backend)
- Firebase Authentication
- Cloud Firestore for live data sync
- Responsive UI for mobile, tablet, laptop, and desktop

## Latest Update Log ✅ (2026-03-27)
### Follow-up Hotfix 🔧 (2026-03-28)
- Mobile compact header now keeps controls visible:
  - Logged-in users see account/action controls + theme toggle.
  - Guests see Login / Sign Up controls.
- Increased global card/cell spacing variables again to remove tight/broken-looking sections.
- Added extra footer hover safeguards to prevent jittery hover effects.

### Hover + Filter Fix 🔥 (2026-03-28)
- Removed footer elements from global hover-lift rules that were causing broken hover animations.
- Added a hard footer stability rule so footer columns do not jump on hover.
- Moved the main `books.html` Search/Filter section above category shelves.
- Added a JS “self-heal” step so uploaded-books filter/search panel stays above the uploaded list even after markup edits.

### UI / Layout 🎨
- Fixed inconsistent spacing between cards/cells so sections look cleaner and less cramped.
- Added stronger shared spacing rules for category grids, discovery lists, and upload lists.
- Moved **Uploaded Books** search/filter controls to appear **above** the uploaded books list.

### Hover / Footer 🦶✨
- Stabilized footer hover behavior by isolating footer links from the global hover transform stack.
- Reduced footer hover conflicts that caused jitter/jumpy animation.

### Mobile Topbar + Access 📱
- Mobile compact menu now includes missing account controls for logged-in users.
- Mobile menu now guarantees **Login** and **Sign Up** links for guests.
- Added mobile action entries:
  - `My Account`
  - `Theme Toggle` (logged-in only)
  - `Notifications`

### Theme Rules 🌗
- Theme pill toggle is now rendered only for authenticated users.
- Guests no longer see theme toggle until login/signup is completed.

### Owner Update Notifications 🔔
- Added a universal notification button in the header control area.
- Notifications read from Firestore collection: `ownerUpdates`.
- Added **Owner Updates modal** to show recent owner announcements.
- Added owner publish form on `dashboard.html`:
  - `Update Title`
  - `Update Message`
  - Saves directly to Firestore and updates notification feed.

## Firestore Collections 🧠
- `users`
- `admins`
- `books`
- `feedback`
- `ownerUpdates` ✨ (new)

## Important Security Note 🔐
- Owner credentials are fixed in app logic and must remain hidden from public UI.
- Keep sensitive account details out of public docs/screenshots.

## Pages 🗂️
`index.html`, `books.html`, `book.html`, `category.html`, `about.html`, `contact.html`, `login.html`, `signup.html`, `feedback.html`, `dashboard.html`, `admin.html`, `uploaded-books.html`, `logs.html`, `purchase-links.html`, `user-dashboard.html`

---
Made for e-Zone with care 💙😎
