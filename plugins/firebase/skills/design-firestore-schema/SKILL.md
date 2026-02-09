---
name: design-firestore-schema
description: Data modeling patterns, subcollections, denormalization, and security rules for Firestore
---

# Design Firestore Schema

## Description

Design and implement a Firestore data model with proper collection structures, security rules, and composite indexes optimized for your application's query patterns.

## Prerequisites

- Firebase project initialized (`firebase init firestore`)
- Firebase Emulator Suite configured for local testing
- Understanding of the application's primary query patterns

## Steps

### 1. Identify Query Patterns

Before designing your schema, list every query your application will perform. Firestore schemas are designed around queries, not entity relationships.

Common questions to answer:
- What data does each screen/page need?
- Which fields will be used for filtering and sorting?
- What are the access control requirements per collection?
- How frequently will each document be read vs. written?

### 2. Design the Collection Hierarchy

Organize data into collections and subcollections based on query patterns and access control boundaries.

**Pattern: Root Collections** — Use when data is queried independently across the entire app.

```
├── users/{userId}
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
├── posts/{postId}
│   ├── title: string
│   ├── content: string
│   ├── authorId: string
│   ├── authorName: string    ← denormalized for display
│   ├── tags: array<string>
│   ├── status: string ("draft" | "published")
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
```

**Pattern: Subcollections** — Use for 1:N relationships where child data is queried within a parent scope.

```
├── posts/{postId}
│   └── comments/{commentId}    ← subcollection
│       ├── text: string
│       ├── authorId: string
│       ├── authorName: string
│       └── createdAt: timestamp
```

**Pattern: Denormalization** — Duplicate data across documents to support queries without joins.

```
├── posts/{postId}
│   ├── authorId: string
│   ├── authorName: string        ← duplicated from users/{authorId}
│   └── authorPhotoURL: string    ← duplicated from users/{authorId}
```

Keep denormalized data up to date with Cloud Functions triggers:

```typescript
export const onUserUpdated = onDocumentUpdated("users/{userId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if (before.displayName !== after.displayName || before.photoURL !== after.photoURL) {
    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", event.params.userId)
    );
    const posts = await getDocs(postsQuery);
    const batch = writeBatch(db);
    posts.docs.forEach((doc) => {
      batch.update(doc.ref, {
        authorName: after.displayName,
        authorPhotoURL: after.photoURL,
      });
    });
    await batch.commit();
  }
});
```

### 3. Define Data Validation in Security Rules

Write security rules that validate every field on create and update operations.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId)
        && request.resource.data.keys().hasAll(["displayName", "email", "createdAt"])
        && request.resource.data.displayName is string
        && request.resource.data.displayName.size() > 0
        && request.resource.data.displayName.size() <= 100
        && request.resource.data.email is string
        && request.resource.data.createdAt == request.time;
      allow update: if isOwner(userId)
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(["displayName", "photoURL", "updatedAt"])
        && request.resource.data.updatedAt == request.time;
      allow delete: if false;
    }

    match /posts/{postId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 200
        && request.resource.data.status in ["draft", "published"]
        && request.resource.data.createdAt == request.time;
      allow update: if isOwner(resource.data.authorId);
      allow delete: if isOwner(resource.data.authorId);

      match /comments/{commentId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated()
          && request.resource.data.authorId == request.auth.uid
          && request.resource.data.text is string
          && request.resource.data.text.size() > 0
          && request.resource.data.text.size() <= 5000;
        allow delete: if isOwner(resource.data.authorId);
      }
    }
  }
}
```

### 4. Create Composite Indexes

Define composite indexes in `firestore.indexes.json` for queries that filter or order on multiple fields.

```json
{
  "indexes": [
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

### 5. Implement Type-Safe Data Access Layer

Create a typed data access layer using Firestore converters:

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";

// Types
interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Converter
const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: User): DocumentData {
    const { id, ...data } = user;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): User {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      displayName: data.displayName,
      email: data.email,
      photoURL: data.photoURL,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// Typed collection reference
const usersRef = collection(db, "users").withConverter(userConverter);

// Typed queries
async function getUserById(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(usersRef, userId));
  return snap.exists() ? snap.data() : null;
}

async function getRecentUsers(pageSize = 25, lastDoc?: QueryDocumentSnapshot): Promise<User[]> {
  let q = query(usersRef, orderBy("createdAt", "desc"), limit(pageSize));
  if (lastDoc) {
    q = query(usersRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}
```

### 6. Test with the Emulator

Start the Firestore emulator:

```bash
firebase emulators:start --only firestore
```

Write and run security rule tests:

```bash
npm test
```

## Validation

- Verify all queries return expected results in the Emulator UI
- Run security rule unit tests — all must pass
- Deploy indexes with `firebase deploy --only firestore:indexes` and verify no errors
- Test pagination with datasets larger than the page size
- Verify denormalized data updates propagate correctly via Cloud Functions
