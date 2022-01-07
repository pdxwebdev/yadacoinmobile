import { Component } from '@angular/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { SettingsService } from '../../app/settings.service';
import { CreateAssetPage } from './createasset';
import { AssetItemPage } from './assetitem';


@Component({
  selector: 'assets',
  templateUrl: 'assets.html'
})
export class AssetsPage {
  items = []
  loading = false;
  rids: any;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public graphService: GraphService,
    public bulletinSecretService: BulletinSecretService,
    private settingsService: SettingsService,
    private events: Events
  ) {
    this.loading = true;
    let rids = [this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.username_signature,
      this.settingsService.collections.ASSET
    )];
    this.rids = rids
  }

  ionViewDidEnter() {
    this.refresh()
  }

  refresh() {
    return this.graphService.getAssets(this.rids)
    .then((items) => {
      this.loading = false;
      this.items = items.filter((item) => {
        try {
          return item.relationship[this.settingsService.collections.ASSET].data.substr(0, 5) === 'data:'
        } catch(err) {
          return false;
        }        
      });
    });
  }

  itemTapped(event, item) {
    this.navCtrl.push(AssetItemPage, {
      item: item
    });
  }

  createAsset() {
    this.navCtrl.push(CreateAssetPage);
  }
}
