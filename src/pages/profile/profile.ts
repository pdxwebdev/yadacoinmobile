import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { ListPage } from '../list/list';
import { ChatPage } from '../chat/chat';
import { GroupPage } from '../group/group';
import { Http } from '@angular/http';
import { AlertController, LoadingController, ToastController } from 'ionic-angular';
import { SettingsService } from '../../app/settings.service';
import { Events } from 'ionic-angular';

declare var Base64;
declare var forge;
declare var X25519;
declare var foobar;

@Component({
    selector: 'page-profile',
    templateUrl: 'profile.html'
})
export class ProfilePage {
    baseUrl: any;
    loadingModal: any;
    prev_name: any;
    item: any;
    isFriend: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http,
        public loadingCtrl: LoadingController,
        public settingsService: SettingsService,
        public alertCtrl: AlertController,
        public transactionService: TransactionService,
        public toastCtrl: ToastController,
        public events: Events
    ) {
        this.item = this.navParams.get('item');
        this.refresh(null);
    }

    refresh(refresher) {
        this.isFriend = false;
        this.graphService.getFriends()
        .then(() => {
            for (var i=0; i < this.graphService.graph.friends.length; i++) {
                var friend = this.graphService.graph.friends[i];
                if (friend.rid === this.item.rid || friend.rid === this.item.requested_rid) {
                    this.isFriend = true;
                }
            }
        })
    }

    invite() {
        let alert = this.alertCtrl.create();
        alert.setTitle('Invite');
        alert.setSubTitle('copy and paste this entire string of characters');
        alert.addButton('Done');
        alert.addInput({
            type: 'text',
            value: Base64.encode(JSON.stringify({
                their_public_key: this.item.public_key,
                their_bulletin_secret: this.item.relationship.their_bulletin_secret,
                requested_rid: this.item.requested_rid || this.item.rid,
                their_username: this.item.relationship.their_username,
                their_address: this.item.relationship.their_address
            }))            
        })
        alert.present();
    }

    addFriend() {
        let info: any;
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                // camera permission was granted
                var requester_rid = this.graphService.graph.rid;
                var requested_rid = this.item.rid;
                if (requester_rid && requested_rid) {
                    // get rid from bulletin secrets
                } else {
                    requester_rid = '';
                    requested_rid = '';
                }
                //////////////////////////////////////////////////////////////////////////
                // create and send transaction to create the relationship on the blockchain
                //////////////////////////////////////////////////////////////////////////
                var not_this_address = foobar.bitcoin.ECPair.fromPublicKeyBuffer(foobar.Buffer.Buffer.from(this.item.public_key, 'hex')).getAddress();
                for (var h=0; h < this.item.outputs.length; h++) {
                    if (this.item.outputs[h].to != not_this_address) {
                        var address = this.item.outputs[h].to;
                    }
                }
                this.walletService.get().then(() => {
                    var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                    var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                    var dh_private_key = this.toHex(raw_dh_private_key);
                    var dh_public_key = this.toHex(raw_dh_public_key);
                    return this.transactionService.generateTransaction({
                        relationship: {
                            dh_private_key: dh_private_key,
                            their_bulletin_secret: this.item.relationship.their_bulletin_secret,
                            their_username: this.item.relationship.their_username,
                            my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                            my_username: this.bulletinSecretService.username
                        },
                        dh_public_key: dh_public_key,
                        requested_rid: requested_rid,
                        requester_rid: requester_rid,
                        to: this.item.relationship.group === true ? this.item.relationship.their_address : address
                    });
                }).then((hash) => {
                    return this.transactionService.sendTransaction();
                }).then((txn) => {
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Friend Request Sent');
                    alert.setSubTitle('Your Friend Request has been sent successfully.');
                    alert.addButton('Ok');
                    alert.present();
                }).catch((err) => {
                    console.log(err);
                });

            }
        });
        let alert = this.alertCtrl.create({
            buttons: buttons
        });
        alert.setTitle('Add friend');
        alert.setSubTitle('Do you want to add ' + this.item.relationship.their_username + '?');
        alert.present();
    }

    joinGroup() {
        return this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/ns?requested_rid=' + this.item.rid + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
        .subscribe((res) => {
            return new Promise((resolve, reject) => {
                let invite = res.json();
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
                return this.refresh(null)
            })
            .then(() => {
                this.events.publish('pages-settings');
            })
            .catch((err) => {
                this.events.publish('pages');
            });
        });
    }

    message() {
        var page = this.item.relationship.group === true ? GroupPage : ChatPage;
        this.navCtrl.push(page, {
          item: {
              transaction: this.item
            }
        });
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