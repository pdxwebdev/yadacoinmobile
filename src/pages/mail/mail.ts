import { Component } from '@angular/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { SettingsService } from '../../app/settings.service';
import { ComposePage } from './compose';
import { MailItemPage } from './mailitem';


@Component({
  selector: 'mail-profile',
  templateUrl: 'mail.html'
})
export class MailPage {
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
      this.settingsService.collections.MAIL
    ),
    this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.username_signature,
      this.settingsService.collections.CONTRACT
    ),
    this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.username_signature,
      this.settingsService.collections.CONTRACT_SIGNED
    ),
    this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.username_signature,
      this.settingsService.collections.CALENDAR
    )];
    let group_rids = [];
    for (let i=0; i < this.graphService.graph.groups.length; i++) {
      const group = this.graphService.getIdentityFromTxn(this.graphService.graph.groups[i]);
      group_rids.push(this.graphService.generateRid(
        group.username_signature,
        group.username_signature,
        this.settingsService.collections.GROUP_MAIL
      ))
    }
    let file_rids = [];
    for (let i=0; i < this.graphService.graph.files.length; i++) {
      const group = this.graphService.getIdentityFromTxn(this.graphService.graph.files[i]);
      file_rids.push(this.graphService.generateRid(
        group.username_signature,
        group.username_signature,
        this.settingsService.collections.GROUP_MAIL
      ))
    }
    if (group_rids.length > 0) {
      rids = rids.concat(group_rids);
    }
    if (file_rids.length > 0) {
      rids = rids.concat(file_rids);
    }
    this.rids = rids
    this.events.subscribe('newmail', () => {this.refresh()})
    this.refresh()
  }

  refresh() {
    return this.graphService.getMail(this.rids, this.settingsService.collections.MAIL)
    .then(() => {
      return this.graphService.getMail(this.rids, this.settingsService.collections.GROUP_MAIL)
    })
    .then(() => {
      this.items = this.graphService.prepareMailItems(this.navParams.data.pageTitle.label)
      this.loading = false;
    })
  }

  itemTapped(event, item) {
    this.navCtrl.push(MailItemPage, {
      item: item
    });
  }

  composeMail() {
    this.navCtrl.push(ComposePage);
  }
}
