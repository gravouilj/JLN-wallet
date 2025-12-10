import { ChronikClient } from 'chronik-client';
import { Ecc, Script, TxBuilder, P2PKHSignatory, ALL_BIP143, shaRmd160, toHex, fromHex, alpGenesis, alpSend, alpMint, alpBurn, ALP_STANDARD, emppScript } from 'ecash-lib';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import * as ecashaddr from 'ecashaddrjs';

// --- CONFIGURATION ---
const ADMIN_ADDRESS = 'ecash:qzrpf4j09vpa9hf9h4w209hvefex9ysng5yectwda9'; 
const COMMISSION_SATS = 600n; // 6 XEC (Uniquement pour sendXec)
const DUST_LIMIT = 546n;      // Limite poussière réseau

// --- HELPERS ROBUSTES ---
function encodeCashAddress(pkh) {
  const encoder = ecashaddr.encode || ecashaddr.encodeCashAddress || ecashaddr.default?.encode;
  if (!encoder) throw new Error("Erreur interne ecashaddrjs");
  return encoder('ecash', 'p2pkh', pkh);
}

function decodeCashAddress(addressString) {
  const decoder = ecashaddr.decode || ecashaddr.decodeCashAddress || ecashaddr.default?.decode;
  if (!decoder) throw new Error("Erreur interne ecashaddrjs");
  const { hash } = decoder(addressString, true);
  return hash;
}

export class EcashWallet {
  constructor(mnemonic) {
    this.mnemonic = mnemonic;
    this.chronik = new ChronikClient('https://chronik-native2.fabien.cash');
    
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivedKey = hdKey.derive("m/44'/1899'/0'/0/0");
    
    this.sk = derivedKey.privateKey;
    this.pk = derivedKey.publicKey;
    this.ecc = new Ecc();
    this.pkh = shaRmd160(this.pk);
    this.p2pkh = Script.p2pkh(this.pkh);
    this.addressStr = encodeCashAddress(this.pkh);
  }

  getAddress() { return this.addressStr; }

