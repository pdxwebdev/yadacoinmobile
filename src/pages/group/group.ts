import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, ModalController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { AlertController, LoadingController, ToastController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { SettingsService } from '../../app/settings.service';
import { ListPage } from '../list/list';
import { ProfilePage } from '../profile/profile';
import { SiaFiles } from '../siafiles/siafiles';
import { Http } from '@angular/http';

declare var Base64;
declare var foobar;

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
    their_public_key: any;
    loading: any;
    loadingModal: any;
    content: any;
    wallet_mode: any;
    their_bulletin_secret: any;
    their_username: any;
    requester_rid: any;
    requested_rid: any;
    their_address: any;
    extraInfo: any;
    files: any;
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
        public modalCtrl: ModalController,
        public toastCtrl: ToastController
    ) {
        this.extraInfo = {};
        this.wallet_mode = true;
        this.rid = navParams.data.item.transaction.rid;
        this.requester_rid = navParams.data.item.transaction.requester_rid;
        this.requested_rid = navParams.data.item.transaction.requested_rid;
        this.their_address = navParams.data.item.transaction.relationship.their_address;
        this.their_public_key = navParams.data.item.transaction.relationship.their_public_key;
        this.their_bulletin_secret = navParams.data.item.transaction.relationship.their_bulletin_secret;
        this.their_username = navParams.data.item.transaction.relationship.their_username;
        var key = 'last_message_height-' + navParams.data.item.transaction.rid;
        if(navParams.data.item.transaction.height) this.storage.set(key, navParams.data.item.transaction.time);
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
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
                their_public_key: this.their_public_key,
                their_bulletin_secret: this.their_bulletin_secret,
                requested_rid: this.requested_rid || this.rid,
                their_username: this.their_username,
                their_address: this.their_address
            }))            
        })
        alert.present();
    }

    parseChats() {
        let rid_to_use = this.requested_rid || this.rid;
        if(this.graphService.graph.messages[rid_to_use]) {
            this.chats = this.graphService.graph.messages[rid_to_use];
            for(var i=0; i < this.chats.length; i++) {
                this.chats[i].time = new Date(parseInt(this.chats[i].time)*1000).toISOString().slice(0, 19).replace('T', ' ');
            }
        } else {
            this.chats = [];
        }
    }

    refresh(refresher, showLoading = true) {
        if (showLoading) {
            this.loading = true;
        }
        this.graphService.getGroupMessages(this.their_bulletin_secret, this.requested_rid, this.rid)
        .then(() => {
            this.loading = false;
            if(refresher) refresher.complete();
            return this.parseChats();
        })
        .then(() => {
            setTimeout(() => this.content.scrollToBottom(1000), 500);
        })
        .then(() => {
            return this.getSiaFiles();
        })
        .catch((err) => {
            console.log(err);
        });
    }

    presentModal() {
        
        let modal = this.modalCtrl.create(SiaFiles, {
            mode: 'modal',
            logicalParent: this,
            group: {
                their_bulletin_secret: this.their_bulletin_secret,
                rid: this.rid,
                requester_rid: this.requester_rid,
                requested_rid: this.requested_rid
            }
        });
        modal.present();
    }

    import(relationship) {
        return this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sia-share-file?origin=' + encodeURIComponent(window.location.href), relationship)
        .subscribe((res) => {
            var files = res.json();
        })
    }

    getSiaFiles() {
        return this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/sia-files')
        .subscribe((res) => {
            var files = res.json();
        })
    }

    toggleExtraInfo(pending) {
        const toast = this.toastCtrl.create({
            message: pending ? "Not yet saved on the blockchain" : "Saved on the blockchain",
            duration: 2000,
            cssClass: pending ? 'redToast' : 'greenToast',
            position: 'top'
        });
        toast.present();
    }

    viewProfile(item) {
        var bulletin_secrets = [this.bulletinSecretService.bulletin_secret, item.relationship.my_bulletin_secret].sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        if (bulletin_secrets[0] === bulletin_secrets[1]) return;
        return this.graphService.getFriends()
        .then(() => {
            var rid = foobar.bitcoin.crypto.sha256(bulletin_secrets[0] + bulletin_secrets[1]).toString('hex');
            for (var i=0; i < this.graphService.graph.friends.length; i++) {
                var friend = this.graphService.graph.friends[i];
                if (friend.rid === rid) {
                    item = friend;
                }
            }
            this.navCtrl.push(ProfilePage, {
                item: item
            })
        })
    }

    send() {
        let alert = this.alertCtrl.create();
        alert.setTitle('Approve transaction');
        alert.setSubTitle('You are about to spend 0.00 coins ( 0.00 fee). Everything is free for now.');
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
                            groupChatText: this.groupChatText,
                            my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                            my_username: this.bulletinSecretService.username
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

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }
}