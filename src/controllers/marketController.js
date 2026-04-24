const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/apiResponse");
const binanceService = require("../services/binanceService");
/**
 * @description Get live market prices
 * @route GET /api/market/prices
 */
const getMarketPrices = asyncHandler(async (req, res) => {
  const prices = binanceService.getPrices();

  return res.status(200).json(
    new ApiResponse(200, prices, "Market prices retrieved successfully")
  );
});

module.exports = {
  getMarketPrices,
};
