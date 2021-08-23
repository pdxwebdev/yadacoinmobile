import { Component, ViewChild } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { CompleteTestService } from '../../app/autocomplete.provider';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AutoCompleteComponent } from 'ionic2-auto-complete';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { WalletService } from '../../app/wallet.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { MailPage } from './mail';


declare var X25519


@Component({
  selector: 'compose-profile',
  templateUrl: 'compose.html'
})
export class ComposePage {
  item: any;
  mode: any;
  recipient: any;
  subject: any;
  body: any;
  @ViewChild('searchbar')
  searchbar: AutoCompleteComponent;
  constructor(
    public navCtrl: NavController,
    navParams: NavParams,
    public completeTestService: CompleteTestService,
    public graphService: GraphService,
    public transactionService: TransactionService,
    public walletService: WalletService,
    public alertCtrl: AlertController,
    public bulletinSecretService: BulletinSecretService
  ) {
    this.item = navParams.data.item;
    this.mode = navParams.data.mode || 'new';
    this.recipient = '';
    if (this.mode === 'reply') {
      this.recipient = this.item.sender
      this.subject = this.item.subject
    }
    else if (this.mode === 'forward') {
      this.subject = this.item.subject
      this.body = this.item.body
    }
  }

  myForm = new FormGroup({
      searchTerm: new FormControl('', [Validators.required])
  })

  submit() {
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
                  this.recipient.username_signature
                )
                const requester_rid = this.graphService.generateRid(
                  this.bulletinSecretService.identity.username_signature,
                  this.bulletinSecretService.identity.server_username_signature,
                  'mail'
                )
                const requested_rid = this.graphService.generateRid(
                  this.recipient.username_signature,
                  this.bulletinSecretService.identity.server_username_signature,
                  'mail'
                )
                var dh_public_key = this.graphService.keys[rid].dh_public_keys[0];
                var dh_private_key = this.graphService.keys[rid].dh_private_keys[0];

                if(dh_public_key && dh_private_key) {
                    var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
                        return parseInt(h, 16)
                    }));
                    var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
                        return parseInt(h, 16)
                    }));
                    var shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
                    // camera permission was granted
                    return this.transactionService.generateTransaction({
                        dh_public_key: dh_public_key,
                        dh_private_key: dh_private_key,
                        relationship: {
                            envelope: {
                                subject: this.subject,
                                body: this.body
                            }
                        },
                        shared_secret: shared_secret,
                        rid: rid,
                        requester_rid: requester_rid,
                        requested_rid: requested_rid
                    });
                } else {
                    return new Promise((resolve, reject) => {
                        let alert = this.alertCtrl.create();
                        alert.setTitle('Contact not yet processed');
                        alert.setSubTitle('Please wait a few minutes and try again');
                        alert.addButton('Ok');
                        alert.present();
                        return reject('failed to create friend request');    
                    });                
                }
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

  toHex(byteArray) {
    var callback = function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }
    return Array.from(byteArray, callback).join('')
  }
}
