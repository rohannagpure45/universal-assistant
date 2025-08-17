# Firebase Indexes Configuration Guide

Since the auto-generated links don't work, here's how to manually create the required indexes in Firebase Console.

## How to Create Indexes

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `universal-assis`
3. Go to **Firestore Database** → **Indexes** → **Composite**
4. Click **Create Index**
5. Use the configurations below

---

## Required Indexes to Create

### 1. Meetings by Organizer and Start Time
- **Collection ID**: `meetings`
- **Fields to index**:
  - Field: `organizerId` | Order: `Ascending`
  - Field: `startTime` | Order: `Descending`
- **Query scopes**: Collection

### 2. Meetings by Participants and Start Time  
- **Collection ID**: `meetings`
- **Fields to index**:
  - Field: `participants` | Order: `Arrays`
  - Field: `startTime` | Order: `Descending`
- **Query scopes**: Collection

### 3. Meetings by Status and Start Time
- **Collection ID**: `meetings`
- **Fields to index**:
  - Field: `status` | Order: `Ascending`
  - Field: `startTime` | Order: `Descending`
- **Query scopes**: Collection

### 4. Transcripts by Speaker ID and Timestamp
- **Collection ID**: `transcripts`
- **Fields to index**:
  - Field: `speakerId` | Order: `Ascending`
  - Field: `timestamp` | Order: `Ascending`
- **Query scopes**: Collection

### 5. Transcripts by Confidence and Timestamp
- **Collection ID**: `transcripts`
- **Fields to index**:
  - Field: `confidence` | Order: `Ascending`
  - Field: `timestamp` | Order: `Ascending`
- **Query scopes**: Collection

### 6. Voice Profiles by Default Status and Creation Date
- **Collection ID**: `voiceProfiles`
- **Fields to index**:
  - Field: `isDefault` | Order: `Ascending`
  - Field: `createdAt` | Order: `Descending`
- **Query scopes**: Collection

### 7. Custom Rules by Owner, Status, and Priority
- **Collection ID**: `customRules`
- **Fields to index**:
  - Field: `ownerId` | Order: `Ascending`
  - Field: `isActive` | Order: `Ascending`
  - Field: `priority` | Order: `Descending`
- **Query scopes**: Collection

### 8. Custom Rules by Public Status and Usage Count
- **Collection ID**: `customRules`
- **Fields to index**:
  - Field: `isPublic` | Order: `Ascending`
  - Field: `usageCount` | Order: `Descending`
- **Query scopes**: Collection

### 9. TTS Cache by Expiration Date
- **Collection ID**: `ttsCache`
- **Fields to index**:
  - Field: `expiresAt` | Order: `Ascending`
- **Query scopes**: Collection

### 10. Daily Analytics by Date
- **Collection ID**: `dailyAnalytics`
- **Fields to index**:
  - Field: `date` | Order: `Descending`
- **Query scopes**: Collection

---

## Step-by-Step Creation Process

For each index above:

1. **Click "Create Index"** in Firebase Console
2. **Enter Collection ID** (e.g., `meetings`)
3. **Add each field**:
   - Click "Add field"
   - Enter field name
   - Select order (Ascending/Descending/Arrays)
4. **Set Query scopes** to "Collection"
5. **Click "Create"**
6. **Wait for index to build** (1-5 minutes)

## Important Notes

- **Arrays**: Use "Arrays" order for fields that contain arrays (like `participants`)
- **Collection vs Collection Group**: Use "Collection" for most cases unless you need to query across subcollections
- **Build Time**: Indexes may take several minutes to build, especially for larger collections
- **Status**: You can monitor build progress in the Indexes tab

## Alternative: Using Firebase CLI

You can also create indexes using the Firebase CLI by creating a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "meetings",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "organizerId", "order": "ASCENDING"},
        {"fieldPath": "startTime", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "meetings", 
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "participants", "arrayConfig": "CONTAINS"},
        {"fieldPath": "startTime", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "meetings",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "startTime", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "transcripts",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "speakerId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "transcripts",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "confidence", "order": "ASCENDING"}, 
        {"fieldPath": "timestamp", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "voiceProfiles",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "isDefault", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "customRules",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "ownerId", "order": "ASCENDING"},
        {"fieldPath": "isActive", "order": "ASCENDING"},
        {"fieldPath": "priority", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "customRules",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "isPublic", "order": "ASCENDING"},
        {"fieldPath": "usageCount", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "ttsCache",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "expiresAt", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "dailyAnalytics", 
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "date", "order": "DESCENDING"}
      ]
    }
  ]
}
```

Then deploy with:
```bash
firebase deploy --only firestore:indexes
```

---

## Verification

After creating all indexes, you can verify they're working by running the test script again:

```bash
node scripts/generate-index-links.js
```

The queries should now succeed without any "requires an index" errors.