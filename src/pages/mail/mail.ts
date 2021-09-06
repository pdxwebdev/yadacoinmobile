import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { ComposePage } from './compose';
import { MailItemPage } from './mailitem';


@Component({
  selector: 'mail-profile',
  templateUrl: 'mail.html'
})
export class MailPage {
  items = []
  loading = false;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public graphService: GraphService,
    public bulletinSecretService: BulletinSecretService
  ) {
    this.loading = true;
    this.graphService.getGroups()
    .then(() => {
      let rids = [this.graphService.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        'mail'
      ),
      this.graphService.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        'contract'
      ),
      this.graphService.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        'contract_signed'
      ),
      this.graphService.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        'event_meeting'
      )];
      let group_rids = [];
      for (let i=0; i < this.graphService.graph.groups.length; i++) {
        const group = this.graphService.graph.groups[i];
        group_rids.push(this.graphService.generateRid(
          group.relationship.username_signature,
          group.relationship.username_signature,
          'group_mail'
        ))
      }
      if (group_rids.length > 0) {
        rids = rids.concat(group_rids);
      }
      return this.graphService.getMail(rids)
    })
    .then(() => {
      this.items = this.graphService.graph.mail.filter((item) => {
        if (this.navParams.data.pageTitle.label === 'Sent' && item.public_key === this.bulletinSecretService.identity.public_key) return true;
        if (this.navParams.data.pageTitle.label === 'Inbox' && item.public_key !== this.bulletinSecretService.identity.public_key) return true;
      }).map((item) => {
        const indexedItem = this.graphService.groups_indexed[item.requested_rid] || this.graphService.friends_indexed[item.rid];
        const identity = indexedItem.relationship.identity || indexedItem.relationship;
        return {
          sender: item.public_key === this.bulletinSecretService.identity.public_key ? this.bulletinSecretService.identity : {
            username: identity.username,
            username_signature: identity.username_signature,
            public_key: identity.public_key,
          },
          subject: item.relationship.envelope.subject,
          body: item.relationship.envelope.body,
          datetime: new Date(parseInt(item.time)*1000).toISOString().slice(0, 19).replace('T', ' '),
          id: item.id,
          thread: item.relationship.thread,
          message_type: item.relationship.envelope.message_type,
          event_datetime: item.relationship.envelope.event_datetime,
        }
      })
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
