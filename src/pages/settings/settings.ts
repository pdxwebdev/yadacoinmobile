import { Component, Injectable } from '@angular/core';
import { NavController, NavParams, ToastController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SettingsService } from '../../app/settings.service';
import { PeerService } from '../../app/peer.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { FirebaseService } from '../../app/firebase.service';
import { ListPage } from '../list/list';
import { AlertController, LoadingController } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { WalletService } from '../../app/wallet.service';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Events } from 'ionic-angular';
import { HomePage } from '../home/home';
import { Http, Headers, RequestOptions } from '@angular/http';



@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class Settings {
    baseUrl = null
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
    favorites = null;
    removeFavorites = null;
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
        public events: Events,
        public toastCtrl: ToastController,
        public peerService: PeerService
    ) {
        this.refresh(null).catch((err) => {
            console.log(err)
        });
        this.prefix = 'usernames-';
    }

    refresh(refresher) {
        this.noUsername = false;
        return this.bulletinSecretService.all().then((keys) => {
            this.setKey(keys);
        }).then(() => {
            this.getFavorites();
        }).then(() => {
            if(refresher) refresher.complete();
        });

    }

    saveToFavorites() {
        let alert = this.alertCtrl.create({
            title: 'Set group name',
            inputs: [
            {
                name: 'groupname',
                placeholder: 'Group name'
            }
            ],
            buttons: [
            {
                text: 'Save',
                handler: data => {
                    this.storage.set('favorites-' + data.groupname, this.settingsService.remoteSettingsUrl);
                    this.getFavorites();
                }
            }
            ]
        });
        alert.present();
        
    }
    getResults(keyword:string) {
      return ['234234','234234']
    }

    getFavorites() {
        return new Promise((resolve, reject) => {
            var favorites = [];
            this.storage.forEach((value, key) => {
                if (key.substr(0, 'favorites-'.length) === 'favorites-') {
                    favorites.push({label: key.substr('favorites-'.length), url: value});
                }
            })
            .then(() => {
                if (favorites.length == 0) {
                    var host = window.location.protocol + '//' + window.location.host
                    this.storage.set('favorites-Home', host);
                    favorites.push({label: 'Home', url: host});
                }
                this.favorites = favorites;
                resolve(favorites);
            });
        });
    }

    selectFavorite(favorite) {
        for(var i=0; i < this.favorites.length; i++) {
            this.favorites[i].active = false;
        }
        favorite.active = true;
        this.settingsService.remoteSettingsUrl = favorite.url;
    }

    removeFavorite(favorite) {
        this.storage.remove('favorites-' + favorite.label);
        this.getFavorites()
        .then((favorites) => {
            if (!favorites) {
                this.removeFavorites = null;
            }
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
        new Promise((resolve, reject) => {
            let alert = this.alertCtrl.create({
                title: 'Set username',
                inputs: [
                {
                    name: 'username',
                    placeholder: 'Username'
                }
                ],
                buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel',
                    handler: data => {
                        console.log('Cancel clicked');
                        reject();
                    }
                },
                {
                    text: 'Save',
                    handler: data => {
                        const toast = this.toastCtrl.create({
                            message: 'Identity created',
                            duration: 2000
                        });
                        toast.present();
                        resolve(data.username);
                    }
                }
                ]
            });
            alert.present();
        })
        .then((username) => {
            return this.bulletinSecretService.import(this.importedKey, username);
        })
        .then(() => {
            this.importedKey = '';
            return this.refresh(null);
        })
        .catch(() => {
            const toast = this.toastCtrl.create({
                message: 'Error importing identity!',
                duration: 2000
            });
            toast.present();
        });
    }

    createKey() {
        new Promise((resolve, reject) => {
            let alert = this.alertCtrl.create({
                title: 'Set username',
                inputs: [
                {
                    name: 'username',
                    placeholder: 'Username'
                }
                ],
                buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel',
                    handler: data => {
                        console.log('Cancel clicked');
                        reject();
                    }
                },
                {
                    text: 'Save',
                    handler: data => {
                        const toast = this.toastCtrl.create({
                            message: 'Identity created',
                            duration: 2000
                        });
                        toast.present();
                        resolve(data.username);
                    }
                }
                ]
            });
            alert.present();
        })
        .then((username) => {
            return this.bulletinSecretService.create(username);
        })
        .then(() => {
            return this.doSet(this.bulletinSecretService.keyname);
        })
        .then(() => {
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
        .catch(() => {
            this.events.publish('pages');
        });
    }

    selectIdentity(key) {
        const toast = this.toastCtrl.create({
            message: 'Now click the "go" button',
            duration: 2000
        });
        toast.present();
        this.set(key)
        .then(() => {
            this.save();
        });
    }

    set(key) {
        this.storage.set('last-keyname', this.prefix + key);
        return this.doSet(this.prefix + key)
        .then(() => {
            this.events.publish('pages-settings');
        })
        .catch(() => {
            console.log('can not set identity')
        });
    }

    doSet(keyname) {
        return new Promise((resolve, reject) => {
            this.bulletinSecretService.set(keyname).then(() => {
                return this.refresh(null);
            }).then(() => {
                if (this.settingsService.remoteSettings['walletUrl']) {
                    return this.walletService.get();
                }
            }).then(() => {
                if (this.settingsService.remoteSettings['walletUrl']) {
                    return this.graphService.getInfo();
                }
            }).then(() => {
                this.serverDown = false;
                if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
                    this.firebaseService.initFirebase();
                }
                return resolve();
            }).catch((error) => {
                this.serverDown = true;
                return reject();
            });
        });
    }

    save() {
        this.loadingModal = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loadingModal.present();
        this.graphService.graph = {
            comments: "",
            reacts: "",
            commentReacts: ""
        };
        this.peerService.go()
        .then(() => {
            return this.set(this.bulletinSecretService.keyname.substr(this.prefix.length));
        })
        .then(() => {
            this.navCtrl.setRoot(HomePage);
        })
        .then(() => { 
            this.loadingModal.dismiss();
        })
        .catch((err)  => {
            this.loadingModal.dismiss();  
        });
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
