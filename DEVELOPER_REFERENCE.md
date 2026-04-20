# NexaPay Backend - Developer Reference

## 🔍 Code Overview

This is a quick reference for developers working on the NexaPay backend money system.

---

## 📦 Service Layer

### transactionService.js
**Location:** `src/services/transactionService.js`
**Purpose:** Core transaction engine

**Key Functions:**
```javascript
// Get account details from Stellar
const account = await transactionService.getAccountDetails(publicKey);

// Get balance
const balance = await transactionService.getBalance(publicKey);

// Prepare transaction (validate + check funds)
const prepared = await transactionService.prepareTransaction({
  senderPublicKey,
  receiverPublicKey,
  amount,
  memo
});

// Complete flow (prepare → build → sign → submit → record)
const result = await transactionService.executeTransaction({
  senderPublicKey,
  receiverPublicKey,
  amount,
  senderSecretKey,  // From ENV only!
  memo
});
```

**Return Format:**
```javascript
{
  success: true,
  transaction: {
    _id, from, fromName, to, toName,
    amount, fee, asset, type, status,
    txHash, ledger, errorMessage, metadata,
    createdAt, updatedAt
  },
  submitDetails: { txHash, ledger, timestamp, result }
}
```

---

### feeService.js
**Location:** `src/services/feeService.js`
**Purpose:** Fee calculations and validation

**Key Functions:**
```javascript
// Get configured fee percentage
const percent = feeService.getFeePercentage();  // 0.1

// Calculate fee
const fee = feeService.calculateFee("100");  // "0.1"

// Get total (amount + fee)
const deduction = feeService.calculateTotalDeduction("100");
// Returns: { amount: "100", fee: "0.1", totalDeduction: "100.1" }

// Validate funds
const check = feeService.validateSufficientFunds(balance, amount, fee);
// Returns: { isValid: true/false, reason: "..." }

// Format for display
const display = feeService.formatFeeDisplay("100", "0.1");  // "0.1 XLM (0.1%)"
```

---

### walletProfileService.js
**Location:** `src/services/walletProfileService.js`
**Purpose:** Wallet identity mapping and resolution

**Key Functions:**
```javascript
// Create or update profile
const profile = await walletProfileService.createOrUpdateProfile(
  address,
  name,
  userId  // optional
);

// Get profile by address
const profile = await walletProfileService.getProfileByAddress(address);

// Resolve name for single address
const name = await walletProfileService.resolveName(address);
// Returns: "Alice" or "Unknown"

// Batch resolve names
const map = await walletProfileService.resolveNames([addr1, addr2, addr3]);
// Returns: { addr1: "Alice", addr2: "Bob", addr3: "Unknown" }

// Get all profiles for user
const profiles = await walletProfileService.getProfilesByUserId(userId);

// Get full profile details (for QR resolver)
const details = await walletProfileService.getProfileDetails(address);

// Delete profile
const deleted = await walletProfileService.deleteProfile(address);
```

---

## 🛣️ Route Layer

### transaction.js
**Location:** `src/routes/transaction.js`
**Purpose:** API endpoints

**Endpoints:**

```javascript
// Send transaction
POST /api/transaction
Headers: Authorization: Bearer <token>
Body: { toAddress, amount, memo }
Returns: { success, transaction, txHash }

// Get transaction history
GET /api/transactions/:address?limit=50&skip=0
Returns: { success, count, transactions[] }

// Resolve wallet address (for QR scanner)
GET /api/resolve-address/:address
Returns: { success, profile }

// Create/update wallet profile
POST /api/wallet-profile
Headers: Authorization: Bearer <token>
Body: { address, name, description }
Returns: { success, profile }

// Get user's profiles
GET /api/wallet-profiles
Headers: Authorization: Bearer <token>
Returns: { success, count, profiles[] }

// Delete wallet profile
DELETE /api/wallet-profile/:address
Headers: Authorization: Bearer <token>
Returns: { success, message }
```

---

## 💾 Data Models

### User
**Location:** `src/models/User.js`
```javascript
{
  email: String,              // unique
  password: String,           // hashed
  walletAddress: String,      // Stellar address
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction (UPDATED)
**Location:** `src/models/Transaction.js`
```javascript
{
  from: String,               // Sender address
  fromName: String,           // ✅ NEW
  to: String,                 // Receiver address
  toName: String,             // ✅ NEW
  amount: String,             // Amount sent
  fee: String,                // ✅ NEW: Platform fee
  feePercentage: Number,      // ✅ NEW: Fee %
  asset: String,              // "XLM"
  type: String,               // "sent" or "received"
  status: String,             // "pending", "success", "failed"
  txHash: String,             // ✅ NEW: Stellar hash
  ledger: Number,             // ✅ NEW: Ledger seq
  errorMessage: String,       // ✅ NEW: Error if failed
  metadata: Object,           // ✅ NEW: { memo, ... }
  createdAt: Date,
  updatedAt: Date
}
```

### WalletProfile (NEW)
**Location:** `src/models/WalletProfile.js`
```javascript
{
  address: String,            // Stellar address (unique)
  name: String,               // Display name
  description: String,        // Optional
  type: String,               // "personal", "business", "service"
  accountStatus: String,      // "active", "inactive", "frozen"
  userId: ObjectId,           // Link to User
  isVerified: Boolean,        // Verification flag
  avatarUrl: String,          // Future: profile pic
  createdAt: Date,
  updatedAt: Date
}
```

---

## ⚙️ Configuration

### network.js
**Location:** `src/config/network.js`
**Purpose:** Stellar network configuration

```javascript
// Get active network config
const network = getNetwork();  // testnet or mainnet

