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
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public graphService: GraphService,
    public bulletinSecretService: BulletinSecretService
  ) {
    this.graphService.getMail(this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.server_username_signature,
      'mail'
    ))
    .then(() => {
      this.items = this.graphService.graph.mail.filter((item) => {
        if (this.navParams.data.pageTitle.label === 'Sent' && item.public_key === this.bulletinSecretService.identity.public_key) return true;
        if (this.navParams.data.pageTitle.label === 'Inbox' && item.public_key !== this.bulletinSecretService.identity.public_key) return true;
      }).map((item) => {
        return {
          sender: item.public_key === this.bulletinSecretService.identity.public_key ? this.bulletinSecretService.identity : {
            username: this.graphService.friends_indexed[item.rid].relationship.my_username,
            username_signature: this.graphService.friends_indexed[item.rid].relationship.my_username_signature,
            public_key: this.graphService.friends_indexed[item.rid].relationship.my_public_key
          },
          subject: item.relationship.envelope.subject,
          body: item.relationship.envelope.body,
          datetime: new Date(parseInt(item.time)*1000).toISOString().slice(0, 19).replace('T', ' ')
        }
      })
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
