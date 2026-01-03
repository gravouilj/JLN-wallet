/**
 * Utility functions for token balance formatting
 * Extracted from ClientWalletPage to reduce complexity
 */

/**
 * Format token balance with proper decimal handling
 */
export const formatTokenBalance = (balance: string | bigint, decimals: number = 0): string => {
  if (!balance) return '0';
  const balanceNum = typeof balance === 'string' ? BigInt(balance) : BigInt(balance.toString());
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = balanceNum / divisor;
  const remainder = balanceNum % divisor;
  
  if (remainder === 0n) {
    return wholePart.toString();
  }
  
  const decimalPart = remainder.toString().padStart(decimals, '0');
  return `${wholePart}.${decimalPart}`.replace(/\.?0+$/, '');
};

/**
 * Derive a ticker symbol from available data
 */
export const deriveTicker = (ticker?: string, name?: string): string => {
  if (ticker && ticker.trim().length > 0) {
    return ticker.trim().toUpperCase();
  }
  if (name && name.trim().length > 0) {
    return name.trim().substring(0, 3).toUpperCase();
  }
  return 'TOK';
};

/**
 * Format XEC balance for display
 */
export const formatXecBalance = (balance: number | string): string => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  return num.toFixed(2);
};
