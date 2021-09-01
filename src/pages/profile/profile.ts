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
import { ComposePage } from '../mail/compose';

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
    group: any;
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
        this.group = this.navParams.get('group');
        this.refresh(null);
    }

    refresh(refresher) {
        this.isFriend = null;
        let promise;
        let collection;
        if(this.group) {
          promise = this.graphService.getGroups();
          collection = this.graphService.graph.groups;
        } else {
          promise = this.graphService.getFriends();
          collection = this.graphService.graph.friends;
        }
        promise
        .then(() => {
            for (var i=0; i < collection.length; i++) {
                var friend = collection[i];
                if (friend.rid === this.item.rid || friend.rid === this.item.requested_rid) {
                    this.isFriend = true;
                }
            }
            this.isFriend = this.isFriend || false;
        })
    }

    invite() {
        this.graphService.getFriends()
        .then(() => {
            let alert = this.alertCtrl.create();
            alert.setTitle('Invite');
            alert.setSubTitle('Select a friend to invite.');
            alert.addButton('Confirm');
            alert.addInput({
                name: 'radio1',
                type: 'radio',
                label: 'Radio 1',
                value: 'value1',
                checked: true
            });
            this.graphService.graph.friends.map((friend) => {
                return friend;
            });
            alert.present();
        });
    }

    addFriend() {
        let info: any;
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                return this.graphService.addFriend(data)
                .then((txn) => {
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Contact Request Sent');
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
        return this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/ns?requested_rid=' + this.item.rid + '&username_signature=' + this.bulletinSecretService.username_signature)
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
                    their_username_signature: invite.their_username_signature,
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
                        my_username_signature: this.bulletinSecretService.generate_username_signature(),
                        my_username: this.bulletinSecretService.username,
                        their_address: info.their_address,
                        their_public_key: info.their_public_key,
                        their_username_signature: info.their_username_signature,
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
              transaction: this.item,
              group: true
            }
        });
    }

    compose() {
        this.navCtrl.push(ComposePage, {
          item: {
            recipient: {
              username: this.item.relationship.my_username || this.item.relationship.username,
              username_signature: this.item.relationship.my_username_signature || this.item.relationship.username_signature,
              public_key: this.item.relationship.my_public_key || this.item.relationship.public_key,
              requester_rid: this.item.requester_rid,
              requested_rid: this.item.requested_rid,
            }
          },
          group: true
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