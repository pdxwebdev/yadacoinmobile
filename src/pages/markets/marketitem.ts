import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { WalletService } from '../../app/wallet.service';
import { CreateSalePage } from './createsale';
import { ProfilePage } from '../profile/profile';
import { SettingsService } from '../../app/settings.service';
import { SmartContractService } from '../../app/smartContract.service';
import { WebSocketService } from '../../app/websocket.service';


declare var X25519;
declare var foobar;


@Component({
  selector: 'market-item',
  templateUrl: 'marketitem.html'
})
export class MarketItemPage {
  item: any;
  smartContract: any;
  bids: any;
  affiliates: any;
  market: any;
  smartContractAddress: any
  price: any;
  minPrice: any;
  balance: any;
  constructor(
    public navCtrl: NavController,
    private navParams: NavParams,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private alertCtrl: AlertController,
    private transactionService: TransactionService,
    private settingsService: SettingsService,
    private smartContractService: SmartContractService,
    private websocketService: WebSocketService
  ) {
    this.item = navParams.get('item');
    this.smartContract = this.item.relationship[this.settingsService.collections.SMART_CONTRACT];
    this.market = navParams.get('market').relationship[this.settingsService.collections.MARKET];
    this.bids = [];
    this.affiliates = [];
    this.refresh();
    this.price = this.smartContract.price;
    this.minPrice = this.smartContract.price;
    this.graphService.getBlockHeight()
    .then((data) => {
      this.settingsService.latest_block = data;
    })
  }

  refresh() {
    const identity = JSON.parse(JSON.stringify(this.smartContract.identity))
    if (this.smartContract.contract_type === this.smartContractService.contractTypes.CHANGE_OWNERSHIP) {
      identity.collection = this.settingsService.collections.BID;
    } else {
      identity.collection = this.settingsService.collections.AFFILIATE
    }
    const rids = this.graphService.generateRids(identity);

    const scAddress = this.bulletinSecretService.publicKeyToAddress(this.smartContract.identity.public_key)
    this.walletService.get(this.price, scAddress)
    .then((wallet: any) => {
      this.balance = this.item.pending ? wallet.pending_balance : wallet.balance;
      return this.graphService.getBids(rids.requested_rid, this.market)
    })
    .then((bids) => {
      this.bids = bids.sort((a, b) => {
        const aamount = this.getAmount(a);
        const bamount = this.getAmount(b);

        if (aamount < bamount) return 1;
        if (aamount > bamount) return -1;
        if (aamount === bamount) return 0;
      });
      if(this.bids.slice(0).length > 0) {
        this.price = this.getAmount(this.bids[0])
        this.minPrice = this.price
      }
    })
    this.graphService.getAffiliates(rids.requested_rid, this.market)
    .then((affiliates) => {
      this.affiliates = affiliates.filter((item) => {
        if (item.public_key === this.bulletinSecretService.identity.public_key) return true
      })
    })
    this.smartContractAddress = foobar.bitcoin.ECPair.fromPublicKeyBuffer(
      foobar.Buffer.Buffer.from(
        this.smartContract.identity.public_key, 'hex'
      )
    ).getAddress()
  }

  getAmount(bid) {
    let total = 0

    for(let i=0; i < bid.outputs.length; i++) {
      if(bid.outputs[i].to === this.smartContractAddress) total += bid.outputs[i].value;
    }
    return total;
  }

  openProfile(identity) {
    this.navCtrl.push(ProfilePage, {
        identity: identity
    })
  }

  buy(e) {
    // generate purchase txn
    let alert = this.alertCtrl.create();
    let buttonText = '';
    if(this.smartContract.asset_proof_type === this.smartContractService.assetProofTypes.FIRST_COME) {
      alert.setTitle('Buy Asset');
      alert.setSubTitle('Are you sure you want to buy this asset?');
      buttonText = 'Buy'
    } else if(this.smartContract.asset_proof_type === this.smartContractService.assetProofTypes.AUCTION) {
      alert.setTitle('Bid on Asset');
      alert.setSubTitle('Are you sure you want to place a bid for this asset?');
      buttonText = 'Bid'
    }
    alert.addButton({
        text: 'Cancel'
    });
    alert.addButton({
        text: buttonText,
        handler: (data: any) => {
          const scAddress = this.bulletinSecretService.publicKeyToAddress(this.smartContract.identity.public_key)
          this.walletService.get(this.price)
          .then(() => {
            const rids = this.graphService.generateRids(this.smartContract.identity, this.smartContract.identity, this.settingsService.collections.BID)
            return this.websocketService.newtxn(
              this.graphService.toIdentity(
                this.bulletinSecretService.identity
              ),
              rids,
              this.settingsService.collections.BID,
              this.market.username_signature,
              {
                to: scAddress,
                value: this.price
              }
            )
          })
          .then(() => {
            return this.refresh();
          })
          .catch((err) => {
            let alert = this.alertCtrl.create();
            alert.setTitle('Transaction failed');
            alert.setSubTitle(err);
            alert.addButton({
                text: 'Ok'
            });
            alert.present();
          });
        }
    });
    alert.present();
  }

  joinPromotion(e) {
    // generate purchase txn
    let alert = this.alertCtrl.create();
    let buttonText = '';
    alert.setTitle('Join promotion');
    alert.setSubTitle('Are you sure you want to join this promotion?');
    buttonText = 'Join'
    alert.addButton({
        text: 'Cancel'
    });
    alert.addButton({
        text: buttonText,
        handler: (data: any) => {
          const rids = this.graphService.generateRids(
            this.smartContract.identity,
            this.smartContract.identity,
            this.settingsService.collections.AFFILIATE
          )
          this.websocketService.newtxn(
            {
              referrer: this.graphService.toIdentity(
                this.bulletinSecretService.identity
              ),
              target: this.smartContract.target,
              contract: this.graphService.toIdentity(
                this.smartContract.identity
              )
            },
            rids,
            this.settingsService.collections.AFFILIATE,
            this.market.username_signature
          )
          .then(() => {
            return this.refresh();
          })
          .catch((err) => {
            let alert = this.alertCtrl.create();
            alert.setTitle('Transaction failed');
            alert.setSubTitle(err);
            alert.addButton({
                text: 'Ok'
            });
            alert.present();
          });
        }
    });
    alert.present();
  }

  toHex(byteArray) {
    var callback = function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }
    return Array.from(byteArray, callback).join('')
  }

}
