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
declare var X25519;

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
    username_signature: any;
    username: any;
    requester_rid: any;
    requested_rid: any;
    their_address: any;
    extraInfo: any;
    files: any;
    item: any;
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
        this.item = navParams.data.item.transaction;
        this.rid = navParams.data.item.transaction.rid;
        this.requester_rid = navParams.data.item.transaction.requester_rid;
        this.requested_rid = navParams.data.item.transaction.requested_rid;
        this.their_address = navParams.data.item.transaction.relationship.their_address;
        this.public_key = navParams.data.item.transaction.relationship.identity.public_key;
        this.username_signature = navParams.data.item.transaction.relationship.identity.username_signature;
        this.username = navParams.data.item.transaction.relationship.identity.username;
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
        alert.setSubTitle('Select a friend to invite.');
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                this.walletService.get()
                .then(() => {
                    var dh_public_key = this.graphService.keys[data.rid].dh_public_keys[0];
                    var dh_private_key = this.graphService.keys[data.rid].dh_private_keys[0];

                    if(dh_public_key && dh_private_key) {
                        var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
                            return parseInt(h, 16)
                        }));
                        var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
                            return parseInt(h, 16)
                        }));
                        var shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
                    }
                    var myAddress = this.bulletinSecretService.key.getAddress();
                    var to = false;
                    for (var h=0; h < data.outputs.length; h++) {
                        if (data.outputs[h].to != myAddress) {
                            to = data.outputs[h].to;
                        }
                    }
                    return this.transactionService.generateTransaction({
                        relationship: {
                            chatText: Base64.encode(JSON.stringify({
                                public_key: this.item.public_key,
                                username_signature: this.item.relationship.identity.username_signature,
                                username: this.item.relationship.identity.username,
                                group: true,
                                requested_rid: this.requested_rid
                            }))
                        },
                        rid: data.rid,
                        requester_rid: data.requester_rid,
                        requested_rid: data.requested_rid,
                        shared_secret: shared_secret,
                        to: to
                    });
                }).then((txn) => {
                    return this.transactionService.sendTransaction();
                }).then(() => {
                    const toast = this.toastCtrl.create({
                        message: "Group invite sent!",
                        duration: 2000,
                    });
                    toast.present();
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
        for (var i=0; i < this.graphService.graph.friends.length; i++) {
            var friend = this.graphService.graph.friends[i];
            alert.addInput({
                name: 'username',
                type: 'radio',
                label: friend.relationship.identity.username,
                value: friend,
                checked: false
            });
        }
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
        this.graphService.getGroupMessages(this.username_signature, this.requested_rid, this.rid)
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
                username_signature: this.username_signature,
                rid: this.rid,
                requester_rid: this.requester_rid,
                requested_rid: this.requested_rid
            }
        });
        modal.present();
    }

    import(relationship) {
        return this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sia-share-file?origin=' + encodeURIComponent(window.location.origin), relationship)
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
        var username_signatures = [this.bulletinSecretService.username_signature, item.relationship.identity.username_signature].sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        if (username_signatures[0] === username_signatures[1]) return;
        var rid = foobar.bitcoin.crypto.sha256(username_signatures[0] + username_signatures[1]).toString('hex');
        for (var i=0; i < this.graphService.graph.friends.length; i++) {
            var friend = this.graphService.graph.friends[i];
            if (friend.rid === rid) {
                item = friend;
            }
        }
        this.navCtrl.push(ProfilePage, {
            item: item
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
                    return this.transactionService.generateTransaction({
                        relationship: {
                            groupChatText: this.groupChatText,
                            username_signature: this.bulletinSecretService.generate_username_signature(),
                            username: this.bulletinSecretService.username
                        },
                        username_signature: this.username_signature,
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
                            username_signature: this.bulletinSecretService.username_signature,
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