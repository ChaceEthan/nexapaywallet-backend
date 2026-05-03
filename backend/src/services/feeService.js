/**
 * Fee Service
 * Manages platform fee calculations and deductions
 * Configurable fee percentage with sensible defaults
 */

/**
 * Get configured fee percentage
 * Default: 0.1% (0.001)
 * Can be overridden in .env: PLATFORM_FEE_PERCENTAGE
 */
function getFeePercentage() {
  const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || "0.1");
  
  // Validate: fee must be 0-100%
  if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
    console.warn(
      `Invalid fee percentage: ${feePercent}. Using default 0.1%`
    );
    return 0.1;
  }
  
  return feePercent;
}

/**
 * Calculate platform fee based on transaction amount
 * Formula: fee = amount * (feePercentage / 100)
 * 
 * @param {string|number} amount - Transaction amount in XLM
 * @param {number} feePercentage - Fee percentage (optional, uses default if not provided)
 * @returns {string} Fee amount (as string to preserve precision)
 */
function calculateFee(amount, feePercentage = null) {
  if (!amount) {
    throw new Error("Amount is required");
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const feePercent = feePercentage !== null ? feePercentage : getFeePercentage();
  
  // Calculate: (amount * feePercent) / 100
  const feeAmount = (amountNum * feePercent) / 100;
  
  // Round to 7 decimal places (Stellar precision)
  return parseFloat(feeAmount.toFixed(7)).toString();
}

/**
 * Calculate total deduction (amount + fee)
 * This is what gets deducted from sender's balance
 * 
 * @param {string|number} amount - Transaction amount
 * @param {string|number} fee - Platform fee (optional, will be calculated if not provided)
 * @returns {object} { amount, fee, totalDeduction }
 */
function calculateTotalDeduction(amount, fee = null) {
  const amountNum = parseFloat(amount);
  
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const feeAmount = fee !== null ? parseFloat(fee) : parseFloat(calculateFee(amount));
  
  if (isNaN(feeAmount) || feeAmount < 0) {
    throw new Error("Fee must be a non-negative number");
  }

  const totalDeduction = amountNum + feeAmount;
  
  return {
    amount: parseFloat(amountNum.toFixed(7)).toString(),
    fee: parseFloat(feeAmount.toFixed(7)).toString(),
    totalDeduction: parseFloat(totalDeduction.toFixed(7)).toString()
  };
}

/**
 * Validate transaction can be performed
 * Checks balance >= total deduction (amount + fee)
 * 
 * @param {string|number} balance - Available balance
 * @param {string|number} amount - Transaction amount
 * @param {string|number} fee - Platform fee (optional)
 * @returns {object} { isValid, reason }
 */
function validateSufficientFunds(balance, amount, fee = null) {
  try {
    const balanceNum = parseFloat(balance);
    const deduction = calculateTotalDeduction(amount, fee);
    const totalDeductionNum = parseFloat(deduction.totalDeduction);

    if (isNaN(balanceNum) || balanceNum < 0) {
      return {
        isValid: false,
        reason: "Invalid balance"
      };
    }

    if (balanceNum < totalDeductionNum) {
      return {
        isValid: false,
        reason: `Insufficient funds. Balance: ${balance} XLM, Required: ${deduction.totalDeduction} XLM (${deduction.amount} XLM + ${deduction.fee} XLM fee)`
      };
    }

    return {
      isValid: true,
      reason: "Sufficient funds"
    };
  } catch (error) {
    return {
      isValid: false,
      reason: error.message
    };
  }
}

/**
 * Format fee display with percentage
 * 
 * @param {string|number} amount - Original amount
 * @param {string|number} fee - Fee amount
 * @returns {string} Formatted fee string
 */
function formatFeeDisplay(amount, fee) {
  const feePercent = getFeePercentage();
  return `${fee} XLM (${feePercent}%)`;
}

module.exports = {
  getFeePercentage,
  calculateFee,
  calculateTotalDeduction,
  validateSufficientFunds,
  formatFeeDisplay
};
