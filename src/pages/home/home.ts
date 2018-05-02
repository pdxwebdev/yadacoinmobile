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

declare var forge;
declare var elliptic;
declare var uuid4;
declare var diffiehellman;

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
    phrase = null;
    color = null;
    isCordova = null;
    toggled = {};
    reacts = {};
    comments = {};
    commentInputs = {};
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
        private pushService: PushService
    ) {
        this.platform.ready().then(() => {
          if(this.platform.is('cordova')) {
            if(this.platform.is('ios')) {
              this.firebaseService.firebase.grantPermission()
              .then(() => {
                this.firebaseService.initFirebase();
              });
            } else {
              this.firebaseService.initFirebase();
            }
          } else {
            this.pushService.initPush();
          }
        });
        this.refresh();
        if (this.navParams.get('txnData')) {
            this.alertRoutine(JSON.parse(decodeURIComponent(this.navParams.get('txnData'))));
        }
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
            this.reacts[item.id] = this.reacts[item.id] + e.char;
        });
    }

    comment(item) {
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
            this.comments[item.id].push(this.commentInputs[item.id]);
            this.commentInputs[item.id] = '';
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
        this.walletService.get().then(() => {
            this.balance = this.walletService.wallet.balance;
            this.loadingBalance = false;
        });
        this.graphService.getGraph().then(() => {
            if(this.graphService.graph && !this.graphService.graph.registered && !this.graphService.graph.pending_registration && this.walletService.wallet.balance > 1.01) {
                this.register();
            }
            ////////////////////////////////////////////
            // all friend post operations from here down
            ////////////////////////////////////////////
            this.color = this.graphService.graph.friend_requests.length > 0 ? 'danger' : '';
            var graphArray = this.graphService.graph.posts
            if (graphArray.length == 0) {
                this.loading = false;
                this.loadingModal.dismiss();
            }
            var ids_to_get = [];
            this.items = [];
            for (let i = 0; i < graphArray.length; i++) {
                ids_to_get.push(graphArray[i].id);
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
                    var data = {title: "post", description: graphArray[i].relationship.postText};
                    this.items.push(data);
                    if ((graphArray.length - 1) == i) {
                        this.loading = false;
                        this.loadingModal.dismiss();
                    }
                }
            }
            this.ahttp.post(
                this.settingsService.baseAddress + '/get-reacts',
                {'txn_ids': ids_to_get}
            )
            .subscribe((res) => {
                var data = JSON.parse(res['_body']);
                this.reacts = data;
            });
            this.ahttp.post(
                this.settingsService.baseAddress + '/get-comments',
                {'txn_ids': ids_to_get}
            )
            .subscribe((res) => {
                var data = JSON.parse(res['_body']);
                this.comments = data;
            });
        });
    }

    register() {
        return new Promise((resolve, reject) => {
            var dh = diffiehellman.getDiffieHellman('modp17')
            dh.generateKeys()
            this.walletService.get().then(() => {
                this.ahttp.get(this.settingsService.baseAddress + '/register')
                .subscribe((res) => {
                    var data = JSON.parse(res['_body']);
                    data.private_key = dh.getPrivateKey().toString('hex');
                    data.public_key = dh.getPublicKey().toString('hex');
                    this.getTransaction(data, resolve);
                });
            });
        });
    }

    getTransaction(info, resolve) {
        return this.transactionService.pushTransaction({
            relationship: {
                bulletin_secret: info.bulletin_secret,
                dh_private_key: info.private_key
            },
            dh_public_key: info.public_key,
            requested_rid: info.requested_rid,
            requester_rid: info.requester_rid,
            blockchainurl: this.blockchainAddress,
            callbackurl: info.callbackurl,
            to: info.to,
            resolve: resolve
        });
    }

    sharePhrase() {
        this.socialSharing.share(this.graphService.humanHash, "Add me on Yada Coin!");
    }

    createCode() {
        this.graphService.getGraph().then(() => {
            this.peerService.init();
            this.createdCode = JSON.stringify({
                bulletin_secret: this.bulletinSecretService.bulletin_secret,
                shared_secret: uuid4(),
                to: this.bulletinSecretService.key.getAddress(),
                requested_rid: this.graphService.rid
            });
        });
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

        var dh = diffiehellman.getDiffieHellman('modp17')
        dh.generateKeys()
        info.dh_private_key = dh.getPrivateKey().toString('hex');
        info.dh_public_key = dh.getPublicKey().toString('hex');
        //this.loadingModal = this.loadingCtrl.create({
        //    content: 'Please wait...'
        //});
        //this.loadingModal.present();
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
            }
        });
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
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
                        this.transactionService.pushTransaction({
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
                    });
                }).then((txn) => {
                    ///////////////////////////////////////////////////////////////
                    // this "thenable" is for notifications
                    // here, we notify the recipient of an inbound friend request
                    ///////////////////////////////////////////////////////////////
                    this.loadingModal.dismiss()
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Friend Request Sent');
                    alert.setSubTitle('Your Friend Request has been sent successfully.');
                    alert.addButton('Ok');
                    alert.present();
                    this.refresh();
                    for (var i=0; i < this.graphService.graph.friends.length; i++) {
                        var friend = this.graphService.graph.friends[i];
                        if (this.graphService.graph.rid = friend.rid) {
                          try {
                            friend.relationship = JSON.parse(this.decrypt(friend.relationship));
                            break;
                          } catch(error) {

                          }
                        }
                    }
                    if (!friend) {
                        // no friends, probably a registration, in that case we don't need to notify becuase it is the server.
                        return;
                    }
                    if (!friend.relationship.private_key) {
                        return;
                    }
                    var relationship = JSON.parse(this.decrypt(txn['relationship']));
                    txn['shared_secret'] = relationship.shared_secret;
                    txn['bulletin_secret'] = this.bulletinSecretService.bulletin_secret;
                    txn['accept'] = true;
                    this.ahttp.post(this.settingsService.baseAddress + '/request-notification', {
                        rid: friend.rid,
                        requested_rid: txn['requested_rid'],
                        to: this.bulletinSecretService.key.getAddress(),
                        data: JSON.stringify(txn)
                    }).subscribe(() => {});
                });

                this.peerService.rid = info.requester_rid;
                this.peerService.init();
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

    addPeer() {
        this.peerService.init();
    }

    share(url) {
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
                                postText: url 
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
}
