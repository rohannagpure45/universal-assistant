#!/bin/bash
# Firebase Permissions Validation Script
# Run this after setting up permissions

echo "🔍 Validating Firebase permissions..."

echo "1. Testing gcloud authentication..."
gcloud auth list

echo "2. Testing project access..."
gcloud projects describe universal-assis

echo "3. Testing service account impersonation..."
gcloud auth activate-service-account --key-file=path/to/serviceAccountKey.json

echo "4. Testing Firebase APIs..."
gcloud services list --enabled --project=universal-assis | grep -E "(firebase|firestore|identitytoolkit)"

echo "5. Testing IAM policy..."
gcloud projects get-iam-policy universal-assis --flatten="bindings[].members" --filter="bindings.members:serviceAccount:firebase-adminsdk-fbsvc@universal-assis.iam.gserviceaccount.com"

echo "✅ Validation complete!"
