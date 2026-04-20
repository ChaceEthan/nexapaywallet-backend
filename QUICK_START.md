# NexaPay Backend Money System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Setup Environment Variables

Create or update `.env`:

```env
# Network (testnet for development, mainnet for production)
STELLAR_NETWORK=testnet

# Your Stellar testnet secret key (get from https://developers.stellar.org/docs/testnet-reset)
STELLAR_SECRET_KEY=S...your_secret_key...

# Platform fee (0.1% = 0.1, 1% = 1, etc)
PLATFORM_FEE_PERCENTAGE=0.1

# MongoDB connection
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/nexapay

# JWT secret (generate something random, 32+ chars)
JWT_SECRET=your_super_secret_key_change_this_in_production

# Other existing config...
PORT=10000
NODE_ENV=development
```

### 2. Get Testnet Account Funding

If you don't have a funded testnet account:

1. Go to: https://developers.stellar.org/docs/testnet-reset
2. Create account or paste your public key
3. Click "Fund Account"
4. Get your secret key and add to `.env`

### 3. Start Backend

```bash
npm install  # if needed
npm start    # or: npm run dev
```

Should see:
```
✅ MongoDB connected
🚀 Server running on port 10000
```

### 4. Test Endpoints

#### **Create User Account**
```bash
curl -X POST http://localhost:10000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "message": "Signup successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "user@example.com"
  }
}
```

Save the token as `TOKEN`.

#### **Connect Wallet**
```bash
curl -X POST http://localhost:10000/api/wallet/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "walletAddress": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH"
  }'
```

#### **Create Wallet Profile**
```bash
curl -X POST http://localhost:10000/api/wallet-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
    "name": "My Wallet",
    "description": "My primary testnet wallet"
  }'
```

#### **Check Balance**
```bash
curl http://localhost:10000/api/wallet/balance \
  -H "Authorization: Bearer TOKEN"
```

#### **Resolve Address (for QR Scanner)**
```bash
curl http://localhost:10000/api/resolve-address/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH
```

Response:
```json
{
  "success": true,
  "profile": {
    "address": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
    "isValid": true,
    "name": "My Wallet",
    "description": "My primary testnet wallet",
    "type": "personal",
    "accountStatus": "active",
    "isVerified": false,
    "createdAt": "2025-04-20T..."
  }
}
```

#### **Send Transaction**
```bash
curl -X POST http://localhost:10000/api/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "toAddress": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
    "amount": "10.5",
    "memo": "Test payment"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Transaction sent successfully",
  "transaction": {
    "_id": "...",
    "from": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
    "fromName": "My Wallet",
    "to": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
    "toName": "Unknown",
    "amount": "10.5",
    "fee": "0.01050",
    "feePercentage": 0.1,
    "asset": "XLM",
    "status": "success",
    "txHash": "abc123def456...",
    "timestamp": "2025-04-20T13:56:44.529Z"
  },
  "txHash": "abc123def456..."
}
```

#### **Get Transaction History**
```bash
curl "http://localhost:10000/api/transactions/GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH?limit=5"
```

Response:
```json
{
  "success": true,
  "count": 1,
  "transactions": [
    {
      "txHash": "abc123def456...",
      "type": "sent",
      "senderAddress": "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3RFD5A75P4JMTG4JKFVUDKWYH",
      "senderName": "My Wallet",
      "receiverAddress": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJAUME4PSXF44XUPYDAOF3W2S4",
      "receiverName": "Unknown",
      "amount": "10.5",
      "fee": "0.01050",
      "totalDeduction": "10.51050",
      "status": "success",
      "timestamp": "2025-04-20T13:56:44.529Z"
    }
  ]
}
```

---

## 🎯 What Each Component Does

### Transaction Service
- Validates sender/receiver addresses
- Checks balance (including fees)
- Signs transactions securely
- Submits to Stellar network
- Records in database

### Fee Service
- Calculates platform fee (configurable %)
- Validates sufficient funds
- Maintains Stellar precision (7 decimals)

### Wallet Profile Service
- Maps addresses to display names
- Resolves "Unknown" wallets
- Links to user accounts

