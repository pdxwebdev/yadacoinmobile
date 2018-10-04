import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SettingsService } from '../../app/settings.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { FirebaseService } from '../../app/firebase.service';
import { ListPage } from '../list/list';
import { ProfilePage } from '../profile/profile';
import { AlertController, LoadingController } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { WalletService } from '../../app/wallet.service';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Events } from 'ionic-angular';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class Settings {
    baseAddress = null
    blockchainAddress = null
    graphproviderAddress = null
    walletproviderAddress = null
    siaAddress = null
    siaPassword = null
    keys = null;
    loadingModal = null;
    prefix = null;
    importedKey = null;
    activeKey = null;
    serverDown = false;
    noUsername = false;
    key = null;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        private settingsService: SettingsService,
        private bulletinSecretService: BulletinSecretService,
        private firebaseService: FirebaseService,
        public loadingCtrl: LoadingController,
        public alertCtrl: AlertController,
        private storage: Storage,
        private graphService: GraphService,
        private socialSharing: SocialSharing,
        private walletService: WalletService,
        public events: Events
    ) {
        this.refresh(null).catch(() => {

        });
        this.prefix = 'usernames-';
    }

    refresh(refresher) {
        this.noUsername = false;
        this.baseAddress = this.settingsService.baseAddress || 'https://yadacoin.io';
        this.blockchainAddress = this.settingsService.blockchainAddress || this.baseAddress + '/transaction';
        this.graphproviderAddress = this.settingsService.graphproviderAddress || this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.settingsService.walletproviderAddress || this.baseAddress + '/wallet';
        this.siaAddress = this.settingsService.siaAddress || 'http://localhost:9980'
        this.siaPassword = this.settingsService.siaPassword || ''
        return this.bulletinSecretService.all().then((keys) => {
            this.setKey(keys);
        }).then(() => {
            if(refresher) refresher.complete();
        });

    }

    setKey(keys) {
        var keys_indexed = {};
        for (var i = 0; i < keys.length; i++) {
            keys_indexed[keys[i].key] = keys[i].key;
        }
        var newKeys = [];
        this.storage.forEach((value, key) => {
            if (key.substr(0, this.prefix.length) === this.prefix) {
                let active = (this.bulletinSecretService.username || '') == key.substr(this.prefix.length);
                newKeys.push({
                    username: key.substr(this.prefix.length),
                    key: value,
                    active: active
                });
                if (active) {
                    this.activeKey = value;
                }
            }
        })
        .then(() => {
            newKeys.sort(function (a, b) {
                if (a.username < b.username)
                  return -1
                if ( a.username > b.username)
                  return 1
                return 0
            });
            this.keys = newKeys;
        });
    }

    exportKey() {
        let alert = this.alertCtrl.create();
        alert.setTitle('Export Key');
        alert.setSubTitle('Warning: Never ever share this secret key with anybody but yourself!');
        alert.addButton({
            text: 'Ok',
            handler: (data: any) => {
                this.socialSharing.share(this.bulletinSecretService.key.toWIF(), "Export Secret Key");
            }
        });
        alert.present();
    }

    importKey() {
        this.bulletinSecretService.import(this.importedKey).then(() => {
            return this.refresh(null);
        })
        .then(() => {
            this.navCtrl.push(ProfilePage);
        });
    }

    createKey() {
        this.bulletinSecretService.create()
        .then(() => {
            return this.graphService.getInfo();
        })
        .then(() => {
            return this.refresh(null)
        })
        .then(() => {
            this.events.publish('pages-settings');
        })
        .catch(() => {
            this.events.publish('pages');
        });
    }

    set(key) {
        this.storage.set('last-keyname', this.prefix + key);
        this.doSet(this.prefix + key);
    }

    doSet(keyname) {
        this.bulletinSecretService.set(keyname).then(() => {
            return this.refresh(null);
        }).then(() => {
            return this.walletService.get();
        }).then(() => {
            return this.graphService.getInfo();
        }).then(() => {
            this.events.publish('pages');
            this.serverDown = false;
            if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
                this.firebaseService.initFirebase();
            }
        }).catch((error) => {
            this.events.publish('pages-error');
            this.serverDown = true;
        });
    }

    dev_reset() {
        this.baseAddress = 'https://yadacoin.io';
        this.blockchainAddress = this.baseAddress + '/transaction';
        this.graphproviderAddress = this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.baseAddress + '/wallet';
        this.siaAddress = 'http://localhost:9980'
        this.siaPassword = ''
    }

    prod_reset() {
        this.baseAddress = 'https://yadacoin.io';
        this.blockchainAddress = this.baseAddress + '/transaction';
        this.graphproviderAddress = this.baseAddress + '/get-graph-mobile';
        this.walletproviderAddress = this.baseAddress + '/wallet';
        this.siaAddress = 'http://localhost:9980'
        this.siaPassword = ''
    }

    save() {
        this.settingsService.baseAddress = this.baseAddress;
        this.settingsService.blockchainAddress = this.blockchainAddress;
        this.settingsService.graphproviderAddress = this.graphproviderAddress;
        this.settingsService.walletproviderAddress = this.walletproviderAddress;
        this.settingsService.siaAddress = this.siaAddress;
        this.settingsService.siaPassword = this.siaPassword;
        this.settingsService.save()
        this.set(this.bulletinSecretService.keyname.substr(this.prefix.length));
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
