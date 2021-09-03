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
    identity: any;
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
        this.identity = this.item.relationship.identity || this.item.relationship;
        this.group = this.navParams.get('group') || this.graphService.isGroup(this.identity);
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
                return this.graphService.addFriend(this.item)
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
        alert.setTitle('Add contact');
        alert.setSubTitle('Do you want to add ' + this.item.username + '?');
        alert.present();
    }

    joinGroup() {
        return this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/ns?requested_rid=' + this.item.rid + '&username_signature=' + this.bulletinSecretService.username_signature)
        .subscribe((res) => {
            return new Promise((resolve, reject) => {
                let invite = res.json();
                this.graphService.addGroup(invite);
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
              group: this.graphService.isGroup(this.identity)
            }
        });
    }

    compose() {
        this.navCtrl.push(ComposePage, {
          item: {
            recipient: {
              username: this.identity.username,
              username_signature: this.identity.username_signature,
              public_key: this.identity.public_key,
              requester_rid: this.item.requester_rid,
              requested_rid: this.item.requested_rid,
            }
          },
          group: this.graphService.isGroup(this.identity)
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