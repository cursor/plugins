---
name: setup-firebase
description: Project initialization, SDK setup, emulator configuration, and deployment for Firebase
---

# Setup Firebase Project

## Description

Initialize a new Firebase project with the Firebase CLI, configure services (Firestore, Auth, Cloud Functions, Hosting, Storage), set up the Firebase Emulator Suite for local development, and prepare for deployment.

## Prerequisites

- Node.js 18+ installed
- A Google account with access to the Firebase Console
- Firebase CLI installed (`npm install -g firebase-tools`)

## Steps

### 1. Install the Firebase CLI

```bash
npm install -g firebase-tools
```

Verify the installation:

```bash
firebase --version
```

### 2. Authenticate with Firebase

```bash
firebase login
```

This opens a browser window for Google account authentication. For CI environments, use:

```bash
firebase login:ci
```

### 3. Create a Firebase Project

Create a new project via the Firebase Console (https://console.firebase.google.com) or use the CLI:

```bash
firebase projects:create my-project-id --display-name "My Project"
```

### 4. Initialize Firebase in Your Project Directory

```bash
mkdir my-firebase-app && cd my-firebase-app
firebase init
```

Select the services you need:
- **Firestore** — Database rules and indexes
- **Functions** — Cloud Functions (TypeScript recommended)
- **Hosting** — Static site hosting
- **Storage** — Cloud Storage rules
- **Emulators** — Local development emulators

Alternatively, initialize specific services directly:

```bash
firebase init firestore functions hosting storage emulators
```

### 5. Configure Firestore

After initialization, you will have:
- `firestore.rules` — Security rules file
- `firestore.indexes.json` — Composite index definitions
- `firebase.json` — Project configuration

Set up initial security rules in `firestore.rules`:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Configure Cloud Functions

Navigate to the functions directory and install dependencies:

```bash
cd functions
npm install
```

Set the Node.js runtime version in `functions/package.json`:

```json
{
  "engines": {
    "node": "20"
  }
}
```

Create your first function in `functions/src/index.ts`:

```typescript
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

export const helloWorld = onRequest((req, res) => {
  res.json({ message: "Hello from Firebase Cloud Functions!" });
});

export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  console.log("New user created:", snapshot.id, snapshot.data());
});
```

### 7. Set Up Firebase Emulators

Configure emulators in `firebase.json`:

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

Start the emulators:

```bash
firebase emulators:start
```

Access the Emulator UI at `http://localhost:4000`.

### 8. Configure the Firebase SDK in Your App

Install the Firebase SDK:

```bash
npm install firebase
```

Initialize Firebase in your application:

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators in development
if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
}
```

### 9. Deploy to Firebase

Deploy all services:

```bash
firebase deploy
```

Deploy specific services:

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only storage
```

### 10. Set Up Multiple Environments

Use Firebase project aliases for staging and production:

```bash
firebase use --add        # Add a project alias
firebase use staging      # Switch to staging
firebase use production   # Switch to production
```

Configure environment-specific settings in `.firebaserc`:

```json
{
  "projects": {
    "staging": "my-project-staging",
    "production": "my-project-production"
  }
}
```

## Validation

- Run `firebase emulators:start` and verify the Emulator UI loads at `http://localhost:4000`
- Create a test document in Firestore via the Emulator UI
- Trigger a Cloud Function and check the emulator logs
- Deploy to a staging project and verify all services are running