  // --- LECTURE ---
  async getBalance(forceRefresh = false) {
    try {
      const utxos = await this.chronik.script('p2pkh', toHex(this.pkh)).utxos();
      let totalSats = 0n;
      let pureXecSats = 0n;
      let tokenDustSats = 0n;
      let pureXecUtxos = [];
      let tokenUtxos = [];

      for (const utxo of utxos.utxos) {
        const sats = BigInt(utxo.sats !== undefined ? utxo.sats : (utxo.value || 0));
        totalSats += sats;
        
        if (utxo.token) {
          const atoms = BigInt(utxo.token.atoms !== undefined ? utxo.token.atoms : (utxo.token.amount || 0));
          tokenUtxos.push({ ...utxo, token: { ...utxo.token, atoms }, sats });
          tokenDustSats += sats;
        } else {
          pureXecUtxos.push({ ...utxo, sats });
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

  async getTokenBalance(tokenId) {
     const data = await this.getBalance();
     let amount = 0n;
     const utxos = [];
     for(const u of data.utxos.token) {
        // VITAL : Exclure les mint batons
        if(u.token.tokenId === tokenId && !u.token.isMintBaton) {
           amount += u.token.atoms;
           utxos.push(u);
        }
     }
     return { balance: amount.toString(), utxos };
  }

  async getTokenInfo(tokenId) {
    try {
      const tokenData = await this.chronik.token(tokenId);
      
      // Circulating supply = tous les UTXOs actuels (mint + genesis - burns)
      let circulatingSupply = 0n;
      try {
        const utxosData = await this.chronik.tokenId(tokenId).utxos();
        circulatingSupply = utxosData.utxos
          .filter(utxo => !utxo.token?.isMintBaton)
          .reduce((sum, utxo) => sum + BigInt(utxo.token?.atoms || utxo.token?.amount || 0), 0n);
      } catch (e) {
        console.warn(`Impossible de calculer circulatingSupply pour ${tokenId}:`, e);
      }
      
      // Genesis supply = quantité créée à la genesis (depuis la tx genesis)
      let genesisSupply = 0n;
      try {
        const genesisTx = await this.chronik.tx(tokenId);
        if (genesisTx.outputs) {
          for (const output of genesisTx.outputs) {
            if (output.token && !output.token.isMintBaton) {
              genesisSupply += BigInt(output.token.atoms || output.token.amount || 0);
            }
          }
        }
      } catch (e) {
        console.warn(`Impossible de calculer genesisSupply pour ${tokenId}:`, e);
      }
      
      return {
        tokenId,
        tokenType: tokenData.tokenType || 'UNKNOWN',
        genesisInfo: {
          ...tokenData.genesisInfo,
          genesisSupply: genesisSupply.toString(),
          circulatingSupply: circulatingSupply.toString()
        },
        timeFirstSeen: tokenData.timeFirstSeen || '0',
        ticker: tokenData.genesisInfo?.tokenTicker || 'UNKNOWN',
        name: tokenData.genesisInfo?.tokenName || 'Unknown Token',
        decimals: tokenData.genesisInfo?.decimals || 0,
        url: tokenData.genesisInfo?.url || '',
        hash: tokenData.genesisInfo?.hash || ''
      };
    } catch (error) {
      console.error(`Failed to fetch token info for ${tokenId}:`, error);
      return {
        tokenId,
        tokenType: 'UNKNOWN',
        ticker: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 0,
        genesisInfo: { genesisSupply: '0', circulatingSupply: '0' }
      };
    }
  }

  async listETokens() {
    const scriptUtxos = await this.chronik.script('p2pkh', toHex(this.pkh)).utxos();
    const tokenMap = new Map();
    
    for (const utxo of scriptUtxos.utxos) {
      if (utxo.token && !utxo.token.isMintBaton) {
        const tokenId = utxo.token.tokenId;
        const amount = BigInt(utxo.token.amount || utxo.token.atoms || 0);
        tokenMap.set(tokenId, (tokenMap.get(tokenId) || 0n) + amount);
      }
    }
    
    return Array.from(tokenMap.entries()).map(([tokenId, balance]) => ({
      tokenId,
      balance: balance.toString()
    }));
  }

  async getMintBatons() {
    const balance = await this.getBalance();
    const tokenUtxos = balance.utxos.token;
    
    const slpBatons = tokenUtxos.filter(utxo => utxo.token?.isMintBaton === true);
    const uniqueBatons = [];
    const seenIds = new Set();
    
    for (const utxo of slpBatons) {
      if (!seenIds.has(utxo.token.tokenId)) {
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

  async getMaxSendAmount() {
    const bal = await this.getBalance();
    const utxos = bal.utxos.pureXec;
    if (utxos.length === 0) return 0;

    let totalInput = 0n;
    utxos.forEach(u => totalInput += u.sats);

    // Estimation conservative : ~500 sats pour les frais
    const estimatedFee = 500n;
    const maxSats = totalInput - estimatedFee - COMMISSION_SATS;
    if (maxSats < DUST_LIMIT) return 0;
    
    return Number(maxSats) / 100;
  }
  // --- ENVOI XEC (AVEC COMMISSION) ---
  async sendXec(toAddress, amountXec) {
     const cleanStr = String(amountXec).replace(',', '.').trim();
     const satsToSend = BigInt(Math.round(Number(cleanStr) * 100));

     if (satsToSend < DUST_LIMIT) throw new Error("Montant trop faible (Dust Limit)");

     const bal = await this.getBalance(true);
     const utxos = bal.utxos.pureXec;
     if(utxos.length === 0) throw new Error("Wallet vide");

     const pkhDest = typeof decodeCashAddress(toAddress) === 'string' ? fromHex(decodeCashAddress(toAddress)) : decodeCashAddress(toAddress);
     const pkhAdmin = typeof decodeCashAddress(ADMIN_ADDRESS) === 'string' ? fromHex(decodeCashAddress(ADMIN_ADDRESS)) : decodeCashAddress(ADMIN_ADDRESS);

     const inputs = [];
     for(const u of utxos) {
        inputs.push({
           input: { prevOut: u.outpoint, signData: { sats: u.sats, outputScript: this.p2pkh } },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }

     // TxBuilder calcule automatiquement les frais
     const outputs = [
        { sats: satsToSend, script: Script.p2pkh(pkhDest) },
        { sats: COMMISSION_SATS, script: Script.p2pkh(pkhAdmin) },
        this.p2pkh  // Change XEC automatique
     ];

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return { txid: res.txid };
  }

  // --- ENVOI TOKEN (SANS COMMISSION) ---
  async sendToken(tokenId, toAddress, amountToken, decimals = 0, protocol = 'ALP') {
     const safeProtocol = (protocol && protocol.toUpperCase() === 'ALP') ? 'ALP' : 'SLP';
     const amountNum = Number(String(amountToken).replace(',', '.').trim());
     const sendAtoms = BigInt(Math.round(amountNum * (10 ** decimals)));
     
     const tokenData = await this.getTokenBalance(tokenId);
     if (BigInt(tokenData.balance) < sendAtoms) throw new Error("Solde Token insuffisant");

     let inputAtoms = 0n;
     const tokenInputs = [];
     
     for (const utxo of tokenData.utxos) {
        inputAtoms += utxo.token.atoms;
        tokenInputs.push(utxo);
        if (inputAtoms >= sendAtoms) break;
     }

     const bal = await this.getBalance();
     const xecUtxos = bal.utxos.pureXec;
     
     const changeAtoms = inputAtoms - sendAtoms;

     const inputs = tokenInputs.map(utxo => ({
        input: { prevOut: utxo.outpoint, signData: { sats: utxo.sats, outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
     }));

     for (const utxo of xecUtxos) {
        inputs.push({
           input: { prevOut: utxo.outpoint, signData: { sats: utxo.sats, outputScript: this.p2pkh } },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }

     const outputs = [];
     
     let opReturn;
     if (changeAtoms > 0n) {
       opReturn = this._buildTokenScript(safeProtocol, tokenId, sendAtoms, changeAtoms);
     } else {
       opReturn = this._buildTokenScript(safeProtocol, tokenId, sendAtoms);
     }
     outputs.push({ sats: 0n, script: opReturn });

     const pkhDest = typeof decodeCashAddress(toAddress) === 'string' ? fromHex(decodeCashAddress(toAddress)) : decodeCashAddress(toAddress);
     outputs.push({ sats: DUST_LIMIT, script: Script.p2pkh(pkhDest) });

     if (changeAtoms > 0n) {
        outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
     }

     outputs.push(this.p2pkh);  // Change XEC automatique

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return { txid: res.txid };
  }

  // --- CREATION TOKEN (SANS COMMISSION) ---
  async createToken(params) {
    const { name, ticker, url, decimals, quantity, isFixedSupply } = params;
    
    const bal = await this.getBalance(true);
    const utxos = bal.utxos.pureXec;
    
    const inputs = [];
    // Utiliser Math.round pour éviter les problèmes de précision avec les décimales
    const quantityNumber = Number(quantity);
    const decimalsNumber = Number(decimals);
    const initialQty = BigInt(Math.round(quantityNumber * Math.pow(10, decimalsNumber)));
    
    console.log(`🔢 Token Creation: quantity=${quantityNumber}, decimals=${decimalsNumber}, atoms=${initialQty}`);
    
    for(const u of utxos) {
       inputs.push({
          input: { prevOut: u.outpoint, signData: { sats: u.sats, outputScript: this.p2pkh } },
          signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
       });
    }

    const outputs = [];
    const script = this._buildAlpGenesis(ticker, name, url, decimals, toHex(this.pk), isFixedSupply, initialQty);
    outputs.push({ sats: 0n, script: script });
    
    if (initialQty > 0n) outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
    if (!isFixedSupply) outputs.push({ sats: DUST_LIMIT, script: this.p2pkh });
    outputs.push(this.p2pkh);  // Change XEC automatique

    const txBuild = new TxBuilder({ inputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    
    return { txid: res.txid, ticker, protocol: 'ALP' };
  }

  // --- MINT TOKEN (SANS COMMISSION) ---
  async mintToken(tokenId, amount, decimals = 0) {
     const scriptUtxos = await this.chronik.script('p2pkh', toHex(this.pkh)).utxos();
     const mintBatonUtxo = scriptUtxos.utxos.find(
       u => u.token && u.token.tokenId === tokenId && u.token.isMintBaton === true
     );

     if (!mintBatonUtxo) throw new Error(`Aucun Mint Baton trouvé pour le token ${tokenId}`);

     const mintAtoms = BigInt(Math.round(Number(amount) * Math.pow(10, decimals)));
     
     // Utiliser alpMint de ecash-lib
     const mintData = {
       atomsArray: [mintAtoms],  // Quantité à minter
       numBatons: 1              // Préserver le mint baton
     };
     const alpMintData = alpMint(tokenId, ALP_STANDARD, mintData);
     const mintScript = emppScript([alpMintData]);
     
     const bal = await this.getBalance(true);
     const xecUtxos = bal.utxos.pureXec;
     
     const inputs = [{
        input: { prevOut: mintBatonUtxo.outpoint, signData: { sats: BigInt(mintBatonUtxo.value || mintBatonUtxo.sats || 546), outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
     }];
     
     for(const u of xecUtxos) {
        inputs.push({
           input: { prevOut: u.outpoint, signData: { sats: u.sats, outputScript: this.p2pkh } },
           signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
        });
     }
     
     const outputs = [
        { sats: 0n, script: mintScript },
        { sats: DUST_LIMIT, script: this.p2pkh },  // Tokens mintés
        { sats: DUST_LIMIT, script: this.p2pkh },  // Mint baton
        this.p2pkh  // Change XEC automatique
     ];

     const txBuild = new TxBuilder({ inputs, outputs });
     const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
     const res = await this.chronik.broadcastTx(tx.toHex());
     return res.txid;
  }

  // --- BURN TOKEN (SANS COMMISSION) ---
  async burnToken(tokenId, amount, decimals = 0) {
    const burnAtoms = BigInt(Math.round(Number(amount) * Math.pow(10, decimals)));
    const tokenData = await this.getTokenBalance(tokenId);
    const availableAtoms = BigInt(tokenData.balance);
    
    if (availableAtoms < burnAtoms) throw new Error("Solde token insuffisant");

    let inputAtoms = 0n;
    const tokenInputs = [];
    
    // Sélectionner UNIQUEMENT les UTXOs token nécessaires
    for (const utxo of tokenData.utxos) {
      if (utxo.token.isMintBaton) continue;
      inputAtoms += utxo.token.atoms;
      tokenInputs.push(utxo);
      if (inputAtoms >= burnAtoms) break;
    }

    if (inputAtoms < burnAtoms) throw new Error("UTXOs insuffisants");

    const balanceData = await this.getBalance();
    const xecUtxos = balanceData.utxos.pureXec;
    if (xecUtxos.length === 0) throw new Error("Pas assez de XEC pour les frais");

    const changeAtoms = inputAtoms - burnAtoms;
    
    console.log(`🔥 BURN DEBUG: inputAtoms=${inputAtoms}, burnAtoms=${burnAtoms}, changeAtoms=${changeAtoms}`);

    // Construire inputs : tokens d'abord, puis XEC
    const inputs = tokenInputs.map(utxo => ({
      input: { prevOut: utxo.outpoint, signData: { sats: utxo.sats, outputScript: this.p2pkh } },
      signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
    }));
    
    for (const utxo of xecUtxos) {
      inputs.push({
        input: { prevOut: utxo.outpoint, signData: { sats: utxo.sats, outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
      });
    }

    const outputs = [];
    
    // SOLUTION : TOUJOURS déclarer explicitement le burn avec alpBurn
    // Et envoyer le change séparément avec alpSend
    if (changeAtoms > 0n) {
      // Cas 1 : Burn partiel - on doit déclarer le burn ET envoyer le change
      console.log(`🔥 Partial burn: burnAtoms=${burnAtoms}, changeAtoms=${changeAtoms}`);
      
      // Créer un OP_RETURN avec alpBurn ET alpSend
      const alpBurnData = alpBurn(tokenId, ALP_STANDARD, burnAtoms);
      const alpSendData = alpSend(tokenId, ALP_STANDARD, [changeAtoms]);
      const combinedScript = emppScript([alpBurnData, alpSendData]);
      
      outputs.push({ sats: 0n, script: combinedScript });
      outputs.push({ sats: DUST_LIMIT, script: this.p2pkh }); // Pour recevoir le change
    } else {
      // Cas 2 : Burn total - juste alpBurn
      console.log(`🔥 Full burn: burnAtoms=${burnAtoms}`);
      const alpBurnData = alpBurn(tokenId, ALP_STANDARD, burnAtoms);
      const burnScript = emppScript([alpBurnData]);
      outputs.push({ sats: 0n, script: burnScript });
    }
    
    outputs.push(this.p2pkh);  // Change XEC automatique

    const txBuild = new TxBuilder({ inputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    return { txid: res.txid };
  }

  // --- AIRDROP (SANS COMMISSION) ---
  async calculateAirdropHolders(tokenId, minEligibleTokens = 0, ignoreCreator = false, decimals = 0) {
    const tokenUtxos = await this.chronik.tokenId(tokenId).utxos();
    const holderBalances = new Map();
    let totalTokenSupply = 0n;

    for (const utxo of tokenUtxos.utxos) {
      if (!utxo.token || utxo.token.isMintBaton) continue;
      
      let address;
      try {
        const pkhHex = utxo.script.substring(6, 46);
        const pkh = fromHex(pkhHex);
        address = encodeCashAddress(pkh);
      } catch (e) {
        continue;
      }

      const tokenAmount = BigInt(utxo.token.amount || utxo.token.atoms || 0);
      holderBalances.set(address, (holderBalances.get(address) || 0n) + tokenAmount);
      totalTokenSupply += tokenAmount;
    }

    if (ignoreCreator) holderBalances.delete(this.addressStr);

    const minAtoms = minEligibleTokens > 0 
      ? BigInt(Math.round(minEligibleTokens * (10 ** decimals)))
      : 0n;

    const eligibleHolders = Array.from(holderBalances.entries())
      .filter(([address, balance]) => balance >= minAtoms)
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

  async airdrop(tokenId, totalAmountXec, proportional = true, ignoreCreator = true, minEligible = 0) {
    const tokenUtxos = await this.chronik.tokenId(tokenId).utxos();
    const holderBalances = new Map();
    let totalTokenSupply = 0n;

    for (const utxo of tokenUtxos.utxos) {
      if (!utxo.token || utxo.token.isMintBaton) continue;
      
      let address;
      try {
        const pkhHex = utxo.script.substring(6, 46);
        const pkh = fromHex(pkhHex);
        address = encodeCashAddress(pkh);
      } catch (e) {
        continue;
      }

      const tokenAmount = BigInt(utxo.token.amount || utxo.token.atoms || 0);
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

    const result = await this._sendMany(recipients);
    
    return {
      success: true,
      txid: result.txid,
      holdersCount: holders.length,
      recipientsCount: recipients.length,
      totalDistributed: Number(totalSatsToDistribute) / 100,
      method: proportional ? 'proportional' : 'equal'
    };
  }

  async _sendMany(recipients) {
    const bal = await this.getBalance(true);
    const xecUtxos = bal.utxos.pureXec;
    if (xecUtxos.length === 0) throw new Error("Aucun UTXO XEC disponible");

    const selectedInputs = [];
    
    for (const utxo of xecUtxos) {
      selectedInputs.push({
        input: { prevOut: utxo.outpoint, signData: { sats: utxo.sats, outputScript: this.p2pkh } },
        signatory: P2PKHSignatory(this.sk, this.pk, ALL_BIP143)
      });
    }

    const outputs = recipients.map(r => {
      const decoded = decodeCashAddress(r.address);
      const pkh = typeof decoded === 'string' ? fromHex(decoded) : decoded;
      return { sats: r.sats, script: Script.p2pkh(pkh) };
    });
    
    outputs.push(this.p2pkh);  // Change XEC automatique

    const txBuild = new TxBuilder({ inputs: selectedInputs, outputs });
    const tx = txBuild.sign({ feePerKb: 1200n, dustSats: DUST_LIMIT });
    const res = await this.chronik.broadcastTx(tx.toHex());
    return { txid: res.txid };
  }

  // --- HELPERS ---
  _buildTokenScript(protocol, tokenId, amount1, amount2 = 0n) {
    // Utiliser alpSend de ecash-lib pour construire le script ALP correctement
    const sendAtomsArray = amount2 > 0n ? [amount1, amount2] : [amount1];
    const alpSendData = alpSend(tokenId, ALP_STANDARD, sendAtomsArray);
    return emppScript([alpSendData]);
  }

  _buildAlpGenesis(ticker, name, url, decimals, authPubkey, isFixedSupply, initialQty = 0n) {
    // Utiliser alpGenesis de ecash-lib
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

export const createWallet = (m) => new EcashWallet(m);
export const generateMnemonic = () => bip39.generateMnemonic(wordlist);
export const validateMnemonic = (m) => bip39.validateMnemonic(m, wordlist);