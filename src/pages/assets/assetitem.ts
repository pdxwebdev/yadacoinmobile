import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { WalletService } from '../../app/wallet.service';
import { CreateAssetPage } from './createasset';
import { ProfilePage } from '../profile/profile';
import { SettingsService } from '../../app/settings.service';
import { SmartContractService } from '../../app/smartContract.service';
import { WebSocketService } from '../../app/websocket.service';
import Groups from '../../app/groups';
import { CreateSalePage } from '../markets/createsale';


declare var X25519;
declare var foobar;


@Component({
  selector: 'asset-item',
  templateUrl: 'assetitem.html'
})
export class AssetItemPage {
  item: any;
  asset: any;
  market: any;
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
    this.item = navParams.data.item
    this.asset = this.item.relationship[this.settingsService.collections.ASSET]
    this.market = graphService.graph.markets.filter((market)=> {return market.relationship[settingsService.collections.MARKET].username === 'Marketplace'})[0]
  }

  sell(e, market) {
    this.navCtrl.push(CreateSalePage, {
      item: this.item,
      market: this.market
    });
  }

  toHex(byteArray) {
    var callback = function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }
    return Array.from(byteArray, callback).join('')
  }

}
