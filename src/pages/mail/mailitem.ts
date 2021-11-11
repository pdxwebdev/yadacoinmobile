import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { WalletService } from '../../app/wallet.service';
import { ComposePage } from './compose';
import { ProfilePage } from '../profile/profile';
import { SettingsService } from '../../app/settings.service';


declare var X25519;


@Component({
  selector: 'mail-item',
  templateUrl: 'mailitem.html'
})
export class MailItemPage {
  item: any;
  constructor(
    public navCtrl: NavController,
    private navParams: NavParams,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private alertCtrl: AlertController,
    private transactionService: TransactionService,
    private settingsService: SettingsService
  ) {
    this.item = navParams.data.item
  }

  replyMail(item) {
    this.navCtrl.push(ComposePage, {
      item: item,
      mode: 'reply',
      thread: item.thread || item.id,
      message_type: item.message_type
    });
  }

  replyToAllMail(item) {
    this.navCtrl.push(ComposePage, {
      item: item,
      mode: 'replyToAll',
      thread: item.thread || item.id,
      message_type: item.message_type
    });
  }

  forwardMail(item) {
    this.navCtrl.push(ComposePage, {
      item: item,
      mode: 'forward'
    });
  }

  signMail(item) {
    this.navCtrl.push(ComposePage, {
      item: item,
      mode: 'sign',
      thread: item.thread || item.id
    });
  }

  addFriend() {
      let info: any;
      var buttons = [];
      buttons.push({
          text: 'Add',
          handler: (data) => {
              return this.graphService.addFriend(this.item.sender)
              .then((txn) => {
                  var alert = this.alertCtrl.create();
                  alert.setTitle('Contact Request Sent');
                  alert.setSubTitle('Your Friend Request has been sent successfully.');
                  alert.addButton('Ok');
                  alert.present();
              }).catch((err) => {
                  console.log(err);
              });

          }
      });
      let alert = this.alertCtrl.create({
          buttons: buttons
      });
      alert.setTitle('Add contact');
      alert.setSubTitle('Do you want to add ' + this.item.sender.username + '?');
      alert.present();
  }

  viewProfile(identity) {
    this.navCtrl.push(ProfilePage, {
      identity: identity
    });
  }

  toHex(byteArray) {
    var callback = function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }
    return Array.from(byteArray, callback).join('')
  }

}
