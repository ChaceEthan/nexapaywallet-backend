#!/bin/bash
# QR API System Verification Script

echo "========================================"
echo "🔍 NexaPay QR API - VERIFICATION SCRIPT"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

echo ""
echo "📂 Checking required files..."

# Check QR Controller
if [ -f "src/controllers/qrController.js" ]; then
    echo -e "${GREEN}✅ QR Controller created${NC}"
else
    echo -e "${RED}❌ QR Controller missing${NC}"
fi

# Check QR Routes
if [ -f "src/routes/qr.js" ]; then
    echo -e "${GREEN}✅ QR Routes created${NC}"
else
    echo -e "${RED}❌ QR Routes missing${NC}"
fi

# Check Address Validator
if [ -f "src/utils/addressValidator.js" ]; then
    echo -e "${GREEN}✅ Address Validator created${NC}"
else
    echo -e "${RED}❌ Address Validator missing${NC}"
fi

# Check server.js has QR routes
echo ""
echo "🔎 Checking server.js integration..."
if grep -q "qrRoutes" server.js; then
    echo -e "${GREEN}✅ QR routes registered in server.js${NC}"
else
    echo -e "${RED}❌ QR routes not registered${NC}"
fi

echo ""
echo "✅ FILE VERIFICATION COMPLETE"
echo ""

# Check imports
echo "🔗 Checking imports..."
if grep -q "const WalletProfile = require" src/controllers/qrController.js; then
    echo -e "${GREEN}✅ WalletProfile import found${NC}"
fi

if grep -q "validateAddressString" src/controllers/qrController.js; then
    echo -e "${GREEN}✅ Address validator import found${NC}"
fi

echo ""
echo "========================================"
echo "✨ QR API System Verification Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Test: curl http://localhost:10000/api/qr/resolve/GXXXXX..."
echo "3. Monitor logs for QR resolve calls"
