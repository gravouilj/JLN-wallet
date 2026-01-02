/**
 * Validation utilities for wallet operations
 * Provides consistent address, amount, and input validation
 */

// ECash address patterns
const ECASH_ADDRESS_PATTERN = /^ecash:q[a-z0-9]{41}$/i;
const LEGACY_ADDRESS_PATTERN = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

/**
 * Validates if an address is a valid ECash address
 * @param address - Address to validate
 * @returns boolean
 */
export const isValidXECAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  return ECASH_ADDRESS_PATTERN.test(trimmed) || LEGACY_ADDRESS_PATTERN.test(trimmed);
};

/**
 * Validates if an amount is valid for a transaction
 * @param amount - Amount string (decimal format)
 * @param type - Type of amount validation ('xec' or 'etoken')
 * @returns boolean
 */
export const isValidAmount = (
  amount: string,
  type: 'xec' | 'etoken' = 'xec'
): boolean => {
  if (!amount || typeof amount !== 'string') return false;

  const trimmed = amount.trim();
  
  // Check if it's a valid number
  const num = parseFloat(trimmed);
  if (isNaN(num) || !isFinite(num)) return false;

  // Must be positive
  if (num <= 0) return false;

  // Check decimal places
  const decimalPlaces = trimmed.split('.')[1]?.length || 0;
  const maxDecimals = type === 'xec' ? 8 : 8; // Both support 8 decimals

  return decimalPlaces <= maxDecimals;
};

/**
 * Formats an address for display (truncated with ellipsis)
 * @param address - Full address
 * @param startChars - Number of characters to show at start (default: 12)
 * @param endChars - Number of characters to show at end (default: 8)
 * @returns formatted address string
 */
export const formatAddress = (
  address: string,
  startChars: number = 12,
  endChars: number = 8
): string => {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
};

/**
 * Extracts the clean address from ecash: protocol
 * @param address - Address with or without ecash: prefix
 * @returns clean address (without prefix)
 */
export const extractCleanAddress = (address: string): string => {
  if (!address) return '';
  if (address.startsWith('ecash:')) {
    return address.substring(6);
  }
  return address;
};

/**
 * Sanitizes user input to prevent injection attacks
 * @param input - User input
 * @param type - Type of input ('address' or 'amount')
 * @returns sanitized string
 */
export const sanitizeInput = (
  input: string,
  type: 'address' | 'amount' = 'address'
): string => {
  if (!input || typeof input !== 'string') return '';

  const trimmed = input.trim();

  if (type === 'address') {
    // Remove spaces, only allow alphanumeric, hyphens, underscores, colons
    return trimmed.replace(/[^a-zA-Z0-9:]/g, '');
  }

  if (type === 'amount') {
    // Remove all non-numeric and non-decimal characters
    return trimmed.replace(/[^0-9.]/g, '');
  }

  return trimmed;
};

/**
 * Compares two amounts with tolerance for floating-point errors
 * @param amount1 - First amount
 * @param amount2 - Second amount
 * @param tolerance - Tolerance in decimal places (default: 8)
 * @returns boolean
 */
export const compareAmounts = (
  amount1: string | number,
  amount2: string | number,
  tolerance: number = 8
): boolean => {
  const num1 = typeof amount1 === 'string' ? parseFloat(amount1) : amount1;
  const num2 = typeof amount2 === 'string' ? parseFloat(amount2) : amount2;

  if (isNaN(num1) || isNaN(num2)) return false;

  const multiplier = Math.pow(10, tolerance);
  return Math.round(num1 * multiplier) === Math.round(num2 * multiplier);
};

/**
 * Converts amount to BigInt-safe format
 * @param amount - Amount as string or number
 * @param decimals - Decimal places (default: 8 for XEC)
 * @returns BigInt representation
 */
export const amountToBigInt = (
  amount: string | number,
  decimals: number = 8
): bigint => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || !isFinite(num)) return 0n;

  const multiplier = Math.pow(10, decimals);
  return BigInt(Math.floor(num * multiplier));
};

/**
 * Converts BigInt back to decimal amount
 * @param value - BigInt value
 * @param decimals - Decimal places (default: 8)
 * @returns formatted decimal string
 */
export const bigIntToAmount = (
  value: bigint,
  decimals: number = 8
): string => {
  const str = value.toString().padStart(decimals + 1, '0');
  const integerPart = str.slice(0, -decimals);
  const decimalPart = str.slice(-decimals).replace(/0+$/, '');

  if (!decimalPart) return integerPart || '0';
  return `${integerPart || '0'}.${decimalPart}`;
};

/**
 * Validates that an amount doesn't exceed available balance
 * @param amount - Amount to send
 * @param balance - Available balance
 * @param fee - Transaction fee (default: 0.003)
 * @returns boolean
 */
export const validateSufficientBalance = (
  amount: string | number,
  balance: string | number,
  fee: number = 0.003
): boolean => {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  const balanceNum = typeof balance === 'string' ? parseFloat(balance) : balance;

  if (isNaN(amountNum) || isNaN(balanceNum)) return false;
  return amountNum + fee <= balanceNum;
};

/**
 * Formats validation error message with i18n support
 * @param type - Error type ('address', 'amount', 'balance', 'fee', 'gas')
 * @param context - Additional context for error message
 * @returns formatted error string
 */
export const getValidationErrorMessage = (
  type: 'address' | 'amount' | 'balance' | 'fee' | 'gas',
  context?: any
): string => {
  const messages: Record<string, string> = {
    address: 'Adresse invalide (doit commencer par ecash:)',
    amount: 'Montant invalide ou manquant',
    balance: `Solde insuffisant (nécessite ${context?.required || '0'} ${context?.ticker || 'XEC'})`,
    fee: 'Frais de transaction trop élevés',
    gas: 'Crédit réseau insuffisant'
  };

  return messages[type] || 'Erreur de validation';
};
