# NexaPay Backend

A Node.js/Express backend for the NexaPay wallet system, providing user authentication, wallet management, and blockchain integration with Stellar/Soroban.

## Features

- ✅ User Authentication (Sign In / Sign Up)
- ✅ Wallet Management with Auto-Generated Addresses
- ✅ Deposit Processing
- ✅ Key-Value Store (KV)
- ✅ Health Check Endpoint
- ✅ CORS Configuration for Frontend Integration
- ✅ MongoDB Database Integration
- ✅ Stellar/Soroban Contract Support

## Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB (local or MongoDB Atlas cloud)

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Development

```bash
npm run dev
```

Server runs on `http://localhost:10000`

### Production

```bash
npm start
```

## Environment Variables

Create a `.env` file:

```env
# Server
PORT=10000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nexapay

# Security
JWT_SECRET=your-super-secret-key-here

# Frontend
CORS_ORIGIN=https://nexapay-wallet.vercel.app

# Stellar/Soroban
SOROBAN_RPC_URL=https://soroban-rpc.stellar.org
CONTRACT_ID=CBYEOGW7L57GPPV4JQ744BY3JRZZGLHFORDDMADXWNBPASPEAQTTNKBI
```

## API Endpoints

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/signup` | Register new user |
| POST | `/signin` | User login |
| POST | `/deposit` | Process deposit |
| POST | `/set_value` | Store key-value |
| GET | `/get_value/:key` | Retrieve key-value |

## Deployment

### Render.com

1. Connect GitHub repo to Render
2. Create Web Service
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Add Environment Variables
6. Deploy

### Vercel (Alternative)

Not recommended for Node.js backend on Vercel (it's for serverless). Use Render, Railway, or Heroku.

## Project Structure

```
backend/
├── index.js              # Main server file
├── package.json          # Dependencies
├── .env                  # Environment variables
├── .env.example          # Template
└── README.md             # This file
```

## Security Checklist

- [ ] Hash passwords with bcrypt
- [ ] Validate JWT tokens
- [ ] Implement rate limiting
- [ ] Use HTTPS in production
- [ ] Sanitize user inputs
- [ ] Never commit `.env` file
- [ ] Use strong JWT secret

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Cannot find module 'express'` | Run `npm install` |
| `ENOENT: package.json not found` | Ensure running from project root |
| `MongoDB connection error` | Check `MONGO_URI` is correct |
| `Server on port 10000 already in use` | Change PORT in .env |

## Support

For issues, check Render logs or run locally with `npm run dev` to debug.

## License

MIT
