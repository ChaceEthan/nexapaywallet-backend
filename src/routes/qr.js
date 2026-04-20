/**
 * QR Routes
 * Handle QR code scanning and address validation
 * No authentication required (public endpoints)
 */

const express = require("express");
const router = express.Router();

const { resolveAddress } = require("../controllers/qrController");

// ================= QR ENDPOINTS =================

/**
 * GET /api/qr/resolve/:address
 * Resolve a scanned QR code address to wallet profile
 * 
 * @param {string} address - Stellar address from QR code (path param)
 * 
 * Success Response:
 * {
 *   "isValid": true,
 *   "address": "GXXXXXX...",
 *   "name": "Alice" or null,
 *   "type": "personal" (optional),
 *   "accountStatus": "active" (optional)
 * }
 * 
 * Error Response:
 * {
 *   "isValid": false,
 *   "message": "Invalid address format"
 * }
 */
router.get("/qr/resolve/:address", resolveAddress);

module.exports = router;
