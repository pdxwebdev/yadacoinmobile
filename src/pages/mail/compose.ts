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
import { Http } from '@angular/http';
import { SettingsService } from '../../app/settings.service';


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
  thread: any;
  prevBody: any;
  collection: any;
  message_type: any;
  event_datetime: any;
  @ViewChild('searchbar')
  searchbar: AutoCompleteComponent;
  group: any;
  filepath: any;
  filedata: any;
  skylink: any;
  busy: any;
  constructor(
    public navCtrl: NavController,
    navParams: NavParams,
    public completeTestService: CompleteTestService,
    public graphService: GraphService,
    public transactionService: TransactionService,
    public walletService: WalletService,
    public alertCtrl: AlertController,
    public bulletinSecretService: BulletinSecretService,
    public ahttp: Http,
    public settingsService: SettingsService
  ) {
    this.item = navParams.data.item;
    this.mode = navParams.data.mode || 'new';
    this.thread = navParams.data.thread;
    this.recipient = '';
    this.prevBody = '';
  }

  ionViewDidEnter() {
    if (this.mode === 'reply') {
      this.recipient = this.item.sender
      this.subject = this.item.subject
      this.prevBody = this.item.body
      this.collection = this.item.collection
    }
    else if (this.mode === 'replyToAll') {
      this.recipient = this.item.group
      this.subject = this.item.subject
      this.prevBody = this.item.body
      this.collection = this.item.collection
    }
    else if (this.mode === 'forward') {
      this.subject = this.item.subject
      this.body = this.item.body
      this.collection = this.item.collection
    } else if(this.item && this.item.recipient) {
      this.recipient = this.item.recipient
    }
    if (this.recipient) {
      this.collection = this.graphService.isGroup(this.recipient) ? this.settingsService.collections.GROUP_MAIL : this.settingsService.collections.MAIL;
    }
    if (this.item && this.item.message_type) {
      this.message_type = this.item.message_type;
    } else {
      if (this.collection === this.settingsService.collections.MAIL || this.collection === this.settingsService.collections.GROUP_MAIL) {
        this.message_type = 'mail'
      } else if (this.collection === this.settingsService.collections.CALENDAR || this.collection === this.settingsService.collections.GROUP_CALENDAR) {
        this.message_type = 'calendar'
      }
      this.message_type = this.message_type || 'mail'
    }
  }

  myForm = new FormGroup({
      searchTerm: new FormControl('', [Validators.required])
  })

  segmentChanged(e) {
    this.message_type = e.value;
    if (this.message_type === 'mail') {
      this.collection = this.graphService.isGroup(this.recipient) ? this.settingsService.collections.GROUP_MAIL : this.settingsService.collections.MAIL;
    } else if (this.message_type === 'calendar') {
      this.collection = this.graphService.isGroup(this.recipient) ? this.settingsService.collections.GROUP_CALENDAR : this.settingsService.collections.CALENDAR;
    }
  }

  changeListener($event) {
      this.busy = true;
      this.filepath = $event.target.files[0].name;
      const reader = new FileReader();
      reader.readAsDataURL($event.target.files[0]);
      reader.onload = () => {
        this.filedata = reader.result.toString().substr(22)
        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sia-upload?filename=' + encodeURIComponent(this.filepath), {file: this.filedata})
        .subscribe((res) => {
            const data = res.json();
            if (!data.skylink) return;
            this.skylink = data.skylink;
            this.busy = false
        })
      };
      reader.onerror = () => {};
  }

  submit() {
    if (this.message_type === 'mail') {
      this.collection = this.graphService.isGroup(this.recipient) ? this.settingsService.collections.GROUP_MAIL : this.settingsService.collections.MAIL;
    } else if (this.message_type === 'calendar') {
      this.collection = this.graphService.isGroup(this.recipient) ? this.settingsService.collections.GROUP_CALENDAR : this.settingsService.collections.CALENDAR;
    }
    let alert = this.alertCtrl.create();
    alert.setTitle('Send mail confirmation');
    alert.setSubTitle('Are you sure?');
    alert.addButton('Cancel');
    alert.addButton({
        text: 'Confirm',
        handler: (data: any) => {
            this.walletService.get()
            .then(() => {
                const rid = this.graphService.generateRid(
                  this.bulletinSecretService.identity.username_signature,
                  this.recipient.username_signature
                )

                if (this.graphService.isGroup(this.recipient)) {
                    const requester_rid = this.graphService.generateRid(
                      this.bulletinSecretService.identity.username_signature,
                      this.bulletinSecretService.identity.username_signature,
                      this.collection
                    )
                    const requested_rid = this.graphService.generateRid(
                      this.recipient.username_signature,
                      this.recipient.username_signature,
                      this.collection
                    )
                    const info = {
                        relationship: {},
                        rid: rid,
                        requester_rid: requester_rid,
                        requested_rid: requested_rid,
                        group: true,
                        shared_secret: this.recipient.username_signature
                    }
                    info.relationship[this.collection] = {
                        sender: this.bulletinSecretService.identity,
                        subject: this.subject,
                        body: this.body,
                        thread: this.thread,
                        event_datetime: this.event_datetime,
                        skylink: this.skylink,
                        filename: this.filepath
                    }
                    return this.transactionService.generateTransaction(info);
                } else {
                  const requester_rid = this.graphService.generateRid(
                    this.bulletinSecretService.identity.username_signature,
                    this.bulletinSecretService.identity.username_signature,
                    this.collection
                  )
                  const requested_rid = this.graphService.generateRid(
                    this.recipient.username_signature,
                    this.recipient.username_signature,
                    this.collection
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
                      const info = {
                          dh_public_key: dh_public_key,
                          dh_private_key: dh_private_key,
                          relationship: {},
                          shared_secret: shared_secret,
                          rid: rid,
                          requester_rid: requester_rid,
                          requested_rid: requested_rid
                      }
                      info.relationship[this.collection] = {
                          subject: this.subject,
                          body: this.body,
                          thread: this.thread,
                          event_datetime: this.event_datetime,
                          skylink: this.skylink,
                          filename: this.filepath
                      }
                      return this.transactionService.generateTransaction(info);
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
