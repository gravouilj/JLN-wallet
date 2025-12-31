import { ChronikClient } from 'chronik-client';
// @ts-ignore
import { Ecc, Script, TxBuilder, P2PKHSignatory, ALL_BIP143, shaRmd160, toHex, fromHex, alpGenesis, alpSend, alpMint, alpBurn, ALP_STANDARD, emppScript } from 'ecash-lib';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
// @ts-ignore
import * as ecashaddr from 'ecashaddrjs';
import { APP_CONFIG } from '../config/constants';
import { WalletBalance, TokenBalance, TokenInfo, MintBaton, Utxo } from '../types';

// --- CONFIGURATION ---
const ADMIN_ADDRESS = 'ecash:qzrpf4j09vpa9hf9h4w209hvefex9ysng5yectwda9'; 
const COMMISSION_SATS = 600n; // 6 XEC
const DUST_LIMIT = 546n;      // Limite poussière

// --- HELPERS ROBUSTES ---
function encodeCashAddress(pkh: Uint8Array): string {
  const lib = ecashaddr as any;
  const encoder = lib.encode || lib.encodeCashAddress || lib.default?.encode;
  if (!encoder) throw new Error("Erreur interne ecashaddrjs");
  return encoder('ecash', 'p2pkh', pkh);
}

function decodeCashAddress(addressString: string): Uint8Array {
  const lib = ecashaddr as any;
  const decoder = lib.decode || lib.decodeCashAddress || lib.default?.decode;
  if (!decoder) throw new Error("Erreur interne ecashaddrjs");
  const { hash } = decoder(addressString, true);
  return typeof hash === 'string' ? fromHex(hash) : hash;
}

// ✅ HELPER UNIVERSEL POUR LES SATS (Règle l'erreur TS 2339)
function getSats(utxo: any): bigint {
  return BigInt(utxo.sats !== undefined ? utxo.sats : (utxo.value || 0));
}

export class EcashWallet {
  mnemonic: string;
  chronik: ChronikClient;
  sk: Uint8Array;
  pk: Uint8Array;
  ecc: Ecc;
  pkh: Uint8Array;
  p2pkh: Script;
  addressStr: string;

  constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
    this.chronik = new ChronikClient(APP_CONFIG.CHRONIK_URLS);
    
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivedKey = hdKey.derive(APP_CONFIG.DERIVATION_PATH);
    
    if (!derivedKey.privateKey || !derivedKey.publicKey) {
      throw new Error("Erreur de dérivation de la clé HD");
    }

