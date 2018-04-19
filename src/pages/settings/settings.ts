import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SettingsService } from '../../app/settings.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { FirebaseService } from '../../app/firebase.service';
import { PushService } from '../../app/push.service';
import { Platform } from 'ionic-angular';
import { ListPage } from '../list/list';

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
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        private settingsService: SettingsService,
        private bulletinSecretService: BulletinSecretService,
        private platform: Platform,
        private firebaseService: FirebaseService,
        private pushService: PushService
    ) {
        this.refresh();
    }

    refresh() {
        this.keys = [];
        this.baseAddress = this.settingsService.baseAddress || 'http://71.237.161.227:5000';
        this.blockchainAddress = this.settingsService.blockchainAddress || this.baseAddress + '/transaction';
        this.graphproviderAddress = this.settingsService.graphproviderAddress || this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.settingsService.walletproviderAddress || this.baseAddress + '/wallet';
        this.bulletinSecretService.all().then((keys) => {
            this.keys = keys;
        });
    }

    createKey() {
        this.bulletinSecretService.create().then(() => {
            this.bulletinSecretService.all().then((keys) => {
                this.keys = keys;
            });
        });
    }

    set(key) {
        this.bulletinSecretService.set(key)
        .then(() => {
            if (this.platform.is('android') || this.platform.is('ios')) {
                this.firebaseService.initFirebase();
            } else {
                this.pushService.initPush();
            }
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
