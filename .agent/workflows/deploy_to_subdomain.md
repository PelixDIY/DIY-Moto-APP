---
description: Deploy app to Firebase Hosting with custom domain
---
# Deploying to app.diymotoservice.com

Since you are using Firebase for the database and auth, the best way to host your app is **Firebase Hosting**.

## Prerequisites
You need the Firebase CLI established.

## Step 1: Install & Login
If you haven't already:
```bash
npm install -g firebase-tools
firebase login
```

## Step 2: Initialize Hosting
1. Run the initialization command:
   ```bash
   firebase init hosting
   ```
2. **Select options**:
   - **Project**: Select your existing Firebase project (where your DB is).
   - **Public directory**: Type `dist` (this is important, Vite builds to 'dist').
   - **Configure as a single-page app?**: `Yes` (Important for React Router).
   - **Set up automatic builds and deploys with GitHub?**: `No` (for now).
   - **Overwrite index.html?**: `No`.

## Step 3: Build & Deploy
1. Build your latest code:
   ```bash
   npm run build
   ```
2. Deploy to the web:
   ```bash
   firebase deploy
   ```

## Step 4: Connect Domain
1. Go to the [Firebase Console](https://console.firebase.google.com).
2. Navigate to **Hosting** in the sidebar.
3. Click **Add Custom Domain**.
4. Enter `app.diymotoservice.com`.
5. Firebase will give you **DNS Records** (usually A records or TXT records).
6. Go to your domain registrar (where you bought `diymotoservice.com`) and add these records.
7. Wait for verification (can take up to 24h, usually faster).

Once verified, your app will be live at `https://app.diymotoservice.com`!
