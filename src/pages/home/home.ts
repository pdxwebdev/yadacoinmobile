import { Component } from '@angular/core';
import { NavController, NavParams, ModalController } from 'ionic-angular';
import { AlertController, LoadingController } from 'ionic-angular';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { PeerService } from '../../app/peer.service';
import { WalletService } from '../../app/wallet.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { ListPage } from '../list/list';
import { PostModal } from './postmodal';
import { OpenGraphParserService } from '../../app/opengraphparser.service'
import { Clipboard } from '@ionic-native/clipboard';
import { SocialSharing } from '@ionic-native/social-sharing';
import { HTTP } from '@ionic-native/http';
import { SettingsService } from '../../app/settings.service';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';
import { FirebaseService } from '../../app/firebase.service';
import { PushService } from '../../app/push.service';
import { EmojiPickerModule } from '@ionic-tools/emoji-picker';

declare var forge;
declare var elliptic;
declare var uuid4;
declare var X25519;
declare var firebase;

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
    baseAddress = null;
    balance = null;
    items = [];
    loading = false;
    loadingBalance = true;
    loadingModal = null;
    loadingModal2 = null;
    cryptoGenModal = null;
    phrase = null;
    color = null;
    isCordova = null;
    toggled = {};
    reacts = {};
    comments = {};
    commentInputs = {};
    ids_to_get = [];
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public modalCtrl: ModalController,
        private qrScanner: QRScanner,
        private storage: Storage,
        private bulletinSecretService: BulletinSecretService,
        private peerService: PeerService,
        private alertCtrl: AlertController,
        private walletService: WalletService,
        private graphService: GraphService,
        private transactionService: TransactionService,
        private openGraphParserService: OpenGraphParserService,
        private clipboard: Clipboard,
        private socialSharing: SocialSharing,
        private http: HTTP,
        private settingsService: SettingsService,
        public loadingCtrl: LoadingController,
        private platform: Platform,
        private ahttp: Http,
        private firebaseService: FirebaseService,
        private pushService: PushService,
        private emojiPickerModule: EmojiPickerModule
    ) {
        this.refresh()
        .then(() => {
            if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
                this.firebaseService.initFirebase();
            } else {
                // Initialize Firebase
                var config = {
                  apiKey: "AIzaSyAcJWjePVMBkEF8A3M-7oY_lT0MMXRDrpA",
                  authDomain: "yadacoin-bcaae.firebaseapp.com",
                  databaseURL: "https://yadacoin-bcaae.firebaseio.com",
                  projectId: "yadacoin-bcaae",
                  storageBucket: "yadacoin-bcaae.appspot.com",
                  messagingSenderId: "805178314562"
                };
                firebase.initializeApp(config);
                const messaging = firebase.messaging();
                messaging.usePublicVapidKey('BLuv1UWDqzAyTtK5xlNaY4tFOz6vKbjuutTQ0KmBRG5btvVbydsrMTA-UeyMqY4oCC1Gu3sDwLfsg-iWtAg6IB0');
                messaging.requestPermission().then(() => {
                  console.log('Notification permission granted.');
                  // TODO(developer): Retrieve an Instance ID token for use with FCM.
                  // ...
                }).catch((err) => {
                  console.log('Unable to get permission to notify.', err);
                });
                messaging.getToken().then((currentToken) => {
                  if (currentToken) {
                    this.sendTokenToServer(currentToken);
                    this.updateUIForPushEnabled(currentToken);
                  } else {
                    // Show permission request.
                    console.log('No Instance ID token available. Request permission to generate one.');
                    // Show permission UI.
                    this.updateUIForPushPermissionRequired();
                  }
                }).catch((err) => {
                  console.log('An error occurred while retrieving token. ', err);
                });
            }
        });
        if (this.navParams.get('txnData')) {
            this.alertRoutine(JSON.parse(decodeURIComponent(this.navParams.get('txnData'))));
        }
    }

    sendTokenToServer(token) {
      this.ahttp.post(this.settingsService.baseAddress + '/fcm-token', {
        rid: this.graphService.graph.rid,
        token: token,
      }).subscribe(() => {});
    }

    updateUIForPushEnabled(token) {

    }

    updateUIForPushPermissionRequired() {

    }

    react(e, item) {
        this.ahttp.post(
            this.baseAddress + '/react',
            {
                'react': e.char,
                'txn_id': item.id,
                'bulletin_secret': this.bulletinSecretService.bulletin_secret
            }
        )
        .subscribe((res) => {
            var existing = this.reacts[item.id] || '';
            this.reacts[item.id] = existing + e.char;
        });
    }

    comment(item) {
        if (!this.commentInputs[item.id]) {
            alert('Comment cannot be empty.');
            return;
        }
        this.ahttp.post(
            this.baseAddress + '/comment',
            {
                'comment': this.commentInputs[item.id],
                'txn_id': item.id,
                'bulletin_secret': this.bulletinSecretService.bulletin_secret
            }
        )
        .subscribe((res) => {
            if(!this.commentInputs[item.id]) {
                this.commentInputs[item.id] = [];
            }
            if(!this.comments[item.id]) {
                this.comments[item.id] = [];
            }
            this.commentInputs[item.id] = '';

            this.ahttp.post(
                this.settingsService.baseAddress + '/get-comments',
                {'txn_ids': this.ids_to_get}
            )
            .subscribe((res) => {
                var data = JSON.parse(res['_body']);
                this.comments = data;
            });
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

    reactsDetail(item) {
        this.ahttp.post(
            this.settingsService.baseAddress + '/get-reacts-detail',
            {'txn_id': item.id}
        )
        .subscribe((res) => {
            var data = JSON.parse(res['_body']);
            var item = {pageTitle: {title:"Reacts Detail"}, detail: data};
            this.navCtrl.push(ListPage, item);
        });
    }

    refresh() {
        this.loading = true;
        this.loadingBalance = true;

        this.loadingModal = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loadingModal.present();
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.storage.get('baseAddress').then((baseAddress) => {
            this.baseAddress = baseAddress;
        });

        //update our wallet
        this.walletService.get().then(() => {
            this.balance = this.walletService.wallet.balance;
            this.loadingBalance = false;
        });

        //check for friend requests
        this.graphService.getFriendRequests()
        .then(() => {
            //put ourselves in the faucet
            this.ahttp.get(this.settingsService.baseAddress + '/faucet?address=' + this.bulletinSecretService.key.getAddress()).subscribe(()=>{});
            this.color = this.graphService.graph.friend_requests.length > 0 ? 'danger' : '';
        });

        //this is our blocking procedure, update our posts for the main feed
        return this.graphService.getPosts().then(() => {
            if(this.graphService.graph && !this.graphService.graph.registered && !this.graphService.graph.pending_registration && this.walletService.wallet.balance > 1.01) {
                this.register();
            }
            this.generateFeed();
        });
    }

    generateFeed() {
        ////////////////////////////////////////////
        // all friend post operations
        ////////////////////////////////////////////
        var graphArray = this.graphService.graph.posts;
        if (graphArray.length == 0) {
            this.loading = false;
            this.loadingModal.dismiss();
        }
        graphArray.sort(function (a, b) {
          if (a.height < b.height)
            return 1
          if ( a.height > b.height)
            return -1
          return 0
        });
        this.ids_to_get = [];
        this.items = [];
        for (let i = 0; i < graphArray.length; i++) {
            this.ids_to_get.push(graphArray[i].id);
            if (this.openGraphParserService.isURL(graphArray[i].relationship.postText)) {
                if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
                    this.openGraphParserService.parseFromUrl(graphArray[i].relationship.postText).then((data) => {
                        data['id'] = graphArray[i].id;
                        this.items.push(data);
                        if ((graphArray.length - 1) == i) {
                            this.loading = false;
                            this.loadingModal.dismiss();
                        }
                    });
                } else {
                    this.openGraphParserService.parseFromUrl(this.baseAddress + '/get-url?url=' + encodeURIComponent(graphArray[i].relationship.postText)).then((data) => {
                        data['id'] = graphArray[i].id;
                        this.items.push(data);
                        if ((graphArray.length - 1) == i) {
                            this.loading = false;
                            this.loadingModal.dismiss();
                        }
                    });
                }
            } else {
                var data = {title: "post", description: graphArray[i].relationship.postText, id: graphArray[i].id};
                this.items.push(data);
                if ((graphArray.length - 1) == i) {
                    this.loading = false;
                    this.loadingModal.dismiss();
                }
            }
        }
        this.ahttp.post(
            this.settingsService.baseAddress + '/get-reacts',
            {'txn_ids': this.ids_to_get}
        )
        .subscribe((res) => {
            var data = JSON.parse(res['_body']);
            this.reacts = data;
        });
        this.ahttp.post(
            this.settingsService.baseAddress + '/get-comments',
            {'txn_ids': this.ids_to_get}
        )
        .subscribe((res) => {
            var data = JSON.parse(res['_body']);
            this.comments = data;
        });
    }

    register() {
        this.cryptoGenModal = this.loadingCtrl.create({
            content: 'Generating encryption, please wait... (could take several minutes)'
        });
        this.cryptoGenModal.present();
        return new Promise((resolve, reject) => {
            this.walletService.get().then(() => {
                this.ahttp.get(this.settingsService.baseAddress + '/register')
                .subscribe((res) => {
                    var data = JSON.parse(res['_body']);
                    var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                    var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                    var dh_private_key = this.toHex(raw_dh_private_key);
                    var dh_public_key = this.toHex(raw_dh_public_key);
                    data.dh_private_key = dh_private_key;
                    data.dh_public_key = dh_public_key;
                    this.getTransaction(data, resolve);
                });
            });
        })
        .then(() => {
            this.cryptoGenModal.dismiss();
        });
    }

    getTransaction(info, resolve) {
        return this.transactionService.pushTransaction({
            relationship: {
                bulletin_secret: info.bulletin_secret,
                dh_private_key: info.dh_private_key
            },
            dh_public_key: info.dh_public_key,
            requested_rid: info.requested_rid,
            requester_rid: info.requester_rid,
            blockchainurl: this.blockchainAddress,
            callbackurl: info.callbackurl,
            to: info.to,
            resolve: resolve
        });
    }

    sharePhrase() {
        this.socialSharing.share(this.graphService.graph.human_hash, "Add me on Yada Coin!");
    }

    addFriend() {
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                this.pasteFriend(data.phrase);
            }
        });
        if (this.platform.is('android') || this.platform.is('ios')) {
            buttons.push({
                text: 'Scan',
                handler: () => {
                    this.scanFriend();
                }
            });
        }
        let alert = this.alertCtrl.create({
            inputs: [
                {
                    name: 'phrase',
                    placeholder: 'Type username here...'
                }
            ],
            buttons: buttons
        });
        alert.setTitle('Request Friend');
        alert.setSubTitle('How do you want to request this friend?');
        alert.present();
    }

    pasteFriend(phrase) {
        //this.loadingModal2 = this.loadingCtrl.create({
        //    content: 'Please wait...'
        //});
        //this.loadingModal.present();
        this.ahttp.get(this.settingsService.baseAddress + '/search?phrase=' + phrase + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
        .subscribe((res) => {
            //this.loadingModal2.dismiss();
            this.alertRoutine(JSON.parse(res['_body']));
        });
    }

    scanFriend() {
        if (this.walletService.wallet.balance < 1.01) {
            let alert = this.alertCtrl.create();
            alert.setTitle('Insuficient Funds');
            alert.setSubTitle('You need at least 1.01 YC');
            alert.addButton('OK');
            alert.present();
            return
        }
        this.qrScanner.prepare().then((status: QRScannerStatus) => {
            console.log(status);
            if (status.authorized) {
                // start scanning
                let scanSub = this.qrScanner.scan().subscribe((text: string) => {
                    console.log('Scanned something', text);
                    this.alertRoutine(JSON.parse(text));
                    this.qrScanner.hide(); // hide camera preview
                    scanSub.unsubscribe(); // stop scanning
                    window.document.querySelector('ion-app').classList.remove('transparentBody');
                });
                console.log(this.qrScanner);
                this.qrScanner.resumePreview();
                // show camera preview
                this.qrScanner.show();
                window.document.querySelector('ion-app').classList.add('transparentBody');
                // wait for user to scan something, then the observable callback will be called


            } else if (status.denied) {
                // camera permission was permanently denied
                // you must use QRScanner.openSettings() method to guide the user to the settings page
                // then they can grant the permission from there
            } else {
                // permission was denied, but not permanently. You can ask for permission again at a later time.
            }

        }).catch((e: any) => console.log('Error is', e));
    }

    alertRoutine(info) {
        if (this.walletService.wallet.balance < 1.01) {
            let alert = this.alertCtrl.create();
            alert.setTitle('Insuficient Funds');
            alert.setSubTitle('You need at least 1.01 YadaCoins');
            alert.addButton('OK');
            alert.present();
            return
        }
        if (info.requester_rid && info.requested_rid && info.requester_rid === info.requested_rid) {
            let alert = this.alertCtrl.create();
            alert.setTitle('Oops!');
            alert.setSubTitle('You are trying to request yourself. :)');
            alert.addButton({
                text: 'Cancel',
                handler: (data: any) => {
                    this.loadingModal.dismiss();
                }
            });
            alert.present();
            return
        }
        let alert = this.alertCtrl.create();
        alert.setTitle('Approve Transaction');
        alert.setSubTitle('You are about to spend 1.01 coins (1 coin + 0.01 fee)');
        alert.addButton({
            text: 'Cancel',
            handler: (data: any) => {
                this.loadingModal.dismiss();
                this.cryptoGenModal.dismiss();
            }
        });
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                this.cryptoGenModal = this.loadingCtrl.create({
                    content: 'Generating encryption, please wait... (could take several minutes)'
                });
                this.cryptoGenModal.present();
                // camera permission was granted
                var requester_rid = info.requester_rid;
                var requested_rid = info.requested_rid;
                if (requester_rid && requested_rid) {
                    // get rid from bulletin secrets
                    var bulletin_secrets = [this.bulletinSecretService.bulletin_secret, this.bulletinSecretService.bulletin_secret].sort(function (a, b) {
                        return a.toLowerCase().localeCompare(b.toLowerCase());
                    });
                    var rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
                } else {
                    requester_rid = '';
                    requested_rid = '';
                }
                //////////////////////////////////////////////////////////////////////////
                // create and send transaction to create the relationship on the blockchain
                //////////////////////////////////////////////////////////////////////////
                this.walletService.get().then(() => {
                    return new Promise((resolve, reject) => {
                        var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                        var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                        var dh_private_key = this.toHex(raw_dh_private_key);
                        var dh_public_key = this.toHex(raw_dh_public_key);
                        info.dh_private_key = dh_private_key;
                        info.dh_public_key = dh_public_key;
                        this.cryptoGenModal.dismiss();
                        this.transactionService.pushTransaction({
                            relationship: {
                                bulletin_secret: info.bulletin_secret,
                                dh_private_key: info.dh_private_key
                            },
                            dh_public_key: info.dh_public_key,
                            requested_rid: info.requested_rid,
                            requester_rid: info.requester_rid,
                            blockchainurl: this.blockchainAddress,
                            to: info.to,
                            resolve: resolve
                        });
                    });
                }).then((txn) => {
                    this.loadingModal.dismiss()
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Friend Request Sent');
                    alert.setSubTitle('Your Friend Request has been sent successfully.');
                    alert.addButton('Ok');
                    alert.present();
                });
            }
        });
        alert.present();
    }

    itemTapped(event, item) {
        item.pageTitle = "Posts";
        this.navCtrl.push(ListPage, {
            item: item
        });
    }

    presentModal() {
        let modal = this.modalCtrl.create(PostModal, {blockchainAddress: this.blockchainAddress, logicalParent: this});
        modal.present();
    }

    share(item) {
        this.walletService.get().then(() => {
            return new Promise((resolve, reject) => {

                console.log(status);

                let alert = this.alertCtrl.create();
                alert.setTitle('Approve Transaction');
                alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
                alert.addButton('Cancel');
                alert.addButton({
                    text: 'Confirm',
                    handler: (data: any) => {
                        // camera permission was granted
                        this.transactionService.pushTransaction({
                            relationship: {
                                postText: item.url || item.description
                            },
                            blockchainurl: this.blockchainAddress,
                            resolve: resolve
                        });
                    }
                });
                alert.present();
            });
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
