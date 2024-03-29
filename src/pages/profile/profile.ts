import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { ListPage } from '../list/list';
import { ChatPage } from '../chat/chat';
import { Http } from '@angular/http';
import { AlertController, LoadingController, ToastController } from 'ionic-angular';
import { SettingsService } from '../../app/settings.service';
import { Events } from 'ionic-angular';
import { ComposePage } from '../mail/compose';
import { SendReceive } from '../sendreceive/sendreceive';

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
    isAdded: any;
    isMe: any;
    group: any;
    identity: any;
    subgroups = [];
    collectionName: any;
    identityJson: any;
    tempIdentity: any;
    rid: any;
    requested_rid: any;
    requester_rid: any;
    identitySkylink: any;
    busy: any;
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
        this.identity = this.navParams.get('identity');
        const rids = this.graphService.generateRids(this.identity);
        this.rid = rids.rid;
        this.requested_rid = rids.requested_rid;
        this.requester_rid = rids.requester_rid;
        if (this.settingsService.remoteSettings.restricted) {
          this.busy = true;
          this.graphService.identityToSkylink(this.identity)
          .then((skylink) => {
            this.identitySkylink = skylink;
            this.busy = false;
          })
        } else {
          this.identityJson = JSON.stringify(this.graphService.toIdentity(this.identity), null, 4)
        }
        this.isAdded = this.graphService.isAdded(this.identity)
        this.group = this.graphService.isGroup(this.identity)
        this.isMe = this.graphService.isMe(this.identity)
    }

    invite() {
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
    }

    addFriend() {
        let info: any;
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                return this.graphService.addFriend(this.identity)
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
        alert.setSubTitle('Do you want to add ' + this.identity.username + '?');
        alert.present();
    }

    createSubGroup() {
        this.graphService.getInfo()
        .then(() => {
            return new Promise((resolve, reject) => {
                let alert = this.alertCtrl.create({
                    title: 'Sub-group name',
                    inputs: [
                    {
                        name: 'groupname',
                        placeholder: 'Sub-group name'
                    }
                    ],
                    buttons: [
                        {
                            text: 'Save',
                            handler: data => {
                                const toast = this.toastCtrl.create({
                                    message: 'Sub-group created',
                                    duration: 2000
                                });
                                toast.present();
                                resolve(data.groupname);
                            }
                        }
                    ]
                });
                alert.present();
            });
        })
        .then((groupName) => {
            return this.graphService.createGroup(groupName, this.item);
        })
        .then((hash) => {
            if (this.settingsService.remoteSettings['walletUrl']) {
                return this.graphService.getInfo();
            }
        });
    }

    message() {
        this.navCtrl.push(ChatPage, {
          identity: this.identity
        });
    }

    openSubGroup(subGroup) {
        this.navCtrl.push(ProfilePage, {
          identity: subGroup.relationship[this.settingsService.collections.GROUP],
          group: true
        });
    }

    compose() {
        this.navCtrl.push(ComposePage, {
          item: {
            recipient: this.identity
          }
        });
    }

    sendCoins() {
        this.navCtrl.push(SendReceive, {
          identity: this.identity
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