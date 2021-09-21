import { Component, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NavController, NavParams, ModalController } from 'ionic-angular';
import { AlertController, LoadingController, ToastController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { PeerService } from '../../app/peer.service';
import { ListPage } from '../list/list';
import { ProfilePage } from '../profile/profile';
import { PostModal } from './postmodal';
import { OpenGraphParserService } from '../../app/opengraphparser.service'
import { SocialSharing } from '@ionic-native/social-sharing';
import { SettingsService } from '../../app/settings.service';
import { FirebaseService } from '../../app/firebase.service';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Events } from 'ionic-angular';
import { CompleteTestService } from '../../app/autocomplete.provider';
import { Geolocation } from '@ionic-native/geolocation';

declare var forge;
declare var X25519;
declare var firebase;
declare var foobar;
declare var Base64;
declare var shortid;

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {
    postText = null;
    createdCode = null;
    scannedCode = null;
    key = null;
    blockchainAddress = null;
    balance = null;
    items = [];
    loading = false;
    loadingBalance = true;
    loadingModal = null;
    loadingModal2 = null;
    phrase = null;
    color = null;
    isCordova = null;
    toggled = {};
    reacts = {};
    comments = {};
    commentInputs = {};
    ids_to_get = [];
    comment_ids_to_get = [];
    commentReacts = {};
    chatColor: any;
    friendRequestColor: any;
    registrationLink: any;
    signInCode: any;
    signInColor: any;
    prefix: any;
    signedIn: any;
    txnId: any;
    location: any;
    searchResults: any;
    searchTerm: any;
    origin: any;
    identitySkylink: any;
    invites: any;
    memberIdentifier: any;
    busy: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public modalCtrl: ModalController,
        private storage: Storage,
        private bulletinSecretService: BulletinSecretService,
        private alertCtrl: AlertController,
        private walletService: WalletService,
        private graphService: GraphService,
        private transactionService: TransactionService,
        private openGraphParserService: OpenGraphParserService,
        private socialSharing: SocialSharing,
        private settingsService: SettingsService,
        public loadingCtrl: LoadingController,
        private ahttp: Http,
        private firebaseService: FirebaseService,
        public events: Events,
        public toastCtrl: ToastController,
        public peerService: PeerService,
        public completeTestService: CompleteTestService
    ) {
        this.location = window.location;
        this.origin = encodeURIComponent(this.location.origin);
        this.prefix = 'usernames-';
        this.refresh(null);
        this.busy = true
        this.graphService.identityToSkylink(this.bulletinSecretService.identity)
        .then((skylink) => {
          this.identitySkylink = skylink;
          this.busy = false;
        })
    }

    myForm = new FormGroup({
        searchTerm: new FormControl('', [Validators.required])
    })

    submit() {
        if (!this.myForm.valid) return false;
        this.navCtrl.push(ProfilePage, {item: this.myForm.value.searchTerm});
        console.log(this.myForm.value.searchTerm)
    }

    react(e, item) {
        this.toggled[item.id] = false;
        return this.walletService.get()
        .then(() => {
            return this.transactionService.generateTransaction({
                relationship: {
                    'react': e.char,
                    'id': item.id,
                    'username_signature': this.bulletinSecretService.username_signature
                }
            });
        })
        .then(() => {
            return this.transactionService.getFastGraphSignature();
        })
        .then((hash) => {
            return this.transactionService.sendTransaction();
        })
        .then(() => {
            const toast = this.toastCtrl.create({
                message: 'React sent',
                duration: 2000
            });
            return toast.present();
        })
        .then(() => {
            this.graphService.getReacts([item.id])
        })
        .catch((err) => {
            const toast = this.toastCtrl.create({
                message: 'Something went wrong with your react!',
                duration: 2000
            });
            toast.present();  
        });
    }

    addOrganizationMember() {
      console.log('submitted');
      const username_signature = foobar.base64.fromByteArray(
        this.bulletinSecretService.key.sign(
          foobar.bitcoin.crypto.sha256(
            this.memberIdentifier
          )
        ).toDER()
      );
      let invite: any = {
          identifier: this.memberIdentifier,
          invite_signature: username_signature,
          parent: this.graphService.toIdentity(this.bulletinSecretService.identity)
      }
      this.graphService.inviteToSkylink(invite)
      .then((skylink) => {
        invite.skylink = skylink
        return fetch(
            '/invite-organization-user', 
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invite),
            }
        )
      })
      .then(async (res) => {
        console.log(await res.json())
        this.getOrganizationMembers();
      })
      return false;
    }

    getOrganizationMembers() {
      return fetch('/invite-organization-user')
      .then(async (res) => {
          const result = await res.json()
          this.invites = [];
          const users = result.users;
          users.sort(function (a, b) {
              try {
                const ausername = a.user.username;
                const busername = b.user.username;
                if (ausername.toLowerCase() < busername.toLowerCase())
                  return -1
                if ( ausername.toLowerCase() > busername.toLowerCase())
                  return 1
                return 0
              } catch(err) {
                return 0
              }
          });
          for (let i=0; i < users.length; i++) {
              let user = users[i];
              this.invites.push(user)
          }
      })
    }

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }

    refresh(refresher) {
        this.loading = false;
        this.getOrganizationMembers();
    }

    search() {
        return this.ahttp.get(
            this.settingsService.remoteSettings['baseUrl'] + '/search?searchTerm=' + this.searchTerm
        )
        .subscribe((res)=>{
            this.searchResults = res.json()
        }, () => {});
    }

    addFriend() {
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                this.graphService.addFriendFromSkylink(data.identity);
            }
        });
        let alert = this.alertCtrl.create({
            inputs: [
                {
                    name: 'identity',
                    placeholder: 'Type username here...'
                }
            ],
            buttons: buttons
        });
        alert.setTitle('Request Friend');
        alert.setSubTitle('How do you want to request this friend?');
        alert.present();
    }

    createGeoWallet() {
        return new Promise((resolve, reject) => {
            this.loadingModal = this.loadingCtrl.create({
                content: 'Burying treasure at this location...'
            });
            return this.loadingModal.present()
            .then(() => {
                return resolve();
            });
        })
        .then(() => {
            return this.graphService.createRecovery(this.bulletinSecretService.username);
        })
        .then(() => {
            return this.loadingModal.dismiss();
        });
    }

    createGroup() {
        return new Promise((resolve, reject) => {
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
                        const toast = this.toastCtrl.create({
                            message: 'Group created',
                            duration: 2000
                        });
                        toast.present();
                        resolve(data.groupname);
                    }
                }
                ]
            });
            alert.present();
        })
        .then((groupName) => {
            return this.graphService.createGroup(groupName);
        })
        .then(() => {
            return this.refresh(null)
        })
        .catch((err) => {
            console.log(err);
            this.events.publish('pages');
        });
    }

    itemTapped(event, item) {
        item.pageTitle = "Posts";
        this.navCtrl.push(ListPage, {
            item: item
        });
    }

    decrypt(message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.bulletinSecretService.key.toWIF()).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output
    }

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }

    toHex(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }
}
