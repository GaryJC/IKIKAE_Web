# Admin Access Control Setup Guide

## Overview
This guide explains how to set up role-based access control for your QR code management system using Firebase Custom Claims.

## Setup Steps

### 1. Install Firebase Admin SDK
```bash
npm install firebase-admin
```

### 2. Set up Firebase Service Account
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Add the credentials to your environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Update Firebase Security Rules
Copy the updated rules from `firebase_rules.txt` to your Firebase Console:
- Go to Firestore Database → Rules
- Replace existing rules with the new ones
- Click "Publish"

### 4. Set Up Your First Admin User

#### Option A: Using the Admin Panel (Recommended)
1. Deploy your application
2. Sign in with your account
3. Go to `/admin/manage-users` (you'll need to temporarily allow access)
4. Enter your user UID and set role to "admin"

#### Option B: Using Firebase Console
1. Go to Firebase Console → Authentication → Users
2. Find your user and copy the UID
3. Use Firebase Functions or Admin SDK to set custom claims:

```javascript
// In Firebase Functions or Admin SDK
await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

### 5. Test Admin Access
1. Sign out and sign back in (to refresh tokens)
2. Go to your profile page
3. You should now see admin panel links
4. Test accessing `/admin/qr-codes` and `/admin/qr-generator`

## How It Works

### Custom Claims
- Firebase Custom Claims are stored in the user's ID token
- Claims are checked on both client and server side
- Claims persist across sessions

### Security Levels
1. **Public Access**: QR code scanning (no authentication required)
2. **User Access**: Profile management, motto creation
3. **Admin Access**: QR code management, user role management

### Role Types
- **user**: Regular users (default)
- **admin**: Can access admin panels and manage QR codes

## Files Created/Modified

### New Files
- `src/lib/adminAuth.js` - Server-side admin authentication
- `src/lib/useAdmin.js` - Client-side admin status hook
- `src/app/api/admin/set-role/route.js` - API endpoint for setting roles
- `src/app/admin/manage-users/page.js` - User role management page

### Modified Files
- `src/app/admin/qr-codes/page.js` - Added admin access check
- `src/app/admin/qr-generator/page.js` - Added admin access check
- `src/app/userProfile/page.js` - Added conditional admin links
- `firebase_rules.txt` - Updated security rules

## Security Features

### Client-Side Protection
- Admin pages check user role before rendering
- Admin links only show for admin users
- Graceful fallback for non-admin users

### Server-Side Protection
- Firebase rules enforce admin-only access to sensitive operations
- API endpoints can check admin status
- Database operations require proper permissions

### Token-Based Security
- Custom claims are embedded in Firebase ID tokens
- Claims are verified on every request
- Tokens expire and require refresh

## Troubleshooting

### Common Issues

1. **"Access Denied" on admin pages**
   - User doesn't have admin role
   - Token needs refresh (sign out and back in)
   - Check Firebase rules are updated

2. **Admin links not showing**
   - User doesn't have admin role
   - Check browser console for errors
   - Verify custom claims are set correctly

3. **Firebase permission errors**
   - Rules not updated in Firebase Console
   - User token doesn't include custom claims
   - Check Firebase Console for rule syntax errors

### Debug Steps

1. **Check User Role**
   ```javascript
   // In browser console
   const user = firebase.auth().currentUser;
   user.getIdTokenResult().then(tokenResult => {
     console.log('User role:', tokenResult.claims.role);
   });
   ```

2. **Check Firebase Rules**
   - Go to Firebase Console → Firestore → Rules
   - Verify rules are published and correct

3. **Check Environment Variables**
   - Verify Firebase service account credentials are set
   - Check for typos in environment variable names

## Best Practices

1. **Limit Admin Access**: Only grant admin roles to trusted users
2. **Regular Audits**: Periodically review admin user list
3. **Secure Credentials**: Keep service account keys secure
4. **Monitor Usage**: Watch for unusual admin activity
5. **Backup Roles**: Keep a list of admin users in a secure location

## Production Considerations

1. **Environment Variables**: Use proper secret management
2. **HTTPS Only**: Ensure all admin operations use HTTPS
3. **Rate Limiting**: Consider adding rate limiting to admin APIs
4. **Logging**: Log all admin operations for audit trails
5. **Backup**: Regular backups of user roles and permissions
