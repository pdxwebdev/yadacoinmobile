import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { WalletService } from '../../app/wallet.service';
import { ComposePage } from './compose';
import { ProfilePage } from '../profile/profile';


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
    private transactionService: TransactionService
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

  addToCalendar(item) {
    let alert = this.alertCtrl.create();
    alert.setTitle('Send mail confirmation');
    alert.setSubTitle('Are you sure?');
    alert.addButton('Cancel');
    alert.addButton({
        text: 'Confirm',
        handler: (data: any) => {
            this.walletService.get()
            .then(() => {
                return this.graphService.getFriends();
            })
            .then(() => {
                const rid = this.graphService.generateRid(
                  this.bulletinSecretService.identity.username_signature,
                  this.bulletinSecretService.identity.username_signature,
                  this.bulletinSecretService.key.toWIF() + 'calendar'
                )

                return this.transactionService.generateTransaction({
                    relationship: {
                        event: {
                            sender: this.item.sender,
                            subject: this.item.subject,
                            body: this.item.body,
                            thread: this.item.thread,
                            message_type: this.item.message_type,
                            event_datetime: this.item.event_datetime
                        }
                    },
                    rid: rid
                });
            }).then((txn) => {
                return this.transactionService.sendTransaction();
            }).then(() => {
                this.navCtrl.pop()
            })
            .catch((err) => {
               console.log(err);
               let alert = this.alertCtrl.create();
               alert.setTitle('Message error');
               alert.setSubTitle(err);
               alert.addButton('Ok');
               alert.present();
            });
           }
    });
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
