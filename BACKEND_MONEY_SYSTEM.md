# NexaPay Backend Money System - Architecture & Implementation Guide

## Overview

This document outlines the production-ready financial transaction system for NexaPay. The system is designed for testnet deployment now with seamless mainnet upgrade path.

---

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│         Frontend (QR Scanner)           │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  Transaction API    │
        │  (Backend Routes)   │
        └────────┬────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌──────────────┐      ┌──────────────┐
│ Transaction  │      │ Fee Service  │
│ Service      │      │              │
└──┬───────────┘      └──────────────┘
   │
   ├─→ Wallet Profile Service
   ├─→ Fee Calculation
   ├─→ Balance Validation
   ├─→ Stellar Transaction Building
   ├─→ Server-Side Signing
   └─→ Network Submission
        │
        └─→ Stellar Horizon API (Testnet/Mainnet)
             │
             ├─→ Transaction Submission
             ├─→ Account Queries
             └─→ Balance Checks
        
MongoDB
├─→ User (existing)
├─→ Transaction (enhanced)
├─→ WalletProfile (new)
└─→ KVStore (existing)
```

### Key Design Principles

1. **Backend-Only Signing** - Secret keys never exposed to frontend
2. **Configurable Network** - Single codebase for testnet and mainnet
3. **Identity Resolution** - Wallet addresses mapped to user names
4. **Fee Deduction** - Platform fee handled transparently
5. **Transaction Recording** - All transactions logged for audit

---

## 📁 File Structure

```
src/
├── config/
│   ├── db.js              (MongoDB connection)
│   └── network.js         (NEW: Stellar network config)
│
├── models/
│   ├── User.js            (existing)
│   ├── Transaction.js     (UPDATED: added fees, identity fields)
│   └── WalletProfile.js   (NEW: wallet identity mapping)
│
├── services/
│   ├── transactionService.js  (NEW: core transaction engine)
│   ├── feeService.js          (NEW: fee calculations)
│   ├── walletProfileService.js (NEW: wallet identity resolution)
│   └── binance.js             (existing)
│
├── routes/
│   ├── auth.js            (existing)
│   ├── wallet.js          (existing)
│   ├── transaction.js     (NEW: transaction API endpoints)
│   ├── kv.js              (existing)
│   └── market.js          (existing)
│
├── controllers/
│   ├── authController.js  (UPDATED: include walletAddress in token)
│   ├── walletController.js (existing)
│   └── kvController.js    (existing)
│
└── middleware/
    └── auth.js            (existing)
