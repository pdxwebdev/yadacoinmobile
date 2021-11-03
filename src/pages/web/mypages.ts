import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { SettingsService } from '../../app/settings.service';
import { BuildPagePage } from './buildpage';
import { WebPage } from './web';


@Component({
  selector: 'mail-mypages',
  templateUrl: 'mypages.html'
})
export class MyPagesPage {
  items = []
  loading = false;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public graphService: GraphService,
    public bulletinSecretService: BulletinSecretService,
    public settingsService: SettingsService
  ) {
    this.loading = true;
    let rids = [this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.username_signature,
      this.settingsService.collections.WEB_PAGE
    )];
    this.graphService.getMyPages(rids)
    .then(() => {
      this.items = this.graphService.graph.mypages
      this.loading = false;
    })
  }

  itemTapped(event, item) {
    const myRids = this.graphService.generateRids(this.bulletinSecretService.identity)
    let recipient;
    if (this.graphService.friends_indexed[item.rid]) {
      recipient = this.graphService.friends_indexed[item.rid].relationship
    }

    if (myRids.rid == item.rid){
      recipient = this.bulletinSecretService.identity
    }

    if (!recipient) return;

    this.navCtrl.push(WebPage, {
      recipient: recipient,
      resource: item.relationship[this.settingsService.collections.WEB_PAGE].resource,
      content: item.relationship[this.settingsService.collections.WEB_PAGE].content
    });
  }

  buildPage() {
    this.navCtrl.push(BuildPagePage);
  }
}
