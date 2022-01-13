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


declare var X25519;
declare var foobar;

@Component({
    selector: 'create-sale',
    templateUrl: 'createsale.html'
})
export class CreateSalePage {
    busy: any;
    item: any;
    asset: any;
    price: any;
    market: any;
    asset_proof_type: any;
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
        private smartContractService: SmartContractService
    ) {
      const market = this.navParams.get('market');
      this.market = market.relationship[this.settingsService.collections.MARKET]
      this.item = this.navParams.get('item');
      this.asset = this.item.relationship[this.settingsService.collections.ASSET];
      this.asset_proof_type = this.smartContractService.assetProofTypes.FIRST_COME
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
      if (!this.price) {
        this.presentError('price')
        return
      }
      if (!this.asset_proof_type) {
        this.presentError('asset_proof_type')
        return
      }
      let alert = this.alertCtrl.create();
      alert.setTitle('Sell Asset');
      alert.setSubTitle('Are you sure you want to sell this asset?');
      alert.addButton({
          text: 'Continue editing'
      });
      alert.addButton({
          text: 'Confirm',
          handler: (data: any) => {
            const contract = this.smartContractService.generateChangeOfOwnership(
              this.asset,
              this.graphService.toIdentity(this.bulletinSecretService.cloneIdentity()),
              parseFloat(this.price),
              this.asset_proof_type,
              this.market,
              this.expiry
            )
            const rids = this.graphService.generateRids(
              contract.identity,
              this.market,
              this.settingsService.collections.SMART_CONTRACT
            )
            this.websocketService.newtxn(
              contract,
              rids,
              this.settingsService.collections.SMART_CONTRACT,
              this.market.username_signature
            )
            .then(() => {
              this.navCtrl.pop();
            })
          }
      });
      alert.present();
    }

}