# QR Code Workflow Documentation

## Overview
This system allows customers to scan QR codes on their t-shirts to access their personal profile page with their motto.

## Business Workflow

### 1. Production Phase
- QR codes are pre-generated during t-shirt production
- Each t-shirt gets a unique QR code ID (e.g., ABC123, XYZ789)
- QR codes are printed on t-shirt labels

### 2. Customer Onboarding
- Customer purchases t-shirt and creates account
- Customer creates their personal motto
- Customer receives t-shirt with QR code

### 3. Business Operator Linking
- Business operator scans QR code on t-shirt label
- Operator enters customer's email to link QR code to customer
- QR code is now linked to customer's profile

### 4. Customer Usage
- Customer scans QR code on their t-shirt
- Goes directly to their profile page showing their motto
- No login required for profile viewing

## Technical Implementation

### Files Created/Modified

1. **`src/lib/mottoService.js`** - Added QR code management functions
2. **`src/app/admin/qr-codes/page.js`** - Admin panel for linking QR codes
3. **`src/app/admin/qr-generator/page.js`** - QR code generation tool
4. **`src/app/qr/[qrCodeId]/page.js`** - Customer profile access page
5. **`src/app/api/qr-codes/route.js`** - API endpoint for QR code URLs
6. **`src/app/userProfile/page.js`** - Added admin panel links

### Database Structure

#### QR Codes Collection
```javascript
{
  qrCodeId: "ABC123",           // Unique QR code identifier
  isLinked: true,               // Whether QR code is linked to a user
  linkedUserEmail: "user@example.com", // Customer email
  linkedAt: timestamp,          // When QR code was linked
  createdAt: timestamp          // When QR code was created
}
```

### Key Functions

#### For Business Operators
- `linkQRCodeToUser(qrCodeId, userEmail)` - Links QR code to customer
- `getAllQRCodes()` - Gets all QR codes for management
- `getQRCodeById(qrCodeId)` - Gets specific QR code details

#### For Customers
- `getUserProfileByQRCode(qrCodeId)` - Gets customer profile by QR code

## Usage Instructions

### For Production Team
1. Go to `/admin/qr-generator`
2. Enter the QR code ID that will be printed on t-shirt
3. Generate QR code and print for t-shirt labeling
4. QR code URL format: `https://yoursite.com/qr/ABC123`

### For Business Operators
1. Go to `/admin/qr-codes`
2. Enter QR code ID from t-shirt label
3. Click "Scan QR Code"
4. Enter customer email to link QR code
5. QR code is now linked to customer

### For Customers
1. Scan QR code on t-shirt with phone
2. View personal profile with motto
3. No login required

## URL Structure

- **QR Code URLs**: `https://yoursite.com/qr/{qrCodeId}`
- **Admin Panel**: `https://yoursite.com/admin/qr-codes`
- **QR Generator**: `https://yoursite.com/admin/qr-generator`

## Security Considerations

- QR codes are public and can be scanned by anyone
- Only linked QR codes show customer profiles
- Unlinked QR codes show error message
- No sensitive customer data exposed

## Error Handling

- **Unlinked QR Code**: Shows "QR code not linked to any user"
- **Invalid QR Code**: Shows "QR code not found"
- **No User Profile**: Shows "User profile not found"

## Future Enhancements

1. **Admin Authentication**: Add role-based access for admin functions
2. **QR Code Analytics**: Track QR code scans and usage
3. **Bulk Operations**: Link multiple QR codes at once
4. **QR Code Expiration**: Add expiration dates for QR codes
5. **Customer Notifications**: Notify customers when QR code is linked

## Installation

1. Install QR code library:
   ```bash
   npm install react-qr-code
   ```

2. Deploy the application
3. Set up Firebase Firestore with the required collections
4. Test the workflow with sample QR codes

## Testing

1. Generate a test QR code using `/admin/qr-generator`
2. Create a test customer account and motto
3. Link QR code to customer using `/admin/qr-codes`
4. Scan QR code to verify customer profile access
