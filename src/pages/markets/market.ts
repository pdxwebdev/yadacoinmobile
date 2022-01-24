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
  prevHeight: any;
  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private graphService: GraphService,
    private settingsService: SettingsService,
    private smartContractService: SmartContractService
  ) {
    this.item = this.navParams.get('item')
    this.market = this.item.relationship[this.settingsService.collections.MARKET]
    setInterval(() => {
      if(this.prevHeight < this.settingsService.latest_block.height) this.refresh();
    }, 1000)
  }

  ionViewDidEnter() {
    this.refresh()
  }

  refresh(e=null) {
    this.graphService.getBlockHeight()
    .then((data) => {
      this.settingsService.latest_block = data;
    })
    .then(() => {
      return this.graphService.getSmartContracts(this.market)
    })
    .then((smartContracts: any) => {
      this.smartContracts = smartContracts.filter((item) => {
        try {
          const sc = item.relationship[this.settingsService.collections.SMART_CONTRACT]
          if ((sc.expiry - this.settingsService.latest_block.height) < 0) {
            return false;
          }
          if (sc.contract_type === this.smartContractService.contractTypes.CHANGE_OWNERSHIP) {
            return sc.asset.data.substr(0, 5) === 'data:';
          }
        } catch(err) {
          return false;
        }
        return true;
      })
      console.log(this.smartContracts)
      e && e.complete()
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
      item: smartContract,
      market: this.item
    });
  }
}