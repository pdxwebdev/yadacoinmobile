import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { SettingsService } from '../../app/settings.service';
import { WebSocketService } from '../../app/websocket.service';
import { TransactionService } from '../../app/transaction.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { identity } from 'rxjs';
import { Http } from '@angular/http';
import { SmartContractService } from '../../app/smartContract.service';
import Groups from '../../app/groups';
import { MarketPage } from './market';
import { CompleteTestService } from '../../app/autocomplete.provider';
import { WalletService } from '../../app/wallet.service';


declare var X25519;
declare var foobar;

@Component({
    selector: 'create-promo',
    templateUrl: 'createpromo.html'
})
export class CreatePromoPage {
    busy: any;
    item: any;
    asset: any;
    price: any;
    market: any;
    affiliate_proof_type: any;
    promotedIdentity: any;
    selectedIdentity: any;
    selectedIdentityForm: any;
    pay_referrer: any;
    pay_referrer_operator: any;
    pay_referrer_payout_type: any;
    pay_referrer_amount: any;
    pay_referrer_payout_interval: any;
    pay_referee: any;
    pay_referee_operator: any;
    pay_referee_payout_type: any;
    pay_referee_amount: any;
    pay_referee_payout_interval: any;
    fund_amount: any;
    expiry: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
        private websocketService: WebSocketService,
        private transactionService: TransactionService,
        private alertCtrl: AlertController,
        private ahttp: Http,
        private smartContractService: SmartContractService,
        public completeTestService: CompleteTestService,
        private walletService: WalletService
    ) {
      const market = this.navParams.get('market');
      this.market = market.relationship[this.settingsService.collections.MARKET]
      this.affiliate_proof_type = this.smartContractService.promoProofTypes.HONOR
      this.promotedIdentity = 'me';
      this.graphService.getBlockHeight()
      .then((data) => {
        this.settingsService.latest_block = data;
      })
    }

    myForm = new FormGroup({
        searchTerm: new FormControl('', [Validators.required])
    })

    promotedIdentityChanged() {
      if (this.promotedIdentity === 'me') {
        this.selectedIdentity = this.graphService.toIdentity(this.bulletinSecretService.identity);
      } else {
        this.selectedIdentity = '';
      }
    }

    contactSearchChanged() {
      this.promotedIdentity = 'contact';
    }

    presentError(field) {

      let alert = this.alertCtrl.create();
      alert.setTitle('Missing field');
      alert.setSubTitle('Please enter information for ' + field + '.');
      alert.addButton({
          text: 'Ok'
      });
      alert.present();
    }

    save() {
      if (this.pay_referrer === true) {
        if (!this.pay_referrer_operator) {
          this.presentError('pay_referrer_operator')
          return
        }
        if (!this.pay_referrer_payout_type) {
          this.presentError('pay_referrer_payout_type')
          return
        }
        if (!this.pay_referrer_payout_interval) {
          this.presentError('pay_referrer_payout_interval')
          return
        }
        if (!this.pay_referrer_amount) {
          this.presentError('pay_referrer_amount')
          return
        }
      }
      if (this.pay_referee === true) {
        if (!this.pay_referee_operator) {
          this.presentError('pay_referee_operator')
          return
        }
        if (!this.pay_referee_payout_type) {
          this.presentError('pay_referee_payout_type')
          return
        }
        if (!this.pay_referee_payout_interval) {
          this.presentError('pay_referee_payout_interval')
          return
        }
        if (!this.pay_referee_amount) {
          this.presentError('pay_referee_amount')
          return
        }
      }
      if (!this.pay_referrer === true && !this.pay_referee === true) {
        this.presentError('pay_referrer and pay_referee')
        return
      }
      if (!this.fund_amount) {
        this.presentError('fund_amount')
        return
      }
      if (!this.expiry) {
        this.presentError('expiry')
        return
      }

      let alert = this.alertCtrl.create();
      alert.setTitle('Start promotion');
      alert.setSubTitle('Are you sure you want to start this promotion?');
      alert.addButton({
          text: 'Continue editing'
      });
      alert.addButton({
          text: 'Confirm',
          handler: (data: any) => {
            let selectedIdentity;
            if (this.promotedIdentity === 'me') {
              selectedIdentity = this.graphService.toIdentity(this.bulletinSecretService.cloneIdentity());
            } else {
              selectedIdentity = this.selectedIdentityForm;
            }
            this.walletService.get(this.fund_amount)
            .then(() => {
              const contract = this.smartContractService.generateNewRelationshipPromo(
                this.graphService.toIdentity(this.bulletinSecretService.cloneIdentity()),
                this.affiliate_proof_type,
                selectedIdentity,
                this.market,
                this.pay_referrer,
                this.pay_referrer_operator,
                this.pay_referrer_payout_type,
                parseInt(this.pay_referrer_payout_interval),
                parseFloat(this.pay_referrer_amount),
                this.pay_referee,
                this.pay_referee_operator,
                this.pay_referee_payout_type,
                parseInt(this.pay_referee_payout_interval),
                parseFloat(this.pay_referee_amount),
                parseInt(this.expiry)
              )
              const rids = this.graphService.generateRids(
                contract.identity,
                this.market,
                this.settingsService.collections.SMART_CONTRACT
              )
              const contractAddress = foobar.bitcoin.ECPair.fromPublicKeyBuffer(
                foobar.Buffer.Buffer.from(
                  contract.identity.public_key, 'hex'
                )
              ).getAddress()
              const outputs = []
              if (
                (contract.referee.active && contract.referee.operator === this.smartContractService.payoutOperators.FIXED) ||
                (contract.referrer.active && contract.referrer.operator === this.smartContractService.payoutOperators.FIXED)
              ) {
                outputs.push({
                  to: contractAddress,
                  value: parseFloat(this.fund_amount)
                })
              }
              return this.websocketService.newtxn(
                contract,
                rids,
                this.settingsService.collections.SMART_CONTRACT,
                this.market.username_signature,
                {outputs: outputs}
              )
            }).then(() => {
              this.navCtrl.pop();
            })
          }
      });
      alert.present();
    }

}