import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SettingsService } from '../../app/settings.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { FirebaseService } from '../../app/firebase.service';
import { PushService } from '../../app/push.service';
import { Platform } from 'ionic-angular';
import { ListPage } from '../list/list';
import { AlertController, LoadingController } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { WalletService } from '../../app/wallet.service';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class Settings {
    baseAddress = null
    blockchainAddress = null
    graphproviderAddress = null
    walletproviderAddress = null
    keys = null;
    loadingModal = null;
    prefix = null;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        private settingsService: SettingsService,
        private bulletinSecretService: BulletinSecretService,
        private platform: Platform,
        private firebaseService: FirebaseService,
        private pushService: PushService,
        public loadingCtrl: LoadingController,
        private storage: Storage,
        private graphService: GraphService,
        private walletService: WalletService
    ) {
        this.refresh();
        this.prefix = 'usernames-';
    }

    refresh() {
        this.loadingModal = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loadingModal.present();
        this.keys = [];
        this.baseAddress = this.settingsService.baseAddress || 'http://71.237.161.227:5000';
        this.blockchainAddress = this.settingsService.blockchainAddress || this.baseAddress + '/transaction';
        this.graphproviderAddress = this.settingsService.graphproviderAddress || this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.settingsService.walletproviderAddress || this.baseAddress + '/wallet';
        this.bulletinSecretService.all().then((keys: any) => {
            var keys_indexed = {};
            for (var i = 0; i < keys.length; i++) {
                keys_indexed[keys[i].key] = keys[i].key;
            }
            return new Promise((resolve, reject) => {
                this.storage.forEach((value, key) => {
                    
                    if (key.substr(0, this.prefix.length) === this.prefix) {
                        if (keys_indexed[value]) {
                            this.keys.push({
                                username: key.substr(this.prefix.length),
                                key: value,
                                active: this.bulletinSecretService.key.toWIF() == value
                            });
                        }
                    }
                })
                .then(() => {
                    this.keys.sort(function (a, b) {
                        if (a.username < b.username)
                          return -1
                        if ( a.username > b.username)
                          return 1
                        return 0
                    });
                    resolve(this.keys);
                });                
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.walletService.get().then(() => {
                        resolve();
                    })
                });
            })
            .then(() => {
                this.loadingModal.dismiss();
            });
        });
    }

    createKey() {
        this.bulletinSecretService.create()
        .then(() => {
            return new Promise((resolve, reject) => {
                this.graphService.getGraph().then(() => {
                    resolve();
                });
            });
        })
        .then(() => {
            this.refresh();
        });
    }

    set(key) {
        this.loadingModal = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loadingModal.present();
        this.bulletinSecretService.set(this.prefix + key)
        .then(() => {
            return new Promise((resolve, reject) => {
                this.graphService.getGraph().then(() => {
                    resolve();
                });
            });
        })
        .then(() => {
            if (this.platform.is('android') || this.platform.is('ios')) {
                this.firebaseService.initFirebase();
            } else {
                this.pushService.initPush();
            }
            this.loadingModal.dismiss();
            alert("Identity set to: " + key)
            this.refresh();
        });
    }

    dev_reset() {
        this.baseAddress = 'http://71.237.161.227:5000';
        this.blockchainAddress = this.baseAddress + '/transaction';
        this.graphproviderAddress = this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.baseAddress + '/wallet';
    }

    prod_reset() {
        this.baseAddress = 'http://34.237.46.10';
        this.blockchainAddress = this.baseAddress + '/transaction';
        this.graphproviderAddress = this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.baseAddress + '/wallet';
    }

    save() {
        this.settingsService.baseAddress = this.baseAddress;
        this.settingsService.blockchainAddress = this.blockchainAddress;
        this.settingsService.graphproviderAddress = this.graphproviderAddress;
        this.settingsService.walletproviderAddress = this.walletproviderAddress;
        this.settingsService.save()
    }

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }
}
