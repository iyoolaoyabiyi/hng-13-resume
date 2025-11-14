# Convex Setup & Runbook

This project now includes a Convex backend that stores guestbook reviews. Follow the steps below to get it running locally and deploy it to Convex.

## 1. Prerequisites
- Node.js 18+ and npm.
- A free Convex account (https://dashboard.convex.dev) – the CLI will prompt you to log in the first time you run it.

## 2. Install dependencies
```bash
npm install
```

## 3. Start the Convex dev environment
```bash
npm run convex:dev
```
- The first run opens a browser window so you can log in and create/select a Convex project.
- When prompted, allow the CLI to create `convex.json` – it stores the project + deployment IDs.
- Leave this process running; it watches `convex/` for changes, runs `convex codegen`, and provisions a dev deployment.

## 4. Wire up the frontend client
1. Copy the **Convex Deployment URL** printed by `convex dev` (looks like `https://xxxx.convex.cloud`).
2. Open `index.html` and scroll to the final `<script type="module">`.
3. Set the deployment URL in whichever way fits your hosting setup:
   - **.env.local** (recommended): add `CONVEX_URL=https://xxxx.convex.cloud`. The inline script now auto-loads this file (when served) and uses the value.
   - **Inline attribute**: change the script tag to `<script type="module" data-convex-url="https://xxxx.convex.cloud">`.
   - **Global variable**: add `<script>window.CONVEX_URL = "https://xxxx.convex.cloud";</script>` before the module script.
4. Refresh the page. The script imports `ConvexClient`, fetches existing reviews on load, subscribes to `reviews:getReviews`, and calls the `reviews:createReview` mutation when the form submits.

## 5. Deploy to production
1. Stop the dev server and run:
```bash
npm run convex:deploy
```
2. Choose a deployment name when prompted (e.g., `prod`).
3. Update your production frontend env var (`VITE_CONVEX_URL` / `REACT_APP_CONVEX_URL`) to the production deployment URL Convex prints at the end.

## 6. Files added in this setup
- `package.json` / `package-lock.json`: pulls in the Convex CLI and adds scripts (`convex:dev`, `convex:deploy`, `convex:codegen`).
- `convex/schema.ts`: defines the `reviews` table (name, comment, rating, createdAt).
- `convex/reviews.ts`: exposes `getReviews` and `createReview` functions consumed by the inline script in `index.html`.
- `CONVEX_SETUP.md`: this guide.

Once the Convex dev server is running and the frontend script knows the deployment URL, submitting the form on the site will create documents in the `reviews` table and stream them back in real time.
