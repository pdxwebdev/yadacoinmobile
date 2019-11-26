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
        this.rid = navParams.data.item.transaction.rid;
        this.requester_rid = navParams.data.item.transaction.requester_rid || '';
        this.requested_rid = navParams.data.item.transaction.requested_rid || '';
        var key = 'last_message_height-' + navParams.data.item.transaction.rid;
        if(navParams.data.item.transaction.height) this.storage.set(key, navParams.data.item.transaction.time);
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
        this.refresh(null, true);
    }

    parseChats() {
        if(this.graphService.graph.messages[this.rid]) {
            this.chats = this.graphService.graph.messages[this.rid];
            for(var i=0; i < this.chats.length; i++) {
                this.chats[i].time = new Date(parseInt(this.chats[i].time)).toISOString().slice(0, 19).replace('T', ' ');
            }
        } else {
            this.chats = [];
        }
    }

    refresh(refresher, showLoading = true) {
        if (showLoading) {
            this.loading = true;
        }
        this.graphService.getMessages(this.rid)
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
            for (var i=0; i < this.graphService.graph.friends.length; i++) {
                var friend = this.graphService.graph.friends[i];
                if (friend.rid === item.rid) {
                    item = friend;
                }
            }
            this.navCtrl.push(ProfilePage, {
                item: item
            })
        })
    }

    joinGroup(item) {
        return new Promise((resolve, reject) => {
            var invite = item.relationship.chatText;
            var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
            var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
            var dh_private_key = this.toHex(raw_dh_private_key);
            var dh_public_key = this.toHex(raw_dh_public_key);
            resolve({
                their_address: invite.their_address,
                their_public_key: invite.their_public_key,
                their_bulletin_secret: invite.their_bulletin_secret,
                their_username: invite.their_username,
                dh_public_key: dh_public_key,
                dh_private_key: dh_private_key,
                requested_rid: invite.requested_rid,
                requester_rid: this.graphService.graph.rid
            })
        })
        .then((info: any) => {
            return this.transactionService.generateTransaction({
                relationship: {
                    dh_private_key: info.dh_private_key,
                    my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                    my_username: this.bulletinSecretService.username,
                    their_address: info.their_address,
                    their_public_key: info.their_public_key,
                    their_bulletin_secret: info.their_bulletin_secret,
                    their_username: info.their_username,
                    group: true
                },
                requester_rid: info.requester_rid,
                requested_rid: info.requested_rid,
                dh_public_key: info.dh_public_key,
                to: info.their_address
            })
        
        }).then((txn) => {
            return this.transactionService.sendTransaction();
        })
        .then((hash) => {
            if (this.settingsService.remoteSettings['walletUrl']) {
                return this.graphService.getInfo();
            }
        })
        .then(() => {
            const toast = this.toastCtrl.create({
                message: 'Group joined!',
                duration: 2000
            });
            toast.present();
            return this.refresh(null)
        })
        .catch((err) => {
        });
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
                    return this.graphService.getFriends();
                })
                .then(() => {
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
                            return reject();    
                        });                
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