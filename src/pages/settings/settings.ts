import { Component, Injectable } from '@angular/core';
import { NavController, NavParams, Platform, ToastController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SettingsService } from '../../app/settings.service';
import { PeerService } from '../../app/peer.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { FirebaseService } from '../../app/firebase.service';
import { ListPage } from '../list/list';
import { AlertController, LoadingController } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Events } from 'ionic-angular';
import { HomePage } from '../home/home';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { SendReceive } from '../sendreceive/sendreceive';
import { GoogleMaps, GoogleMapsEvent, LatLng, MarkerOptions, Marker } from "@ionic-native/google-maps";


declare var forge;
declare var foobar;
declare var CenterIdentity;


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
    geoWalletUsername: any;
    identity: any;
    identityJson = '{}';
    centerIdentityImportEnabled = false;
    centerIdentityExportEnabled = false;
    exportKeyEnabled = false;
    centerIdentityLocation: any;
    centerIdentityPrivateUsername = '';
    ci: any;
    centerIdentitySaveSuccess = false;
    centerIdentityImportSuccess = false;
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
        private transactionService: TransactionService,
        public events: Events,
        public toastCtrl: ToastController,
        public peerService: PeerService,
        private ahttp: Http,
        private geolocation: Geolocation,
        private platform: Platform
    ) {
        if (typeof this.peerService.mode == 'undefined') this.peerService.mode = true;
        this.refresh(null).catch((err) => {
            console.log(err)
        });
        this.prefix = 'usernames-';
        this.ci = new CenterIdentity(undefined, undefined, undefined, undefined, true)
    }

    loadMap(mapType) {
      /* The create() function will take the ID of your map element */
      const map = GoogleMaps.create('map-' + mapType, {
        mapTypeId: 'satellite'
      });
  
      map.one( GoogleMapsEvent.MAP_READY ).then((data: any) => {
        const coordinates: LatLng = new LatLng(41, -87);
  
        map.setCameraTarget(coordinates);
        map.setCameraZoom(8);
      });

      map.on(GoogleMapsEvent.MAP_CLICK).subscribe((e) => {
        map.clear();
        this.centerIdentityLocation = e[0]
        map.addMarker({
          position: e[0]
        })
      })
    }

    refresh(refresher) {
        this.noUsername = false;
        return this.bulletinSecretService.all().then((keys) => {
            this.setKey(keys);
        }).then(() => {
            if(refresher) refresher.complete();
        });

    }

    getResults(keyword:string) {
      return ['234234','234234']
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
                    this.identity = this.bulletinSecretService.identity
                    this.identityJson = this.bulletinSecretService.identityJson()
                    this.activeKey = value;
                }
            }
        })
        .then(() => {
            newKeys.sort(function (a, b) {
                if (a.username.toLowerCase() < b.username.toLowerCase())
                  return -1
                if ( a.username.toLowerCase() > b.username.toLowerCase())
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
                this.exportKeyEnabled = true;
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
                        reject('Cancel clicked');
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

    createWallet() {
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
                        reject('Cancel clicked');
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
            return this.createKey(username);
        })
    }

    createKey(username) {
        return new Promise((resolve, reject) => {
            this.bulletinSecretService.create(username)
            .then(() => {
                resolve(username);
            });
        })
        .then((key) => {
            this.set(key)
            .then(() => {
                this.save();
            });
        })
        .then(() => { 
            this.selectIdentity(this.bulletinSecretService.keyname.substr(this.prefix.length));
        })
        .then(() => {
            if (this.settingsService.remoteSettings['walletUrl']) {
                return this.graphService.getInfo();
            }
        })
        .then(() => {
            return this.refresh(null)
        })
        .catch(() => {
            this.events.publish('pages');
        });
    }

    selectIdentity(key) {
        this.graphService.resetGraph();
        this.loadingModal = this.loadingCtrl.create({
            content: 'initializing...'
        });
        this.loadingModal.present();
        return this.set(key)
        .then(() => {
            return this.peerService.go();
        })
        .then(() => {
            return this.refresh(null);
        })
        .then(() => {
          return this.graphService.refreshFriendsAndGroups();
        })    
        .then(() => { 
            this.loadingModal.dismiss();
            this.settingsService.menu = 'home';
            this.navCtrl.setRoot(HomePage, {pageTitle: { title: 'Home', label: 'Home', component: HomePage, count: false, color: '' }});
        })
        .catch((err)  => {
            console.log(err);
            this.loadingModal.dismiss();  
        });
    }

    unlockWallet() {
        return new Promise((resolve, reject) => {
            let options = new RequestOptions({ withCredentials: true });
            this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/unlock?origin=' + encodeURIComponent(window.location.origin), {key_or_wif: this.activeKey}, options)
            .subscribe((res) => {
                this.settingsService.tokens[this.bulletinSecretService.keyname] = res.json()['token']
                if (!this.settingsService.tokens[this.bulletinSecretService.keyname]) return resolve(res);
                const toast = this.toastCtrl.create({
                    message: 'Wallet unlocked!',
                    duration: 2000
                });
                toast.present();
                resolve(res);
            },
            (err) => {
                return reject('cannot unlock wallet');
            });
        });
    }

    set(key) {
        this.storage.set('last-keyname', this.prefix + key);
        return this.doSet(this.prefix + key)
        .catch(() => {
            console.log('can not set identity')
        });
    }

    doSet(keyname) {
        return new Promise((resolve, reject) => {
            this.bulletinSecretService.set(keyname).then(() => {
                return this.refresh(null);
            }).then(() => {
                this.serverDown = false;
                if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
                    this.firebaseService.initFirebase();
                }
                return resolve();
            }).catch((error) => {
                this.serverDown = true;
                return reject(error);
            });
        });
    }

    save() {
        this.graphService.resetGraph()
        
        return this.set(this.bulletinSecretService.keyname.substr(this.prefix.length));
    }

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }

    enableCenterIdentityImport() {
      this.centerIdentityImportEnabled = true
      this.loadMap('import')
    }

    enableCenterIdentityExport() {
      this.centerIdentityExportEnabled = true
      this.loadMap('export')
    }

    getKeyUsingCenterIdentity() {
      return this.ci.get(this.centerIdentityPrivateUsername, this.centerIdentityLocation.lat, this.centerIdentityLocation.lng)
      .then((identity) => {
        this.importedKey = identity.wif;
        return this.importKey();
      });
    }

    saveKeyUsingCenterIdentity() {
      const fullIdentity = {
        key: this.bulletinSecretService.key,
        wif: this.bulletinSecretService.key.toWIF(),
        public_key: this.identity.public_key,
        username: this.centerIdentityPrivateUsername,
      }
      return this.walletService.get(1)
      .then((txns) => {
        return this.ci.set(fullIdentity, this.centerIdentityLocation.lat, this.centerIdentityLocation.lng);
      })
      .then((txns) => {
        const friendTxn = txns[0];
        this.transactionService.generateTransaction(friendTxn)
        this.transactionService.sendTransaction('https://centeridentity.com/transaction');
        const buryTxn = txns[1];
        buryTxn.to = '1EWkrpUezWMpByE6nys6VXubjFLorgbZuP'
        buryTxn.value = 1
        this.transactionService.generateTransaction(buryTxn)
        this.transactionService.sendTransaction('https://centeridentity.com/transaction');
        this.centerIdentitySaveSuccess = true
      })
    }
}