// Get Horizon URL
const url = getHorizonUrl();

// Get network passphrase
const passphrase = getNetworkPassphrase();

// Validate Stellar address
const isValid = isValidStellarAddress(address);
```

**Environment Variable:**
```env
STELLAR_NETWORK=testnet    # or: mainnet
```

---

## 🔐 Security Checklist

### Never Do:
- ❌ Pass secret key to frontend
- ❌ Log secret key
- ❌ Store secret key in code
- ❌ Commit `.env` file
- ❌ Skip address validation
- ❌ Trust user input directly

### Always Do:
- ✅ Validate all inputs
- ✅ Check balance before sending
- ✅ Sign transactions server-side only
- ✅ Use HTTPS in production
- ✅ Verify JWT token
- ✅ Log transactions for audit
- ✅ Use environment variables for secrets

---

## 🧪 Testing Patterns

### Test Transaction Sending
```javascript
const result = await transactionService.executeTransaction({
  senderPublicKey: "GTEST...",
  receiverPublicKey: "GTEST2...",
  amount: "10",
  senderSecretKey: process.env.STELLAR_SECRET_KEY,
  memo: "Test"
});

expect(result.success).toBe(true);
expect(result.transaction.txHash).toBeDefined();
expect(result.transaction.fee).toBe("0.01");
```

### Test Fee Calculation
```javascript
const fee = feeService.calculateFee("100");
expect(fee).toBe("0.1");  // 0.1% of 100

const deduction = feeService.calculateTotalDeduction("100");
expect(deduction.totalDeduction).toBe("100.1");
```

### Test Name Resolution
```javascript
// Create profile first
await walletProfileService.createOrUpdateProfile(
  "GTEST...",
  "Alice"
);

// Resolve name
const name = await walletProfileService.resolveName("GTEST...");
expect(name).toBe("Alice");
```

---

## 🚨 Common Errors & Solutions

### "Invalid Stellar address"
**Cause:** Address not 56 chars or invalid format
**Fix:** Use proper Stellar addresses (start with G for public, S for secret)

### "Insufficient funds"
**Cause:** Balance < amount + fee
**Fix:** Check balance includes fee calculation

### "Account not found"
**Cause:** Receiver address doesn't exist on network
**Fix:** Receiver must have received XLM or created account

### "Transaction failed"
**Cause:** Stellar network error, bad memo, timeout
**Fix:** Check error message, verify account details, retry

### "Secret key error"
**Cause:** Missing or invalid secret key
**Fix:** Ensure `STELLAR_SECRET_KEY` in .env starts with 'S'

---

## 📊 Database Queries

### Find transactions by sender
```javascript
const transactions = await Transaction.find({ from: address })
  .sort({ createdAt: -1 })
  .limit(50);
```

### Find wallet profile
```javascript
const profile = await WalletProfile.findOne({
  address: address.toUpperCase()
});
```

### Get all user's profiles
```javascript
const profiles = await WalletProfile.find({
  userId: userId
});
```

### Find transaction by hash
```javascript
const tx = await Transaction.findOne({
  txHash: hash
});
```

---

## 🔄 Request/Response Patterns

### Successful Transaction
```
Request:  POST /api/transaction with JWT
Response: {
  success: true,
  transaction: {...},
  txHash: "abc123"
}
Status: 200
```

### Failed Transaction
```
Request:  POST /api/transaction with JWT
Response: {
  success: false,
  message: "Insufficient funds",
  error: "Balance: 5 XLM, Required: 10.1 XLM"
}
Status: 400
```

### Unauthorized
```
Request:  POST /api/transaction (no token)
Response: {
  message: "No authorization header"
}
Status: 401
```

---

## 📝 Adding New Features

### Add new transaction type?
1. Update `type` enum in Transaction model
2. Add handling in transactionService
3. Add test case
4. Update documentation

### Add new fee calculation?
1. Update `feeService.js` functions
2. Add new validation logic
3. Update fee documentation
4. Test with various amounts

### Add new wallet profile field?
1. Update WalletProfile schema
2. Update walletProfileService if needed
3. Update API endpoints if needed
4. Add migration for existing records

### Add new endpoint?
1. Add to `src/routes/transaction.js`
2. Import required services
3. Add input validation
4. Add error handling
5. Add documentation
6. Write test

---

## 🎯 Best Practices

1. **Always validate input** before using
2. **Always check balance** before sending
3. **Always handle errors** gracefully
4. **Always use transactions** for multi-step operations
5. **Always log important events** for debugging
6. **Always test edge cases** (low balance, invalid addresses)
7. **Always document** API changes
8. **Always keep secrets** in environment variables

---

## 🔗 External Resources

- Stellar SDK: https://github.com/stellar/js-stellar-sdk
- Horizon API: https://developers.stellar.org/api/introduction/
- Stellar Testnet: https://developers.stellar.org/docs/testnet-reset
- Stellar Expert (Testnet): https://testnet.expert.com
- Stellar Expert (Mainnet): https://expert.stellar.org

---

## 📞 Key Contacts

- Lead Dev: [Name]
- DevOps: [Name]
- Security: [Name]

---

**Keep the code clean, secure, and well-documented! 🚀**