    this.sk = derivedKey.privateKey;
    this.pk = derivedKey.publicKey;
    this.ecc = new Ecc();
    this.pkh = shaRmd160(this.pk);
    this.p2pkh = Script.p2pkh(this.pkh);
    this.addressStr = encodeCashAddress(this.pkh);
  }

  getAddress(): string { return this.addressStr; }

  getPrivateKeyWIF(): string {
    return toHex(this.sk);
  }

  // --- LECTURE ---
  async getBalance(_forceRefresh: boolean = false): Promise<WalletBalance> {
    try {
      const utxosResponse = await this.chronik.script('p2pkh', toHex(this.pkh)).utxos();
      let totalSats = 0n;
      let pureXecSats = 0n;
      let tokenDustSats = 0n;
      const pureXecUtxos: Utxo[] = [];
      const tokenUtxos: Utxo[] = [];

      for (const utxo of utxosResponse.utxos) {
        // Utilisation du helper
        const sats = getSats(utxo);
        totalSats += sats;
        
        // Cast any pour accès sécurisé aux propriétés token
        const u = utxo as any;
        if (u.token) {
          const atoms = BigInt(u.token.atoms !== undefined ? u.token.atoms : (u.token.amount || 0));
          tokenUtxos.push({ ...utxo, token: { ...u.token, atoms: atoms.toString() }, sats } as unknown as Utxo);
          tokenDustSats += sats;
        } else {
          pureXecUtxos.push({ ...utxo, sats } as unknown as Utxo);
          pureXecSats += sats;
        }
      }

      const balanceBreakdown = {
        spendableBalance: Number(pureXecSats) / 100,
        totalBalance: Number(totalSats) / 100,
        tokenDustValue: Number(tokenDustSats) / 100,
        pureXecUtxos: pureXecUtxos.length,
        tokenUtxos: tokenUtxos.length
      };

      return { 
        balance: Number(pureXecSats) / 100,
        balanceSats: Number(pureXecSats),
        totalBalance: Number(totalSats) / 100,
        balanceBreakdown,
        utxos: { pureXec: pureXecUtxos, token: tokenUtxos } 
      };
    } catch (e) { console.error(e); throw e; }
  }

  async getTokenBalance(tokenId: string): Promise<TokenBalance> {
     const data = await this.getBalance();
     let amount = 0n;
     const utxos: Utxo[] = [];
     for(const u of data.utxos.token) {
        if(u.token && u.token.tokenId === tokenId && !u.token.isMintBaton) {
           amount += BigInt(u.token.atoms || 0);
           utxos.push(u);
        }
     }
     return { balance: amount.toString(), utxos };
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    try {
      const tokenData = await this.chronik.token(tokenId);
      
      let circulatingSupply = 0n;
      try {
        const utxosData = await this.chronik.tokenId(tokenId).utxos();
        circulatingSupply = utxosData.utxos
          .filter((utxo: any) => !utxo.token?.isMintBaton)
          .reduce((sum: bigint, utxo: any) => sum + BigInt(utxo.token?.atoms || utxo.token?.amount || 0), 0n);
      } catch (e) {
        console.warn(`Circulating supply calc failed for ${tokenId}`);
      }
      
      let genesisSupply = 0n;
      try {
        const genesisTx = await this.chronik.tx(tokenId);
        if (genesisTx.outputs) {
          for (const output of genesisTx.outputs) {
            const out = output as any;
            if (out.token && !out.token.isMintBaton) {
              genesisSupply += BigInt(out.token.atoms || out.token.amount || 0);
            }
          }
        }
      } catch (e) {
        console.warn(`Genesis supply calc failed for ${tokenId}`);
      }
      
      return {
        tokenId,
        tokenType: (tokenData.tokenType as any)?.toString() || 'UNKNOWN',
        ticker: tokenData.genesisInfo?.tokenTicker || 'UNKNOWN',
        name: tokenData.genesisInfo?.tokenName || 'Unknown Token',
        decimals: tokenData.genesisInfo?.decimals || 0,
        url: tokenData.genesisInfo?.url || '',
        hash: tokenData.genesisInfo?.hash || '',
        timeFirstSeen: tokenData.timeFirstSeen || '0',
        genesisInfo: {
          ...tokenData.genesisInfo,
          genesisSupply: genesisSupply.toString(),
          circulatingSupply: circulatingSupply.toString()
        }
      };
    } catch (error) {
      console.error(`Failed to fetch token info for ${tokenId}:`, error);
      return {
        tokenId,
        tokenType: 'UNKNOWN',
        ticker: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 0,
        url: '',
        hash: '',
        timeFirstSeen: '0',
        genesisInfo: { genesisSupply: '0', circulatingSupply: '0' }
      };
    }
  }

  async listETokens(): Promise<{tokenId: string, balance: string}[]> {
    const scriptUtxos = await this.chronik.script('p2pkh', toHex(this.pkh)).utxos();
    const tokenMap = new Map<string, bigint>();
    
    for (const utxo of scriptUtxos.utxos) {
      const u = utxo as any;
      if (u.token && !u.token.isMintBaton) {
        const tokenId = u.token.tokenId;
        const amount = BigInt(u.token.amount || u.token.atoms || 0);
        tokenMap.set(tokenId, (tokenMap.get(tokenId) || 0n) + amount);
      }
    }
    
    return Array.from(tokenMap.entries()).map(([tokenId, balance]) => ({
      tokenId,
      balance: balance.toString()
    }));
  }

  async getMintBatons(): Promise<MintBaton[]> {
    const balance = await this.getBalance();
    const tokenUtxos = balance.utxos.token;
    
    const slpBatons = tokenUtxos.filter((utxo: Utxo) => utxo.token?.isMintBaton === true);
    const uniqueBatons: MintBaton[] = [];
    const seenIds = new Set<string>();
    
    for (const utxo of slpBatons) {
      if (utxo.token && !seenIds.has(utxo.token.tokenId)) {
        seenIds.add(utxo.token.tokenId);
        uniqueBatons.push({
          tokenId: utxo.token.tokenId,
          utxo: utxo,
          isMintBaton: true,
          protocol: 'ALP'
        });
      }
    }
    
    return uniqueBatons;
  }

  async getMaxSendAmount(): Promise<number> {
    const bal = await this.getBalance();
    const utxos = bal.utxos.pureXec;
    if (utxos.length === 0) return 0;

    let totalInput = 0n;
    // Utilisation du helper getSats
    utxos.forEach(u => totalInput += getSats(u));

    const estimatedFee = 500n;
    const maxSats = totalInput - estimatedFee - COMMISSION_SATS;
    if (maxSats < DUST_LIMIT) return 0;
    
    return Number(maxSats) / 100;
  }

  // --- Transactions ---

  async sendXec(toAddress: string, amountXec: string | number): Promise<{txid: string}> {
     const cleanStr = String(amountXec).replace(',', '.').trim();
     const satsToSend = BigInt(Math.round(Number(cleanStr) * 100));

     if (satsToSend < DUST_LIMIT) throw new Error("Montant trop faible (Dust Limit)");

     const bal = await this.getBalance(true);
     const utxos = bal.utxos.pureXec;
     if(utxos.length === 0) throw new Error("Wallet vide");

     const pkhDest = decodeCashAddress(toAddress);
     const pkhAdmin = decodeCashAddress(ADMIN_ADDRESS);

     const inputs = [];
     for(const u of utxos) {
        inputs.push({
           input: { 
             prevOut: u.outpoint, 
             // Utilisation du helper
             signData: { sats: getSats(u), outputScript: this.p2pkh } 
           },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }

     const outputs = [
        { sats: satsToSend, script: Script.p2pkh(pkhDest) },
        { sats: COMMISSION_SATS, script: Script.p2pkh(pkhAdmin) },
        this.p2pkh
     ];

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return { txid: res.txid };
  }

  async sendToken(tokenId: string, toAddress: string, amountToken: string | number, decimals: number = 0, _protocol: string = 'ALP', message: string | null = null): Promise<{txid: string}> {
     const amountNum = Number(String(amountToken).replace(',', '.').trim());
     const sendAtoms = BigInt(Math.round(amountNum * (10 ** decimals)));
     
     const tokenData = await this.getTokenBalance(tokenId);
     if (BigInt(tokenData.balance) < sendAtoms) throw new Error("Solde Token insuffisant");

     let inputAtoms = 0n;
     const tokenInputs: Utxo[] = [];
     
     for (const utxo of tokenData.utxos) {
        if(utxo.token) {
            inputAtoms += BigInt(utxo.token.atoms || 0);
            tokenInputs.push(utxo);
            if (inputAtoms >= sendAtoms) break;
        }
     }

     const bal = await this.getBalance();
     const xecUtxos = bal.utxos.pureXec;
     
     const changeAtoms = inputAtoms - sendAtoms;

     const inputs = tokenInputs.map(utxo => ({
        input: { 
            prevOut: utxo.outpoint, 
            signData: { sats: getSats(utxo), outputScript: this.p2pkh } 
        },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
     }));

     for (const utxo of xecUtxos) {
        inputs.push({
           input: { 
               prevOut: utxo.outpoint, 
               signData: { sats: getSats(utxo), outputScript: this.p2pkh } 
           },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }

     const outputs = [];
     
     // On passe 'ALP' par défaut au helper
     const opReturn = changeAtoms > 0n 
        ? this._buildTokenScript('ALP', tokenId, sendAtoms, changeAtoms)
        : this._buildTokenScript('ALP', tokenId, sendAtoms);
        
     outputs.push({ sats: 0n, script: opReturn });

     if (message && message.trim().length > 0) {
       const messageBytes = new TextEncoder().encode(message);
       if (messageBytes.length <= 220) {
         const messageScript = Script.fromOps([
           { opcode: 0x6a } as any, 
           { opcode: messageBytes.length, data: messageBytes } as any
         ]);
         outputs.push({ sats: 0n, script: messageScript });
       }
     }

     const pkhDest = decodeCashAddress(toAddress);
     outputs.push({ sats: DUST_LIMIT, script: Script.p2pkh(pkhDest) });

     if (changeAtoms > 0n) {
        outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
     }

     outputs.push(this.p2pkh);

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return { txid: res.txid };
  }

  async sendTokenToMany(tokenId: string, recipients: {address: string, amount: string}[], decimals: number = 0, _protocol: string = 'ALP', message: string | null = null): Promise<{txid: string, recipientsCount: number}> {
     
     let totalSendAtoms = 0n;
     const recipientsWithAtoms = recipients.map(r => {
       const amountNum = Number(String(r.amount).replace(',', '.').trim());
       const atoms = BigInt(Math.round(amountNum * (10 ** decimals)));
       totalSendAtoms += atoms;
       return { address: r.address, atoms };
     });
     
     const tokenData = await this.getTokenBalance(tokenId);
     if (BigInt(tokenData.balance) < totalSendAtoms) {
       throw new Error(`Solde Token insuffisant: ${tokenData.balance} < ${totalSendAtoms}`);
     }

     let inputAtoms = 0n;
     const tokenInputs: Utxo[] = [];
     for (const utxo of tokenData.utxos) {
        if(utxo.token) {
            inputAtoms += BigInt(utxo.token.atoms || 0);
            tokenInputs.push(utxo);
            if (inputAtoms >= totalSendAtoms) break;
        }
     }

     const bal = await this.getBalance();
     const xecUtxos = bal.utxos.pureXec;
     
     const changeAtoms = inputAtoms - totalSendAtoms;

     const inputs = tokenInputs.map(utxo => ({
        input: { 
            prevOut: utxo.outpoint, 
            // ✅ Utilisation du helper getSats
            signData: { sats: getSats(utxo), outputScript: this.p2pkh } 
        },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
     }));

     for (const utxo of xecUtxos) {
        inputs.push({
           input: { 
               prevOut: utxo.outpoint, 
               // ✅ Utilisation du helper getSats
               signData: { sats: getSats(utxo), outputScript: this.p2pkh } 
           },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }

     const outputs = [];
     
     const sendAmounts = recipientsWithAtoms.map(r => r.atoms);
     
     const alpData = changeAtoms > 0n 
       ? alpSend(tokenId, ALP_STANDARD, [...sendAmounts, changeAtoms])
       : alpSend(tokenId, ALP_STANDARD, sendAmounts);
     const opReturn = emppScript([alpData]);

     outputs.push({ sats: 0n, script: opReturn });

     if (message && message.trim().length > 0) {
       const messageBytes = new TextEncoder().encode(message);
       if (messageBytes.length <= 220) {
         const messageScript = Script.fromOps([
           { opcode: 0x6a } as any, 
           { opcode: messageBytes.length, data: messageBytes } as any
         ]);
         outputs.push({ sats: 0n, script: messageScript });
       }
     }

     for (const recipient of recipientsWithAtoms) {
       const pkhDest = decodeCashAddress(recipient.address);
       outputs.push({ sats: DUST_LIMIT, script: Script.p2pkh(pkhDest) });
     }

     if (changeAtoms > 0n) {
        outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
     }

     outputs.push(this.p2pkh);

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return { txid: res.txid, recipientsCount: recipients.length };
  }

  // ... (Le reste des méthodes createToken, mintToken, burnToken, etc. 
  // utilise aussi getSats ou n'a pas besoin de modification)
  // Je remets tout pour être sûr que tu as le fichier complet valide.

  async createToken(params: { name: string, ticker: string, url: string, decimals: number, quantity: string|number, isFixedSupply: boolean }): Promise<{txid: string, ticker: string, protocol: string}> {
    const { name, ticker, url, decimals, quantity, isFixedSupply } = params;
    
    const bal = await this.getBalance(true);
    const utxos = bal.utxos.pureXec;
    
    const inputs = [];
    const quantityNumber = Number(quantity);
    const decimalsNumber = Number(decimals);
    const initialQty = BigInt(Math.round(quantityNumber * Math.pow(10, decimalsNumber)));
    
    for(const u of utxos) {
       inputs.push({
          input: { prevOut: u.outpoint, signData: { sats: getSats(u), outputScript: this.p2pkh } },
          signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
       });
    }

    const outputs = [];
    const script = this._buildAlpGenesis(ticker, name, url, decimals, toHex(this.pk), isFixedSupply, initialQty);
    outputs.push({ sats: 0n, script: script });
    
    if (initialQty > 0n) outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
    if (!isFixedSupply) outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
    outputs.push(this.p2pkh);

    const txBuild = new TxBuilder({ inputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    
    return { txid: res.txid, ticker, protocol: 'ALP' };
  }

  async mintToken(tokenId: string, amount: string | number, decimals: number = 0): Promise<string> {
     const scriptUtxos = await this.chronik.script('p2pkh', toHex(this.pkh)).utxos();
     const mintBatonUtxo = scriptUtxos.utxos.find(
       (u: any) => u.token && u.token.tokenId === tokenId && u.token.isMintBaton === true
     );

     if (!mintBatonUtxo) throw new Error(`Aucun Mint Baton trouvé pour le token ${tokenId}`);

     const mintAtoms = BigInt(Math.round(Number(amount) * Math.pow(10, decimals)));
     
     const mintData = { atomsArray: [mintAtoms], numBatons: 1 };
     const alpMintData = alpMint(tokenId, ALP_STANDARD, mintData);
     const mintScript = emppScript([alpMintData]);
     
     const bal = await this.getBalance(true);
     const xecUtxos = bal.utxos.pureXec;
     
     const inputs = [{
        input: { prevOut: mintBatonUtxo.outpoint, signData: { sats: getSats(mintBatonUtxo), outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
     }];
     
     for(const u of xecUtxos) {
        inputs.push({
           input: { prevOut: u.outpoint, signData: { sats: getSats(u), outputScript: this.p2pkh } },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }
     
     const outputs = [
        { sats: 0n, script: mintScript },
        { sats: DUST_LIMIT, script: this.p2pkh },
        { sats: DUST_LIMIT, script: this.p2pkh },
        this.p2pkh
     ];

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return res.txid;
  }

  async burnToken(tokenId: string, amount: string | number, decimals: number = 0): Promise<{txid: string}> {
    const burnAtoms = BigInt(Math.round(Number(amount) * Math.pow(10, decimals)));
    const tokenData = await this.getTokenBalance(tokenId);
    const availableAtoms = BigInt(tokenData.balance);
    
    if (availableAtoms < burnAtoms) throw new Error("Solde token insuffisant");

    let inputAtoms = 0n;
    const tokenInputs: Utxo[] = [];
    
    for (const utxo of tokenData.utxos) {
      if (utxo.token?.isMintBaton) continue;
      inputAtoms += BigInt(utxo.token?.atoms || 0);
      tokenInputs.push(utxo);
      if (inputAtoms >= burnAtoms) break;
    }

    if (inputAtoms < burnAtoms) throw new Error("UTXOs insuffisants");

    const balanceData = await this.getBalance();
    const xecUtxos = balanceData.utxos.pureXec;
    if (xecUtxos.length === 0) throw new Error("Pas assez de XEC pour les frais");

    const changeAtoms = inputAtoms - burnAtoms;
    
    const inputs = tokenInputs.map(utxo => ({
      input: { prevOut: utxo.outpoint, signData: { sats: getSats(utxo), outputScript: this.p2pkh } },
      signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
    }));
    
    for (const utxo of xecUtxos) {
      inputs.push({
        input: { prevOut: utxo.outpoint, signData: { sats: getSats(utxo), outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
      });
    }

    const outputs = [];
    
    if (changeAtoms > 0n) {
      const alpBurnData = alpBurn(tokenId, ALP_STANDARD, burnAtoms);
      const alpSendData = alpSend(tokenId, ALP_STANDARD, [changeAtoms]);
      const combinedScript = emppScript([alpBurnData, alpSendData]);
      
      outputs.push({ sats: 0n, script: combinedScript });
      outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
    } else {
      const alpBurnData = alpBurn(tokenId, ALP_STANDARD, burnAtoms);
      const burnScript = emppScript([alpBurnData]);
      outputs.push({ sats: 0n, script: burnScript });
    }
    
    outputs.push(this.p2pkh);

    const txBuild = new TxBuilder({ inputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    return { txid: res.txid };
  }

  async calculateAirdropHolders(tokenId: string, minEligibleTokens: number = 0, ignoreCreator: boolean = false, decimals: number = 0) {
    const tokenUtxos = await this.chronik.tokenId(tokenId).utxos();
    const holderBalances = new Map();
    let totalTokenSupply = 0n;

    for (const utxo of tokenUtxos.utxos) {
      const u = utxo as any;
      if (!u.token || u.token.isMintBaton) continue;
      
      let address;
      try {
        const pkhHex = u.script.substring(6, 46);
        const pkh = fromHex(pkhHex);
        address = encodeCashAddress(pkh);
      } catch (e) {
        continue;
      }

      const tokenAmount = BigInt(u.token.amount || u.token.atoms || 0);
      holderBalances.set(address, (holderBalances.get(address) || 0n) + tokenAmount);
      totalTokenSupply += tokenAmount;
    }

    if (ignoreCreator) holderBalances.delete(this.addressStr);

    const minAtoms = minEligibleTokens > 0 
      ? BigInt(Math.round(minEligibleTokens * (10 ** decimals)))
      : 0n;

    const eligibleHolders = Array.from(holderBalances.entries())
      .filter(([_, balance]) => balance >= minAtoms)
      .map(([address, balance]) => ({
        address,
        balance: balance.toString(),
        balanceFormatted: Number(balance) / (10 ** decimals)
      }));

    return {
      holders: eligibleHolders,
      count: eligibleHolders.length,
      totalSupply: totalTokenSupply.toString()
    };
  }

  async airdrop(tokenId: string, totalAmountXec: number, proportional: boolean = true, ignoreCreator: boolean = true, _minEligible: number = 0, message: string | null = null) {
    const tokenUtxos = await this.chronik.tokenId(tokenId).utxos();
    const holderBalances = new Map();
    let totalTokenSupply = 0n;

    for (const utxo of tokenUtxos.utxos) {
      const u = utxo as any;
      if (!u.token || u.token.isMintBaton) continue;
      
      let address;
      try {
        const pkhHex = u.script.substring(6, 46);
        const pkh = fromHex(pkhHex);
        address = encodeCashAddress(pkh);
      } catch (e) {
        continue;
      }

      const tokenAmount = BigInt(u.token.amount || u.token.atoms || 0);
      holderBalances.set(address, (holderBalances.get(address) || 0n) + tokenAmount);
      totalTokenSupply += tokenAmount;
    }

    if (ignoreCreator) holderBalances.delete(this.addressStr);

    const holders = Array.from(holderBalances.entries());
    if (holders.length === 0) throw new Error("Aucun holder trouvé");

    const totalSatsToDistribute = BigInt(Math.round(totalAmountXec * 100));
    const recipients = [];

    if (proportional) {
      for (const [address, balance] of holders) {
        const share = (totalSatsToDistribute * balance) / totalTokenSupply;
        if (share >= DUST_LIMIT) recipients.push({ address, sats: share });
      }
    } else {
      const sharePerHolder = totalSatsToDistribute / BigInt(holders.length);
      if (sharePerHolder < DUST_LIMIT) {
        throw new Error(`Montant trop faible (min: ${Number(DUST_LIMIT * BigInt(holders.length)) / 100} XEC)`);
      }
      for (const [address] of holders) {
        recipients.push({ address, sats: sharePerHolder });
      }
    }

    const result = await this._sendMany(recipients, message);
    
    return {
      success: true,
      txid: result.txid,
      holdersCount: holders.length,
      recipientsCount: recipients.length,
      totalDistributed: Number(totalSatsToDistribute) / 100,
      method: proportional ? 'proportional' : 'equal'
    };
  }

  async _sendMany(recipients: {address: string, sats: bigint}[], message: string | null = null) {
    const bal = await this.getBalance(true);
    const xecUtxos = bal.utxos.pureXec;
    if (xecUtxos.length === 0) throw new Error("Aucun UTXO XEC disponible");

    const selectedInputs = [];
    
    for (const utxo of xecUtxos) {
      selectedInputs.push({
        input: { prevOut: utxo.outpoint, signData: { sats: getSats(utxo), outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
      });
    }

    const outputs = [];

    if (message && message.trim().length > 0) {
      const messageBytes = new TextEncoder().encode(message);
      if (messageBytes.length <= 220) {
        const messageScript = Script.fromOps([
          { opcode: 0x6a } as any, 
          { opcode: messageBytes.length, data: messageBytes } as any
        ]);
        outputs.push({ sats: 0n, script: messageScript });
      }
    }

    for (const r of recipients) {
      const pkhDest = decodeCashAddress(r.address);
      outputs.push({ sats: r.sats, script: Script.p2pkh(pkhDest) });
    }
    
    outputs.push(this.p2pkh);

    const txBuild = new TxBuilder({ inputs: selectedInputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    return { txid: res.txid };
  }

  async sendMessage(message: string): Promise<{txid: string}> {
    if (!message || typeof message !== 'string') throw new Error('Message invalide');
    const messageBytes = new TextEncoder().encode(message);
    if (messageBytes.length > 220) throw new Error(`Message trop long`);

    const bal = await this.getBalance(true);
    const utxos = bal.utxos.pureXec;
    if (utxos.length === 0) throw new Error('Aucun UTXO disponible');

    const inputs = [];
    for (const u of utxos) {
      inputs.push({
        input: { prevOut: u.outpoint, signData: { sats: getSats(u), outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
      });
    }

    const opReturnScript = Script.fromOps([
      { opcode: 0x6a } as any, 
      { opcode: messageBytes.length, data: messageBytes } as any
    ]);

    const outputs = [
      { sats: 0n, script: opReturnScript },
      this.p2pkh
    ];

    const txBuild = new TxBuilder({ inputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    
    return { txid: res.txid };
  }

  _buildTokenScript(_protocol: string, tokenId: string, amount1: bigint, amount2: bigint = 0n) {
    const sendAtomsArray = amount2 > 0n ? [amount1, amount2] : [amount1];
    const alpSendData = alpSend(tokenId, ALP_STANDARD, sendAtomsArray);
    return emppScript([alpSendData]);
  }

  _buildAlpGenesis(ticker: string, name: string, url: string, decimals: number, authPubkey: string, isFixedSupply: boolean, initialQty: bigint = 0n) {
    const genesisInfo = {
      tokenTicker: ticker || '',
      tokenName: name || '',
      url: url || '',
      data: '',
      authPubkey: isFixedSupply ? '' : authPubkey,
      decimals: decimals
    };
    
    const mintData = {
      atomsArray: initialQty > 0n ? [initialQty] : [],
      numBatons: isFixedSupply ? 0 : 1
    };
    
    const alpGenesisData = alpGenesis(ALP_STANDARD, genesisInfo, mintData);
    return emppScript([alpGenesisData]);
  }
}

export const createWallet = (m: string) => new EcashWallet(m);
export const generateMnemonic = () => bip39.generateMnemonic(wordlist);
export const validateMnemonic = (m: string) => bip39.validateMnemonic(m, wordlist);