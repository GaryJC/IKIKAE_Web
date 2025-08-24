# Temporary Setup Guide (Without Firebase Admin SDK)

## Current Status
The system is temporarily configured to work without Firebase Admin SDK for initial setup and testing.

## What's Working Now

### ✅ Available Features:
- QR code generation and storage
- QR code management (linking to users)
- QR code viewing and printing
- User profile management
- Customer QR code scanning

### ⚠️ Temporary Changes:
- All authenticated users can access admin panels
- Role management shows success but doesn't actually set roles
- Admin checks are temporarily disabled

## How to Test the System

### 1. Generate QR Codes
1. Go to `/admin/qr-generator`
2. Enter a QR code ID (e.g., ABC123)
3. Click "Generate & Save QR Code"
4. QR code will be saved to database

### 2. Link QR Codes to Users
1. Go to `/admin/qr-codes`
2. Enter QR code ID
3. Click "Scan QR Code"
4. Enter user email to link

### 3. Test Customer Scanning
1. Go to `/qr/ABC123` (replace with your QR code ID)
2. Should show customer profile if linked

## Setting Up Proper Admin Access

### Option 1: Manual Firebase Console Setup
1. Go to Firebase Console → Authentication → Users
2. Find your user and copy the UID
3. Use Firebase Functions or Admin SDK to set custom claims:
   ```javascript
   await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
   ```

### Option 2: Install Firebase Admin SDK
1. Install the package:
   ```bash
   npm install firebase-admin
   ```

2. Set up service account:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download JSON file
   - Add to environment variables:
     ```env
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_CLIENT_EMAIL=your-service-account-email
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     ```

3. Enable proper admin checks:
   - Uncomment the `useAdmin` imports in admin pages
   - Replace `const isAdmin = true;` with proper admin checks
   - Uncomment the production code in `/api/admin/set-role/route.js`

## Current Workflow

### For Testing:
1. **Generate QR Code**: `/admin/qr-generator`
2. **Link to User**: `/admin/qr-codes`
3. **Customer Scan**: `/qr/{qrCodeId}`

### For Production:
1. Set up Firebase Admin SDK
2. Enable proper admin checks
3. Set up admin users through Firebase Console
4. Remove temporary bypasses

## Security Notes

⚠️ **Important**: The current setup allows any authenticated user to access admin functions. This is only for testing and initial setup.

For production:
- Set up Firebase Admin SDK
- Enable proper role-based access control
- Only grant admin access to trusted users
- Remove all temporary bypasses

## Next Steps

1. Test the current functionality
2. Set up Firebase Admin SDK when ready for production
3. Enable proper admin access control
4. Set up admin users through Firebase Console
5. Remove temporary configurations
