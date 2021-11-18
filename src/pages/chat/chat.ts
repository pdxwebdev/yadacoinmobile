import { Component, ViewChild } from '@angular/core';
import { Events, NavController, NavParams } from 'ionic-angular';
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
import { WebSocketService } from '../../app/websocket.service';

declare var X25519;
declare var foobar;
declare var Base64;

@Component({
    selector: 'page-chat',
    templateUrl: 'chat.html',
    queries: {
      content: new ViewChild('content'),
      input: new ViewChild('input')
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
    input: any;
    transaction: any;
    identity: any;
    page: any;
    label: any;
    busy: any;
    filepath: any;
    filedata: any;
    skylink: any;
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
        public toastCtrl: ToastController,
        public events: Events,
        public websocketService: WebSocketService
    ) {
        this.identity = this.navParams.get('identity');
        this.label = this.identity.username;
        const identity = JSON.parse(JSON.stringify(this.graphService.toIdentity(this.identity))); //deep copy
        if (this.graphService.isGroup(identity)) {
          identity.collection = this.settingsService.collections.GROUP_CHAT;
        } else {
          identity.collection = this.settingsService.collections.CHAT;
        }
        const rids = this.graphService.generateRids(identity);
        this.rid = rids.rid;
        this.requested_rid = rids.requested_rid;
        this.requester_rid = rids.requester_rid;
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.refresh(null, true);
        this.events.subscribe('newchat', () => {
          this.navCtrl.getActive().component.name === 'ChatPage' && this.refresh(null)
        })
    }

    parseChats() {
        const group = this.graphService.isGroup(this.identity)
        const rid = group ? this.requested_rid : this.rid
        if(this.graphService.graph.messages[rid]) {
            this.chats = this.graphService.graph.messages[rid];
            this.graphService.sortInt(this.chats, 'time', true)
            for(var i=0; i < this.chats.length; i++) {
                if (!group) {
                  this.chats[i].relationship.identity = (
                    this.chats[i].public_key === this.bulletinSecretService.identity.public_key ? 
                    this.bulletinSecretService.identity : 
                    this.graphService.getIdentityFromTxn(
                      this.graphService.friends_indexed[rid],
                      this.settingsService.collections.CONTACT
                    )
                  )
                }
                let datetime = new Date(parseInt(this.chats[i].time) * 1000);
                this.chats[i].time = datetime.toLocaleDateString() + ' ' + datetime.toLocaleTimeString();
            }
        } else {
            this.chats = [];
        }
    }

    refresh(refresher, showLoading = true) {
        if (showLoading) {
            this.loading = true;
        }
        let collection;
        if (this.graphService.isGroup(this.identity)) {
          collection = this.settingsService.collections.GROUP_CHAT;
        } else {
          collection = this.settingsService.collections.CHAT;
        }
        return this.graphService.getMessages([this.rid, this.requested_rid], collection)
        .then(() => {
            this.loading = false;
            if(refresher) refresher.complete();
            return this.parseChats();
        })
        .then(() => {
            setTimeout(() => {
              this.content && this.content.scrollToBottom(400)
              this.input.setFocus()
            }, 500);
        });
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
              $event.target.value = null;
          })
        };
        reader.onerror = () => {};
    }

    viewProfile(item) {
        let identity = item.relationship.identity;
        const rid = this.graphService.generateRid(
          identity.username_signature,
          this.bulletinSecretService.identity.username_signature
        )
        const cached_identity = this.graphService.friends_indexed[rid];
        this.navCtrl.push(ProfilePage, {
            identity: this.graphService.getIdentityFromTxn(cached_identity) || identity
        })
    }

    send() {
        if (this.busy || !this.chatText) return;
        this.busy = true
        return this.sendMessagePromise()
    }

    sendMessagePromise() {
      return this.walletService.get()
      .then(() => {
          if (this.graphService.isGroup(this.identity)) {
            const group = this.graphService.getIdentityFromTxn(
              this.graphService.groups_indexed[this.requested_rid],
              this.settingsService.collections.GROUP
            );
            const info = {
                relationship: {
                    identity: this.bulletinSecretService.identity,
                    skylink: this.skylink,
                    filename: this.filepath
                },
                rid: this.rid,
                requester_rid: this.requester_rid,
                requested_rid: this.requested_rid,
                group: true,
                shared_secret: group.username_signature
            }
            info.relationship[this.settingsService.collections.GROUP_CHAT] = this.chatText
            return this.transactionService.generateTransaction(info);
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
                const info = {
                    dh_public_key: dh_public_key,
                    dh_private_key: dh_private_key,
                    relationship: {
                      skylink: this.skylink,
                      filename: this.filepath
                    },
                    shared_secret: shared_secret,
                    rid: this.rid,
                    requester_rid: this.requester_rid,
                    requested_rid: this.requested_rid,
                }
                info.relationship[this.settingsService.collections.CHAT] = this.chatText;
                return this.transactionService.generateTransaction(info);
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
          this.busy = false;
          this.chatText = '';
          this.skylink = null;
          this.filedata = null;
          this.filepath = null;
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