```

---

## 🔌 API Endpoints

### Transaction Endpoints

#### **POST /api/transaction**
Send XLM with platform fee deduction.

**Request:**
```json
{
  "toAddress": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
  "amount": "100.5",
  "memo": "Payment for service"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Transaction sent successfully",
  "transaction": {
    "_id": "...",
    "from": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
    "fromName": "Alice",
    "to": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
    "toName": "Bob",
    "amount": "100.5",
    "fee": "0.1005",
    "feePercentage": 0.1,
    "asset": "XLM",
    "type": "sent",
    "status": "success",
    "txHash": "abc123def456...",
    "timestamp": "2025-04-20T13:56:44.529Z"
  },
  "txHash": "abc123def456..."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Insufficient funds",
  "error": "Balance: 50 XLM, Required: 100.6005 XLM"
}
```

---

#### **GET /api/transactions/:address**
Get transaction history with identity resolution.

**Query Parameters:**
- `limit`: Number of records (default 50, max 100)
- `skip`: Pagination offset (default 0)

**URL Example:**
```
GET /api/transactions/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH?limit=10&skip=0
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "transactions": [
    {
      "txHash": "abc123def456...",
      "type": "sent",
      "senderAddress": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
      "senderName": "Alice",
      "receiverAddress": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
      "receiverName": "Bob",
      "amount": "100.5",
      "fee": "0.1005",
      "totalDeduction": "100.6005",
      "status": "success",
      "timestamp": "2025-04-20T13:56:44.529Z",
      "memo": "Payment for service"
    }
  ]
}
```

---

#### **GET /api/resolve-address/:address**
Resolve wallet address to identity (for QR scanner).

**URL Example:**
```
GET /api/resolve-address/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH
```

**Response (Registered):**
```json
{
  "success": true,
  "profile": {
    "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
    "isValid": true,
    "name": "Alice",
    "description": "Mobile wallet user",
    "type": "personal",
    "accountStatus": "active",
    "isVerified": false,
    "createdAt": "2025-04-20T13:56:44.529Z"
  }
}
```

**Response (Unregistered):**
```json
{
  "success": true,
  "profile": {
    "address": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
    "isValid": true,
    "name": "Unknown",
    "accountStatus": "unknown",
    "message": "Wallet not registered in system"
  }
}
```

---

#### **POST /api/wallet-profile**
Create/update wallet profile mapping.

**Request:**
```json
{
  "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
  "name": "Alice Wallet",
  "description": "My primary wallet"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet profile saved",
  "profile": {
    "_id": "...",
    "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
    "name": "Alice Wallet",
    "description": "My primary wallet",
    "type": "personal",
    "accountStatus": "active",
    "userId": "...",
    "isVerified": false
  }
}
```

---

#### **GET /api/wallet-profiles**
Get all profiles for authenticated user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "profiles": [
    {
      "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
      "name": "Alice Primary",
      "type": "personal"
    },
    {
      "address": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
      "name": "Alice Business",
      "type": "business"
    }
  ]
}
```

---

#### **DELETE /api/wallet-profile/:address**
Delete wallet profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted"
}
```

---

## 💰 Fee System

### Fee Calculation Logic

```
Transaction Amount:     100 XLM
Fee Percentage:         0.1%
Calculated Fee:         100 * 0.1 / 100 = 0.1 XLM
Total Deduction:        100 + 0.1 = 100.1 XLM
Receiver Gets:          100 XLM
Platform Keeps:         0.1 XLM
```

### Configuration

**In `.env`:**
```env
PLATFORM_FEE_PERCENTAGE=0.1    # Default 0.1% (can be 0-100)
```

### Fee Service API

```javascript
// Calculate fee for amount
const fee = feeService.calculateFee("100");  // Returns "0.1"

// Get total deduction (amount + fee)
const deduction = feeService.calculateTotalDeduction("100");
// Returns { amount: "100", fee: "0.1", totalDeduction: "100.1" }

// Validate sufficient funds
const check = feeService.validateSufficientFunds("150", "100");
// Returns { isValid: true, reason: "Sufficient funds" }

// Format fee for display
const display = feeService.formatFeeDisplay("100", "0.1");
// Returns "0.1 XLM (0.1%)"
```

---

## 🔐 Security

### Secret Key Handling

**CRITICAL: Secret keys are NEVER exposed to frontend**

```javascript
// Backend ONLY - in transactionService.js
function signTransaction(transaction, secretKey) {
  if (!secretKey.startsWith("S")) {
    throw new Error("Invalid secret key");
  }
  const keypair = StellarSDK.Keypair.fromSecret(secretKey);
  transaction.sign(keypair);
  return transaction;
}
```

The secret key is:
- Loaded from `process.env.STELLAR_SECRET_KEY` (server-side only)
- Never logged or exposed
- Used only for signing transactions
- Immediately discarded after signing

### Input Validation

All endpoints validate:
- Stellar address format (56 characters, starts with G or S)
- Amount is positive number
- Memo length ≤ 28 bytes
- Addresses are not identical

### Authentication

All transaction endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

---

## 🌐 Network Configuration

### Testnet (Development)

**In `.env`:**
```env
STELLAR_NETWORK=testnet
```

**Endpoints:**
- Horizon: `https://horizon-testnet.stellar.org`
- Soroban RPC: `https://soroban-rpc-testnet.stellar.org`

