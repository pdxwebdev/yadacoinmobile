import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { AlertController, LoadingController, ToastController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { SettingsService } from '../../app/settings.service';
import { ListPage } from '../list/list';
import { ProfilePage } from '../profile/profile';
import { Http } from '@angular/http';

declare var X25519;
declare var foobar;
declare var Base64;

@Component({
    selector: 'page-chat',
    templateUrl: 'chat.html',
    queries: {
      content: new ViewChild('content')
    }
})
export class ChatPage {
    chatText: any;
    bulletinSecret: any;
    blockchainAddress: any;
    chats: any;
    rid: any;
    requester_rid: any;
    requested_rid: any;
    public_key: any;
    loading: any;
    loadingModal: any;
    content: any;
    transaction: any;
    identity: any;
    page: any;
    label: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        public transactionService: TransactionService,
        public alertCtrl: AlertController,
        public graphService: GraphService,
        public loadingCtrl: LoadingController,
        public bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
        public ahttp: Http,
        public toastCtrl: ToastController
    ) {
        this.identity = this.navParams.get('identity');
        this.page = this.navParams.get('pageTitle');
        this.label = this.page.label;
        const rids = this.graphService.generateRids(this.identity);
        this.rid = rids.rid;
        this.requested_rid = rids.requested_rid;
        this.requester_rid = rids.requester_rid;
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.refresh(null, true);
    }

    parseChats() {
        const group = this.graphService.isGroup(this.identity)
        const rid = group ? this.requested_rid : this.rid
        if(this.graphService.graph.messages[rid]) {
            this.chats = this.graphService.graph.messages[rid];
            for(var i=0; i < this.chats.length; i++) {
                if (!group) {
                  this.chats[i].relationship.identity = this.chats[i].public_key === this.bulletinSecretService.identity.public_key ? this.bulletinSecretService.identity : this.graphService.friends_indexed[rid].relationship.identity
                }
                this.chats[i].time = new Date(parseInt(this.chats[i].time) * 1000).toISOString().slice(0, 19).replace('T', ' ');
            }
        } else {
            this.chats = [];
        }
    }

    refresh(refresher, showLoading = true) {
        if (showLoading) {
            this.loading = true;
        }
        this.graphService.getGroups(null, null, true)
        .then(() => {
          return this.graphService.getGroups(null, 'file', true)
        })
        .then(() => {
          return this.graphService.getMessages([this.rid, this.requested_rid])
        })
        .then(() => {
            this.loading = false;
            if(refresher) refresher.complete();
            return this.parseChats();
        })
        .then(() => {
            setTimeout(() => this.content.scrollToBottom(1000), 500);
        });
    }

    viewProfile(item) {
        return this.graphService.getFriends()
        .then(() => {
            const rid = this.graphService.generateRid(
              item.relationship.identity.username_signature,
              this.bulletinSecretService.identity.username_signature
            )
            const identity = this.graphService.friends_indexed[rid];
            this.navCtrl.push(ProfilePage, {
                identity: identity ? identity.relationship : item.relationship.identity
            })
        })
    }

    send() {
        let alert = this.alertCtrl.create();
        alert.setTitle('Approve transaction');
        alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
        alert.addButton('Cancel');
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                this.walletService.get()
                .then(() => {
                    if (this.graphService.isGroup(this.identity)) {
                      return this.transactionService.generateTransaction({
                          relationship: {
                              chatText: this.chatText,
                              identity: this.bulletinSecretService.identity
                          },
                          rid: this.rid,
                          requester_rid: this.requester_rid,
                          requested_rid: this.requested_rid,
                          group: true,
                          group_username_signature: this.graphService.groups_indexed[this.requested_rid].relationship.username_signature
                      });
                    } else {
                      var dh_public_key = this.graphService.keys[this.rid].dh_public_keys[0];
                      var dh_private_key = this.graphService.keys[this.rid].dh_private_keys[0];

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
                                  chatText: this.chatText
                              },
                              shared_secret: shared_secret,
                              rid: this.rid,
                              requester_rid: this.requester_rid,
                              requested_rid: this.requested_rid,
                          });
                      } else {
                          return new Promise((resolve, reject) => {
                              let alert = this.alertCtrl.create();
                              alert.setTitle('Friendship not yet processed');
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
                    this.chatText = '';
                    this.refresh(null);
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

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }

    toHex(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }
}