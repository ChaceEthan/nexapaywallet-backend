# QR API - QUICK REFERENCE

## 📍 Endpoint
```
GET /api/qr/resolve/:address
```

## 🔍 What It Does
- Validates Stellar address format
- Resolves wallet name from MongoDB
- Returns validation status and wallet info

## 💻 Quick Test
```bash
curl http://localhost:10000/api/qr/resolve/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH
```

## ✅ Success Response (Wallet Found)
```json
{
  "isValid": true,
  "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
  "name": "Alice",
  "type": "personal",
  "accountStatus": "active"
}
```

## ✅ Success Response (Wallet Not Found)
```json
{
  "isValid": true,
  "address": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
  "name": null
}
```

## ❌ Error Response (Invalid)
```json
{
  "isValid": false,
  "message": "Address must be 56 characters"
}
```

## 🛠️ Start Server
```bash
npm run dev
```

## 📁 Files Created
- `src/controllers/qrController.js`
- `src/routes/qr.js`
- `src/utils/addressValidator.js`

## ⚡ Status
✅ COMPLETE AND PRODUCTION-READY
✅ NO BREAKING CHANGES
✅ ZERO AUTH REQUIRED
