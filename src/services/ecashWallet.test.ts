import { describe, it, expect } from 'vitest';
import { generateMnemonic, validateMnemonic } from './ecashWallet';

// On réplique la logique exacte utilisée dans ecashWallet.ts pour la valider
const toSats = (amountXec: string | number): bigint => {
  const cleanStr = String(amountXec).replace(',', '.').trim();
  // La formule critique : Math.round pour éviter les erreurs de virgule flottante
  return BigInt(Math.round(Number(cleanStr) * 100));
};

describe('🛡️ EcashWallet Core Security & Logic', () => {
  
  // 1. Test des Clés (Mnémonique)
  describe('Mnemonic Generation', () => {
    it('should generate a valid 12-word mnemonic', () => {
      const mnemonic = generateMnemonic();
      const words = mnemonic.split(' ');
      expect(words.length).toBe(12);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should reject invalid mnemonics', () => {
      const badMnemonic = 'apple banana cherry'; // Trop court
      expect(validateMnemonic(badMnemonic)).toBe(false);
    });
  });

  // 2. Test des Mathématiques Financières (CRITIQUE)
  describe('Financial Math (XEC -> Sats)', () => {
    it('should correctly convert integer amounts', () => {
      expect(toSats('1')).toBe(100n);      // 1 XEC = 100 Sats
      expect(toSats(10)).toBe(1000n);      // 10 XEC = 1000 Sats
      expect(toSats('0')).toBe(0n);
    });

    it('should correctly handle decimals (Floating Point safety)', () => {
      // Le piège classique : 10.55 * 100 peut donner 1054.99999 en JS pur
      // Notre logique avec Math.round doit donner 1055
      expect(toSats('10.55')).toBe(1055n); 
      expect(toSats(5.46)).toBe(546n);     // Dust limit exacte
    });

    it('should handle string inputs with commas (French format)', () => {
      expect(toSats('10,50')).toBe(1050n); // Doit accepter la virgule
    });

    it('should handle small amounts precisely', () => {
      expect(toSats('0.01')).toBe(1n);     // 1 Satoshi
    });
  });
});