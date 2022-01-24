import { Injectable } from '@angular/core';
import { BulletinSecretService } from './bulletinSecret.service';
import { WalletService } from './wallet.service';
import { SettingsService } from './settings.service';
import { Http } from '@angular/http';
import { encrypt, decrypt, PrivateKey } from 'eciesjs'

declare var foobar;
declare var forge;
declare var Base64;

@Injectable()
export class SmartContractService {

    version = 1

    payoutOperators = {
        PERCENT: 'percent',
        FIXED: 'fixed'
    }


    payoutType = {
        RECURRING: 'recurring',
        ONE_TIME: 'one_time'
    }


    assetProofTypes = {
        CONFIRMATION: 'confirmation',
        FIRST_COME: 'first_come',
        AUCTION: 'auction'
    }


    promoProofTypes = {
        COINBASE: 'coinbase',
        CONFIRMATION: 'confirmation',
        HONOR: 'honor'
    }

    contractTypes = {
        CHANGE_OWNERSHIP: 'change_ownership',
        NEW_RELATIONSHIP: 'new_relationship'
    }

    constructor(
        private settingsService: SettingsService
    ) { }

    generateChangeOfOwnership(
      asset,
      creator,
      amount,
      proof_type,
      market,
      contract_expiry
    ) {
      const key = foobar.bitcoin.ECPair.makeRandom();
      const wif = key.toWIF();
      const username = '';
      const username_signature = foobar.base64.fromByteArray(key.sign(foobar.bitcoin.crypto.sha256(username)).toDER());
      const public_key = key.getPublicKeyBuffer().toString('hex');
      const identity = {
        username: username,
        username_signature: username_signature,
        public_key: public_key,
        wif: wif,
        collection: this.settingsService.collections.SMART_CONTRACT
      }
      const expiry = parseInt(contract_expiry) + parseInt(this.settingsService.latest_block.height)
      const contract_type = this.contractTypes.CHANGE_OWNERSHIP
      const payout_amount = 1
      const payout_operator = this.payoutOperators.PERCENT
      const payout_type = this.payoutType.ONE_TIME
      const price = amount;
      const username_signatures = [market.username_signature, market.username_signature].sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      const market_rid = forge.sha256.create().update(username_signatures[0] + username_signatures[1] + this.settingsService.collections.MARKET).digest().toHex();

      return {
        version: this.version,
        expiry,
        contract_type,
        payout_amount,
        payout_operator,
        payout_type,
        proof_type,
        price,
        identity,
        asset,
        creator,
        market: market_rid
      }
    }

    generateNewRelationshipPromo(
      creator,
      proof_type,
      target,
      market,
      pay_referrer,
      pay_referrer_operator,
      pay_referrer_payout_type,
      pay_referrer_payout_interval,
      pay_referrer_amount,
      pay_referee,
      pay_referee_operator,
      pay_referee_payout_type,
      pay_referee_payout_interval,
      pay_referee_amount,
      contract_expiry
    ) {
      const key = foobar.bitcoin.ECPair.makeRandom();
      const wif = key.toWIF();
      const username = '';
      const username_signature = foobar.base64.fromByteArray(key.sign(foobar.bitcoin.crypto.sha256(username)).toDER());
      const public_key = key.getPublicKeyBuffer().toString('hex');
      const identity = {
        username: username,
        username_signature: username_signature,
        public_key: public_key,
        wif: wif,
        collection: this.settingsService.collections.SMART_CONTRACT
      }
      const expiry = parseInt(contract_expiry) + parseInt(this.settingsService.latest_block.height)
      const contract_type = this.contractTypes.NEW_RELATIONSHIP
      const username_signatures = [market.username_signature, market.username_signature].sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      const market_rid = forge.sha256.create().update(username_signatures[0] + username_signatures[1] + this.settingsService.collections.MARKET).digest().toHex();

      return {
        version: this.version,
        expiry,
        contract_type,
        proof_type,
        identity,
        creator,
        target: target,
        market: market_rid,
        referrer: {
          active: pay_referrer,
          operator: pay_referrer_operator,
          payout_type: pay_referrer_payout_type,
          amount: pay_referrer_amount,
          interval: pay_referrer_payout_interval || ''
        },
        referee: {
          active: pay_referee,
          operator: pay_referee_operator,
          payout_type: pay_referee_payout_type,
          amount: pay_referee_amount,
          interval: pay_referee_payout_interval || ''
        }
      }
    }

    toString(contract) {
      if(contract.contract_type === this.contractTypes.CHANGE_OWNERSHIP) {
        return (
          '' +
          contract.version +
          contract.expiry +
          contract.contract_type +
          contract.payout_amount.toFixed(8) +
          contract.payout_operator +
          contract.payout_type +
          contract.market +
          contract.proof_type +
          contract.price.toFixed(8) +
          contract.identity.username_signature +
          contract.asset +
          contract.creator
        )
      } else if(contract.contract_type === this.contractTypes.NEW_RELATIONSHIP) {

        const referrer_str = contract.referrer.active === true ? (
          'true' +
          contract.referrer.operator +
          contract.referrer.payout_type +
          contract.referrer.interval +
          contract.referrer.amount.toFixed(8)
        ) : 'false';
        const referee_str = contract.referee.active === true ? (
          'true' +
          contract.referee.operator +
          contract.referee.payout_type +
          contract.referee.interval +
          contract.referee.amount.toFixed(8)
        ) : 'false';
        return (
          '' +
          contract.version +
          contract.expiry +
          contract.contract_type +
          contract.proof_type +
          contract.target +
          contract.market +
          contract.identity.username_signature +
          referrer_str +
          referee_str +
          contract.creator
        )
      }
    }
}