### Mainnet (Production)

**In `.env`:**
```env
STELLAR_NETWORK=mainnet
```

**Endpoints:**
- Horizon: `https://horizon.stellar.org`
- Soroban RPC: `https://soroban-rpc.stellar.org`

### Network Module

```javascript
// src/config/network.js
const { getNetwork, getHorizonUrl } = require("../config/network");

const network = getNetwork();  // Returns testnet or mainnet config
const horizonUrl = getHorizonUrl();  // Appropriate URL for network
```

---

## 💾 Database Schema

### Transaction Collection

```javascript
{
  _id: ObjectId,
  from: String,                // Sender address
  fromName: String,            // Sender display name
  to: String,                  // Receiver address
  toName: String,              // Receiver display name
  amount: String,              // Amount sent (in XLM)
  fee: String,                 // Platform fee deducted
  feePercentage: Number,       // Fee % used (0.1)
  asset: String,               // "XLM" (extensible)
  type: String,                // "sent" or "received"
  status: String,              // "pending", "success", "failed"
  txHash: String,              // Stellar transaction hash (unique)
  ledger: Number,              // Stellar ledger sequence
  errorMessage: String,        // Error if failed
  metadata: Object,            // { memo: "...", etc }
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `from, createdAt` - Fast sender history queries
- `to, createdAt` - Fast receiver history queries
- `txHash` - Fast transaction lookup
- `status` - Fast status filtering

### WalletProfile Collection

```javascript
{
  _id: ObjectId,
  address: String,             // Stellar address (unique)
  name: String,                // Display name
  description: String,         // Optional description
  type: String,                // "personal", "business", "service"
  accountStatus: String,       // "active", "inactive", "frozen"
  userId: ObjectId,            // Link to User (optional)
  isVerified: Boolean,         // Verification flag
  avatarUrl: String,           // Future: profile picture
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `address` - Fast lookup by address
- `userId` - Fast lookup by user

---

## 🔄 Transaction Flow

### Full Transaction Lifecycle

```
1. Frontend QR Scanner
   └─→ Reads address + amount
   └─→ Calls POST /api/transaction

2. Backend Validation
   ├─→ Verify JWT token
   ├─→ Validate sender address format
   ├─→ Validate receiver address format
   ├─→ Validate amount is positive
   └─→ Check addresses not identical

3. Balance Check
   ├─→ Query Stellar Horizon API
   ├─→ Get sender account details
   ├─→ Check balance >= amount + fee
   ├─→ Query receiver exists on network
   └─→ Throw error if insufficient funds

4. Fee Calculation
   ├─→ Apply PLATFORM_FEE_PERCENTAGE
   ├─→ Calculate: fee = amount * (percent / 100)
   ├─→ Calculate: totalDeduction = amount + fee
   └─→ Validate precision (7 decimal places)

5. Transaction Building
   ├─→ Build Stellar transaction envelope
   ├─→ Add payment operation
   ├─→ Add memo (if provided)
   ├─→ Set timeout (300 seconds)
   └─→ Ready for signing

6. Server-Side Signing
   ├─→ Load secret key from ENV (server-only)
   ├─→ Create keypair from secret
   ├─→ Sign transaction
   ├─→ Discard secret key
   └─→ Return signed transaction

7. Network Submission
   ├─→ Submit to Stellar Horizon
   ├─→ Wait for response
   ├─→ Get transaction hash + ledger
   └─→ Handle submission errors

8. Database Recording
   ├─→ Resolve sender name
   ├─→ Resolve receiver name
   ├─→ Create Transaction record
   ├─→ Store txHash, fee, status
   └─→ Save to MongoDB

9. Response to Frontend
   ├─→ Return transaction object
   ├─→ Include txHash for tracking
   └─→ Include fee breakdown

10. Frontend Confirmation
    ├─→ Show transaction hash
    ├─→ Display fee
    ├─→ Add to transaction history
    └─→ Update balance
```

---

## 🧪 Testing

### Test Scenarios

1. **Valid Transaction**
   - Sufficient balance
   - Valid addresses
   - Successful submission

2. **Insufficient Funds**
   - Balance < amount + fee
   - Proper error message
   - No transaction recorded

3. **Invalid Address**
   - Invalid format (not 56 chars)
   - Unregistered sender
   - Proper validation errors

4. **Receiver Not Found**
   - Address not on network
   - Proper error handling

5. **Fee Precision**
   - Test various amounts
   - Verify 7 decimal precision
   - Check rounding

### Example Test Command

```bash
# Test sending transaction
curl -X POST http://localhost:10000/api/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "toAddress": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
    "amount": "50.25",
    "memo": "Test payment"
  }'

# Get transaction history
curl http://localhost:10000/api/transactions/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH

# Resolve address
curl http://localhost:10000/api/resolve-address/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH
```

---

## 🚀 Deployment

### Testnet Deployment

1. **Environment Setup**
   ```env
   STELLAR_NETWORK=testnet
   STELLAR_SECRET_KEY=S...      # Testnet account secret
   PLATFORM_FEE_PERCENTAGE=0.1
   ```

2. **Fund Testnet Account**
   ```bash
   # Go to https://developers.stellar.org/docs/testnet-reset
   # Create testnet account if needed
   # Friendbot will fund with 10,000 XLM
   ```

3. **Run Backend**
   ```bash
   npm start
   ```

### Mainnet Deployment (Future)

1. **Update Environment**
   ```env
   STELLAR_NETWORK=mainnet
   STELLAR_SECRET_KEY=S...      # Mainnet account secret
   PLATFORM_FEE_PERCENTAGE=0.5  # Can adjust for mainnet
   ```

2. **No Code Changes Required** - Network module handles switching

3. **Backup & Test**
   - Test on testnet first
   - Verify transactions on Stellar Expert
   - Keep secret key in secure vault

---

## 📊 Monitoring

### Key Metrics

1. **Transaction Success Rate** - % of successful submissions
2. **Average Fee** - Verify fee calculations
3. **Balance Query Time** - Monitor Stellar API latency
4. **Failed Transactions** - Error reasons breakdown
5. **Identity Resolution** - % of known vs unknown wallets

### Logs to Monitor

```javascript
// Transaction submission
console.log("Transaction submitted:", txHash);

// Fee calculation
console.log("Fee calculated:", fee, "for amount:", amount);

// Name resolution
console.log("Resolved:", address, "→", name);

// Network errors
console.error("Stellar API error:", error.message);
```

---

## 🔄 Future Enhancements

1. **Multi-Asset Support** - Support NEX token, other assets
2. **Advanced Fee Tiers** - Different fees for different user types
3. **Transaction Limits** - Rate limiting, daily caps
4. **Webhook Notifications** - Real-time transaction updates
5. **Transaction Batching** - Process multiple transactions
6. **Advanced Analytics** - User patterns, trending
7. **Escrow Transactions** - Conditional transfers
8. **Atomic Swaps** - DEX integration

---

## ⚠️ Important Notes

- **Secret Key Security**: Never log or expose `STELLAR_SECRET_KEY`
- **Precision**: Stellar uses 7 decimal places, maintain throughout
- **Testnet Testing**: Always test thoroughly on testnet first
- **Rate Limiting**: Consider adding rate limits in production
- **Audit Logging**: All transactions logged for compliance
- **Fee Strategy**: Review and adjust fee percentage based on usage

---

## 📞 Support

For questions or issues:
1. Check transaction status via txHash
2. Verify address format (must be 56 chars starting with G)
3. Check balance including fee amount
4. Review error messages in response
5. Check MongoDB transaction records

