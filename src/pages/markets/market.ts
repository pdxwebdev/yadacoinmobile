import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { SettingsService } from '../../app/settings.service';
import { SmartContractService } from '../../app/smartContract.service';
import { AssetsPage } from '../assets/assets';
import { CreatePromoPage } from './createpromo';
import { CreateSalePage } from './createsale';
import { MarketItemPage } from './marketitem';


@Component({
  selector: 'market-page',
  templateUrl: 'market.html'
})
export class MarketPage {
  item: any;
  market: any;
  smartContracts: any;
  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private graphService: GraphService,
    private settingsService: SettingsService,
    private smartContractService: SmartContractService
  ) {
    this.item = this.navParams.get('item')
    this.market = this.item.relationship[this.settingsService.collections.MARKET]
  }

  ionViewDidEnter() {
    this.graphService.getSmartContracts(this.market)
    .then((smartContracts: any) => {
      this.smartContracts = smartContracts.filter((item) => {
        try {
          if (item.contract_type === this.smartContractService.contractTypes.CHANGE_OWNERSHIP) {
            return item.asset.data.substr(0, 5) === 'data:';
          }
        } catch(err) {
          return false;
        }
        return true;
      })
      console.log(this.smartContracts)
    })
  }

  sellAsset() {
    this.navCtrl.push(AssetsPage);  
  }

  startPromotion() {
    this.navCtrl.push(CreatePromoPage, {
      market: this.item
    });  
  }

  itemTapped(e, smartContract) {
    this.navCtrl.push(MarketItemPage, {
      smartContract: smartContract,
      market: this.item
    });  
  }
}