### Network Config
- Handles testnet/mainnet switching
- Manages Stellar URLs
- Validates address formats

---

## 🔒 Security Notes

⚠️ **NEVER expose `STELLAR_SECRET_KEY`**
- Keep in `.env` (not in code)
- Not exposed to frontend
- Only used server-side
- Lost access = lost account

✅ **Good Security Practices**
- Change `JWT_SECRET` in production
- Use environment variables for all secrets
- Enable MongoDB authentication
- Use HTTPS in production
- Add rate limiting (future)

---

## 📱 Frontend Integration

Your frontend can now:

1. **QR Scanner**
   ```javascript
   // Scan QR code to get address
   const response = await fetch(`/api/resolve-address/${scannedAddress}`);
   const profile = await response.json();
   console.log(profile.profile.name);  // Shows wallet name
   ```

2. **Send Transaction**
   ```javascript
   const response = await fetch('/api/transaction', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       toAddress: scannedAddress,
       amount: '10.5',
       memo: 'Payment'
     })
   });
   const result = await response.json();
   console.log(result.transaction.txHash);  // Transaction confirmed
   ```

3. **Show History**
   ```javascript
   const response = await fetch(`/api/transactions/${userWallet}`);
   const history = await response.json();
   history.transactions.forEach(tx => {
     console.log(`Sent ${tx.amount} to ${tx.receiverName}`);
   });
   ```

---

## 🧪 Testing Checklist

- [ ] Create account (auth)
- [ ] Connect wallet
- [ ] Create wallet profile (should show name, not "Unknown")
- [ ] Resolve address (shows wallet name)
- [ ] Check balance
- [ ] Send transaction (with funds)
- [ ] Verify fee deducted correctly (amount + 0.1%)
- [ ] Check transaction in history
- [ ] Verify sender/receiver names resolved
- [ ] Test with low balance (should fail gracefully)
- [ ] Test with invalid address (should error)

---

## 🐛 Troubleshooting

### "Insufficient funds" error
```json
{
  "error": "Balance: 5 XLM, Required: 10.105 XLM"
}
```
**Solution:** Fund the testnet account more (faucet: https://developers.stellar.org/docs/testnet-reset)

### "Account not found" error
```json
{
  "error": "Account not found on network"
}
```
**Solution:** Receiver address doesn't exist. Create account first.

### "Invalid Stellar address" error
```json
{
  "error": "Invalid Stellar address format"
}
```
**Solution:** Address must be 56 characters starting with 'G' (public) or 'S' (secret)

### "Unknown" wallet name
**Solution:** Create wallet profile with `POST /api/wallet-profile`

### MongoDB connection fails
```
❌ MongoDB connection error
```
**Solution:** Check `MONGO_URI` in `.env` is correct

### Transaction stays "pending"
**Solution:** Check Stellar network status, check Stellar Expert for txHash

---

## 📚 Full Documentation

For detailed documentation, see:
- `BACKEND_MONEY_SYSTEM.md` - Complete architecture & API reference
- `IMPLEMENTATION_SUMMARY.md` - What was built and how

---

## 🚀 Deploy to Mainnet (Future)

When ready for production (no code changes needed):

1. Change `.env`:
   ```env
   STELLAR_NETWORK=mainnet
   STELLAR_SECRET_KEY=S...mainnet_key...
   ```

2. Get mainnet Stellar account funding
3. Update DNS/load balancer
4. Done! Same code works on mainnet

---

## 💡 Tips

1. **Test thoroughly on testnet first** before mainnet
2. **Save transaction hashes** for user records
3. **Monitor fee calculations** to ensure correctness
4. **Back up secret keys** in secure vault
5. **Use webhooks** (future) for real-time updates
6. **Rate limit endpoints** in production

---

## 📞 Support

If something isn't working:

1. Check error message in response
2. Verify `.env` variables
3. Check MongoDB connection
4. Verify Stellar account funding
5. Check transaction hash on https://testnet.expert.com
6. Review `BACKEND_MONEY_SYSTEM.md` for detailed docs

---

**Your NexaPay backend is ready to handle real money! 🎉**
