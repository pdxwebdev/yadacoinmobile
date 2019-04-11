import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { AlertController, LoadingController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { SettingsService } from '../../app/settings.service';
import { ListPage } from '../list/list';
import { Http, RequestOptions } from '@angular/http';

declare var X25519;

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
        public ahttp: Http
    ) {
        this.rid = navParams.data.item.transaction.rid;
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
                            rid: this.rid
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
                }).then((hash) => {
                    return new Promise((resolve, reject) => {
                        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sign-raw-transaction', {
                            hash: hash, 
                            bulletin_secret: this.bulletinSecretService.bulletin_secret,
                            input: this.transactionService.transaction.inputs[0].id,
                            id: this.transactionService.transaction.id,
                            txn: this.transactionService.transaction
                        })
                        .subscribe((res) => {
                            //this.loadingModal2.dismiss();
                            try {
                                let data = res.json();
                                this.transactionService.transaction.signatures = [data.signature]
                                resolve();
                            } catch(err) {
                                reject(err);
                                this.loadingModal.dismiss().catch(() => {});
                            }
                        },
                        (err) => {
                            reject(err);
                        });
                    });
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