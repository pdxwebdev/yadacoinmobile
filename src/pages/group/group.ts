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
declare var Base64;

@Component({
    selector: 'page-group',
    templateUrl: 'group.html',
    queries: {
      content: new ViewChild('content')
    }
})
export class GroupPage {
    groupChatText: any;
    bulletinSecret: any;
    blockchainAddress: any;
    chats: any;
    rid: any;
    public_key: any;
    loading: any;
    loadingModal: any;
    content: any;
    wallet_mode: any;
    their_bulletin_secret: any;
    requester_rid: any;
    requested_rid: any;
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
        this.wallet_mode = true;
        this.rid = navParams.data.item.transaction.rid;
        this.requester_rid = navParams.data.item.transaction.requester_rid;
        this.requested_rid = navParams.data.item.transaction.requested_rid;
        this.their_bulletin_secret = navParams.data.item.transaction.relationship.their_bulletin_secret;
        var key = 'last_message_height-' + navParams.data.item.transaction.rid;
        if(navParams.data.item.transaction.height) this.storage.set(key, navParams.data.item.transaction.time);
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
        this.refresh(null, true);
    }

    showInvite() {
        let alert = this.alertCtrl.create();
        alert.setTitle('Invite');
        alert.setSubTitle('copy and paste this entire string of characters');
        alert.addButton('Done');
        alert.addInput({
            type: 'text',
            value: Base64.encode(JSON.stringify({
                their_bulletin_secret: this.their_bulletin_secret,
                requested_rid: this.requested_rid || this.rid
            }))            
        })
        alert.present();
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
        this.graphService.getGroupMessages(this.their_bulletin_secret, this.rid)
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
                    return this.transactionService.generateTransaction({
                        relationship: {
                            groupChatText: this.groupChatText 
                        },
                        their_bulletin_secret: this.their_bulletin_secret,
                        rid: this.rid,
                        requester_rid: this.requester_rid,
                        requested_rid: this.requested_rid
                    });
                }).then((hash) => {
                    return new Promise((resolve, reject) => {
                        if (this.wallet_mode) {
                            return resolve();
                        }
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
                                return resolve();
                            } catch(err) {
                                return reject(err);
                                //this.loadingModal.dismiss().catch(() => {});
                            }
                        },
                        (err) => {
                            return reject(err);
                        });
                    });
                }).then((txn) => {
                    return this.transactionService.sendTransaction();
                }).then(() => {
                    this.groupChatText = '';
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