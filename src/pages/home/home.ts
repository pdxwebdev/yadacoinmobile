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

declare var forge;
declare var X25519;
declare var firebase;
declare var foobar;
declare var Base64;

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
    searchTerm: any;;
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
        this.prefix = 'usernames-';
        this.refresh(null)
        .then(() => {
            if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
            return this.firebaseService.initFirebase();
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
                try {
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
                    return messaging.getToken().then((currentToken) => {
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
                } catch(err) {

                }
            }
        });
    }

    myForm = new FormGroup({
        searchTerm: new FormControl('', [Validators.required])
    })
    

    go() {
        return this.peerService.go()
        .then(() => {
            return this.refresh(null);
        });
    }

    submit() {
        if (!this.myForm.valid) return false;
        this.navCtrl.push(ProfilePage, {item: this.myForm.value.searchTerm});
        console.log(this.myForm.value.searchTerm)
    }

    sendTokenToServer(token) {
      this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/fcm-token', {
        rid: this.graphService.graph.rid,
        token: token,
      }).subscribe(() => {});
    }

    updateUIForPushEnabled(token) {

    }

    updateUIForPushPermissionRequired() {

    }

    react(e, item) {
        this.toggled[item.id] = false;
        return this.walletService.get()
        .then(() => {
            return this.transactionService.generateTransaction({
                relationship: {
                    'react': e.char,
                    'id': item.id,
                    'bulletin_secret': this.bulletinSecretService.bulletin_secret
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

    comment(item) {
        if (!this.commentInputs[item.id]) {
            alert('Comment cannot be empty.');
            return;
        }
        return this.walletService.get()
        .then(() => {
            return this.transactionService.generateTransaction({
                relationship: {
                    'comment': this.commentInputs[item.id],
                    'id': item.id,
                    'bulletin_secret': this.bulletinSecretService.bulletin_secret
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
                message: 'Comment posted',
                duration: 2000
            });
            return toast.present();
        })
        .then(() => {
            this.graphService.getComments(this.ids_to_get);
        })
        .then(() => {
            this.commentInputs[item.id] = '';
        })
        .catch((err) => {
            const toast = this.toastCtrl.create({
                message: 'Something went wrong with your comment!',
                duration: 2000
            });
            toast.present();  
        });
    }

    commentReact(e, item) {
        this.toggled[item.id] = false;
        return this.walletService.get()
        .then(() => {
            return this.transactionService.generateTransaction({
                relationship: {
                    'react': e.char,
                    'id': item.id,
                    'bulletin_secret': this.bulletinSecretService.bulletin_secret
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
                message: 'Comment react sent',
                duration: 2000
            });
            return toast.present();
        })
        .then(() => {
            for (var i=0; i < Object.keys(this.graphService.graph.comments).length; i++) {
                for (var j=0; j < this.graphService.graph.comments[Object.keys(this.graphService.graph.comments)[i]].length; j++) {
                    this.comment_ids_to_get.push(this.graphService.graph.comments[Object.keys(this.graphService.graph.comments)[i]][j].id);
                }
            }
            return this.graphService.getCommentReacts(this.comment_ids_to_get);
        })
        .then(() => {
            this.graphService.getCommentReacts(this.comment_ids_to_get)
        })
        .catch((err) => {
            const toast = this.toastCtrl.create({
                message: 'Something went wrong with your react!',
                duration: 2000
            });
            toast.present();  
        });
    }

    commentReplies(item) {
        if (!this.commentInputs[item.id]) {
            alert('Comment cannot be empty.');
            return;
        }
        return this.walletService.get()
        .then(() => {
            return this.transactionService.generateTransaction({
                relationship: {
                    'comment': this.commentInputs[item.id],
                    'id': item.id,
                    'bulletin_secret': this.bulletinSecretService.bulletin_secret
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
                message: 'Comment posted',
                duration: 2000
            });
            return toast.present();
        })
        .then(() => {
            for (var i=0; i < Object.keys(this.graphService.graph.comments).length; i++) {
                for (var j=0; j < this.graphService.graph.comments[Object.keys(this.graphService.graph.comments)[i]].length; j++) {
                    this.comment_ids_to_get.push(this.graphService.graph.comments[Object.keys(this.graphService.graph.comments)[i]][j].id);
                }
            }
            return this.graphService.getCommentReacts(this.comment_ids_to_get);
        })
        .then(() => {
            this.graphService.getCommentReplies(this.comment_ids_to_get)
        })
        .catch((err) => {
            const toast = this.toastCtrl.create({
                message: 'Something went wrong with your comment!',
                duration: 2000
            });
            toast.present();  
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
        var data = {pageTitle: {title:"Reacts Detail"}, detail: this.graphService.graph.reacts[item.id]};
        this.navCtrl.push(ListPage, data);
    }

    commentReactsDetail(item) {
        var data = {pageTitle: {title:"Comment Reacts Detail"}, detail: this.graphService.graph.commentReacts[item.id]};
        this.navCtrl.push(ListPage, data);
    }

    refresh(refresher) {
        this.loading = true;
        this.loadingBalance = true;

        // this.loadingModal = this.loadingCtrl.create({
        //     content: 'Please wait...'
        // });
        // this.loadingModal.present();
        // this.storage.get('blockchainAddress').then((blockchainAddress) => {
        //     this.blockchainAddress = blockchainAddress;
        // });
        //put ourselves in the faucet
        /*
        this.ahttp.get(
            this.settingsService.remoteSettings['baseUrl'] + '/faucet?address=' + this.bulletinSecretService.key.getAddress()
        )
        .subscribe(()=>{}, () => {});
        */
        this.color = this.graphService.friend_request_count > 0 ? 'danger' : '';
        this.friendRequestColor = this.graphService.friend_request_count > 0 ? 'danger' : '';
        this.chatColor = this.graphService.new_messages_count > 0 ? 'danger' : '';
        this.signInColor = this.graphService.new_sign_ins_count > 0 ? 'danger' : '';
        //update our wallet
        /*
        return this.walletService.get()
        .then(() => {
            this.balance = this.walletService.wallet.balance;
            this.txnId = '';
            for(var i=0; i < this.walletService.wallet.txns_for_fastgraph.length; i++) {
                var txn = this.walletService.wallet.txns_for_fastgraph[i];
                if ((txn.signatures) && txn.rid == this.graphService.graph.rid) {
                    this.txnId = txn.id; // will always select the wrong txn id
                }
            }
            this.loadingBalance = false;;
            let headers = new Headers();
            headers.append('Authorization', 'Bearer ' + this.settingsService.tokens[this.bulletinSecretService.keyname]);
            let options = new RequestOptions({ headers: headers, withCredentials: true });
            this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/unlocked?rid=' + this.graphService.graph.rid + '&id=' + '' + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret + '&origin=' + window.location.origin, options).subscribe((res) => {
                var data = JSON.parse(res['_body']);
                this.signedIn = data.authenticated;
            });
        })
        .then(() => {
            return this.graphService.getFriends()
        })
        .then(() => {
            return this.graphService.getNewMessages()
        })
        .then(() => {
            return this.graphService.getNewSignIns();
        })
        .then(() => {
            return this.graphService.getNewGroupMessages();
        })
        .then(() => {
            return this.generateFeed();
        })
        .then(() => {
            return this.graphService.getReacts(this.ids_to_get);
        })
        .then(() => {
            return this.graphService.getComments(this.ids_to_get);
        })
        .then(() => {
            for (var i=0; i < Object.keys(this.graphService.graph.comments).length; i++) {
                for (var j=0; j < this.graphService.graph.comments[Object.keys(this.graphService.graph.comments)[i]].length; j++) {
                    this.comment_ids_to_get.push(this.graphService.graph.comments[Object.keys(this.graphService.graph.comments)[i]][j].id);
                }
            }
            return this.graphService.getCommentReacts(this.comment_ids_to_get);
        })
        .then(() => {
            return this.graphService.getCommentReplies(this.comment_ids_to_get);
        })
        .then(() => {
            this.loading = false;
            this.loadingModal.dismiss().catch(() => {});
            if(refresher) refresher.complete();
            this.chatColor = this.graphService.new_messages_count > 0 ? 'danger' : '';
            this.chatColor = this.graphService.new_sign_ins_count > 0 ? 'danger' : '';
        })
        .catch(() => {
            this.loading = false;
            this.loadingModal.dismiss().catch(() => {});
        });
        */
        this.loading = false;
    //    this.loadingModal.dismiss().catch(() => {});
       return new Promise((resolve, reject) => {
           return resolve();
       })
    }

    search() {
        return this.ahttp.get(
            this.settingsService.remoteSettings['baseUrl'] + '/search?searchTerm=' + this.searchTerm
        )
        .subscribe((res)=>{
            this.searchResults = res.json()
        }, () => {});
    }

    generateFeed() {
        return new Promise((resolve, reject) => {
            ////////////////////////////////////////////
            // all friend post operations
            ////////////////////////////////////////////
            var graphArray = this.graphService.graph.posts;
            if (graphArray.length == 0) {
                this.loading = false;
                this.loadingModal.dismiss().catch(() => {});
            }
            graphArray.sort(function (a, b) {
                if (parseInt(a.time) < parseInt(b.time))
                    return 1
                if (parseInt(a.time) > parseInt(b.time))
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
                            data['username'] = graphArray[i].username;
                            this.items.push(data);
                            if ((graphArray.length - 1) == i) {
                                this.loading = false;
                                this.loadingModal.dismiss().catch(() => {});
                            }
                        });
                    } else {
                        this.openGraphParserService.parseFromUrl(this.settingsService.remoteSettings['baseUrl'] + '/get-url?url=' + encodeURIComponent(graphArray[i].relationship.postText)).then((data) => {
                            data['id'] = graphArray[i].id;
                            data['username'] = graphArray[i].username;
                            this.items.push(data);
                            if ((graphArray.length - 1) == i) {
                                this.loading = false;
                                this.loadingModal.dismiss().catch(() => {});
                            }
                        });
                    }
                } else {
                    var data = {
                        username: graphArray[i].username,
                        title: '',
                        description: graphArray[i].relationship.postText,
                        id: graphArray[i].id
                    };
                    if (graphArray[i].relationship.postFileName) {
                        data['fileName'] = graphArray[i].relationship.postFileName;
                        data['fileData'] = graphArray[i].relationship.postFile;
                    }
                    this.items.push(data);
                    if ((graphArray.length - 1) == i) {
                        this.loading = false;
                        this.loadingModal.dismiss().catch(() => {});
                    }
                }
            }
            resolve();
        });
    }

    download(item) {
        this.ahttp.post(
            this.settingsService.remoteSettings['baseUrl'] + '/renter/loadasciidd',
            {'asciisia': item.fileData}
        )
        .subscribe((res) => {
            alert('File can now be found in your sia files');
        },
        (err) => {
            alert('File can now be found in your sia files');
        });
    }

    register() {
        return new Promise((resolve, reject) => {
            this.walletService.get().then(() => {
                this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/register')
                .subscribe((res) => {
                    var data = JSON.parse(res['_body']);
                    var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                    var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                    var dh_private_key = this.toHex(raw_dh_private_key);
                    var dh_public_key = this.toHex(raw_dh_public_key);
                    data.dh_private_key = dh_private_key;
                    data.dh_public_key = dh_public_key;
                    var hash = this.getTransaction(data, resolve);
                    resolve(hash);
                });
            });
        }) // we cannot do fastgraph registrations. The signing process verifies a relationship. So one must already exist.
        .then((hash) => {
            return this.transactionService.sendTransaction();
        })
        .then(() => {
            return this.transactionService.sendCallback();
        })
        .then(() => {
            this.refresh(null);
        })
        .catch(() => {
            alert('error registering');
            this.loadingModal.dismiss().catch(() => {});
        });
    }

    getTransaction(info, resolve) {
        return this.transactionService.generateTransaction({
            relationship: {
                dh_private_key: info.dh_private_key,
                their_bulletin_secret: info.bulletin_secret,
                their_username: info.username,
                my_bulletin_secret: this.bulletinSecretService.bulletin_secret,
                my_username: this.bulletinSecretService.username
            },
            dh_public_key: info.dh_public_key,
            requested_rid: info.requested_rid,
            requester_rid: info.requester_rid,
            callbackurl: info.callbackurl,
            to: info.to,
            resolve: resolve
        });
    }

    sharePhrase() {
        this.socialSharing.share(this.bulletinSecretService.username, "Add me on Yada Coin!");
    }

    addFriend() {
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                this.pasteFriend(data.phrase);
            }
        });
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

    createGroup() {
        this.graphService.getInfo()
        .then(() => {
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
        })
        .then((groupname) => {
            return new Promise((resolve, reject) => {
                if (!groupname) return reject();

                let key = foobar.bitcoin.ECPair.makeRandom();
                let wif = key.toWIF();
                let pubKey = key.getPublicKeyBuffer().toString('hex');
                let address = key.getAddress();
                let bulletin_secret = foobar.base64.fromByteArray(key.sign(foobar.bitcoin.crypto.sha256(groupname)).toDER());
                var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                var dh_private_key = this.toHex(raw_dh_private_key);
                var dh_public_key = this.toHex(raw_dh_public_key);
                resolve({
                    their_public_key: pubKey,
                    their_address: address,
                    their_bulletin_secret: bulletin_secret,
                    their_username: groupname,
                    wif: wif,
                    dh_public_key: dh_public_key,
                    dh_private_key: dh_private_key
                });
            });
        })
        .then((info: any) => {
            var bulletin_secrets = [this.graphService.graph.bulletin_secret, info.their_bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            var requested_rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
            return this.transactionService.generateTransaction({
                relationship: {
                    dh_private_key: info.dh_private_key,
                    their_bulletin_secret: info.their_bulletin_secret,
                    their_public_key: info.their_public_key,
                    their_username: info.their_username,
                    their_address: info.their_address,
                    my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                    my_username: this.bulletinSecretService.username,
                    wif: info.wif,
                    group: true
                },
                dh_public_key: info.dh_public_key,
                to: info.their_address,
                requester_rid: this.graphService.graph.rid,
                requested_rid: requested_rid
            })
        
        }).then((txn) => {
            return this.transactionService.sendTransaction();
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
            console.log(err);
            this.events.publish('pages');
        });
    }

    joinGroup() {
        new Promise((resolve, reject) => {
            let alert = this.alertCtrl.create();
            alert.setTitle('Join');
            alert.setSubTitle('Copy and paste the entire string of characters from the invite');
            alert.addButton({
                text: 'Join',
                handler: data => {
                    const toast = this.toastCtrl.create({
                        message: 'Group joined!',
                        duration: 2000
                    });
                    toast.present();
                    resolve(data.groupinvite);
                }
            });
            alert.addInput({
                type: 'text',
                placeholder: 'Past invite characters',
                name: 'groupinvite'
            })
            alert.present();
        })
        .then((groupinvite) => {
            return new Promise((resolve, reject) => {
                if (!groupinvite) return reject();
                let invite = JSON.parse(Base64.decode(groupinvite));
                var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                var dh_private_key = this.toHex(raw_dh_private_key);
                var dh_public_key = this.toHex(raw_dh_public_key);
                resolve({
                    their_address: invite.their_address,
                    their_public_key: invite.their_public_key,
                    their_bulletin_secret: invite.their_bulletin_secret,
                    their_username: invite.their_username,
                    dh_public_key: dh_public_key,
                    dh_private_key: dh_private_key,
                    requested_rid: invite.requested_rid
                })
            });
        })
        .then((info: any) => {
            return this.transactionService.generateTransaction({
                relationship: {
                    dh_private_key: info.dh_private_key,
                    my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                    my_username: this.bulletinSecretService.username,
                    their_address: info.their_address,
                    their_public_key: info.their_public_key,
                    their_bulletin_secret: info.their_bulletin_secret,
                    their_username: info.their_username,
                    group: true
                },
                requester_rid: info.requester_rid,
                requested_rid: info.requested_rid,
                dh_public_key: info.dh_public_key,
                to: info.their_address
            })
        
        }).then((txn) => {
            return this.transactionService.sendTransaction();
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
    }

    unlockWallet() {
        return new Promise((resolve, reject) => {
            let alert = this.alertCtrl.create({
                title: 'Paste the private key or WIF of the server.',
                inputs: [
                {
                    name: 'key_or_wif',
                    placeholder: 'Private key or WIF',
                    type: 'password'
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
                    text: 'Unlock',
                    handler: data => {
                        let options = new RequestOptions({ withCredentials: true });
                        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/unlock?origin=' + encodeURIComponent(window.location.origin), {key_or_wif: data.key_or_wif}, options)
                        .subscribe((res) => {
                            this.settingsService.tokens[this.bulletinSecretService.keyname] = res.json()['token']
                            const toast = this.toastCtrl.create({
                                message: 'Wallet unlocked',
                                duration: 2000
                            });
                            toast.present();
                            resolve(res);
                        },
                        (err) => {
                            reject(data.key_or_wif);
                        });
                    }
                }
                ]
            });
            alert.present();
        }).catch(() => {
          console.log('canceled unlock')  
        });
    }

    pasteFriend(phrase) {
        //this.loadingModal2 = this.loadingCtrl.create({
        //    content: 'Please wait...'
        //});
        //this.loadingModal.present();
        this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/search?phrase=' + phrase + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
        .subscribe((res) => {
            //this.loadingModal2.dismiss();
            this.alertRoutine(JSON.parse(res['_body']));
        },
        (err) => {
            //this.loadingModal2.dismiss();
            alert('Username not found.');
        });
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
                    this.loadingModal.dismiss().catch(() => {});
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
                this.loadingModal.dismiss().catch(() => {});
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
                } else {
                    requester_rid = '';
                    requested_rid = '';
                }
                //////////////////////////////////////////////////////////////////////////
                // create and send transaction to create the relationship on the blockchain
                //////////////////////////////////////////////////////////////////////////
                this.walletService.get().then(() => {
                    var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
                    var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
                    var dh_private_key = this.toHex(raw_dh_private_key);
                    var dh_public_key = this.toHex(raw_dh_public_key);
                    info.dh_private_key = dh_private_key;
                    info.dh_public_key = dh_public_key;
                    return this.transactionService.generateTransaction({
                        relationship: {
                            dh_private_key: info.dh_private_key,
                            their_bulletin_secret: info.bulletin_secret,
                            their_username: info.username,
                            my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                            my_username: this.bulletinSecretService.username
                        },
                        dh_public_key: info.dh_public_key,
                        requested_rid: info.requested_rid,
                        requester_rid: info.requester_rid,
                        to: info.to
                    });
                }).then((hash) => {
                    return new Promise((resolve, reject) => {
                        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sign-raw-transaction', {
                            hash: hash, 
                            bulletin_secret: this.bulletinSecretService.bulletin_secret,
                            input: this.transactionService.transaction.inputs[0].id,
                            id: this.transactionService.transaction.id,
                            txn: this.transactionService.transaction
                        })
                        .subscribe((res) => {
                            //this.loadingModal2.dismiss();
                            try {
                                let data = res.json();
                                this.transactionService.transaction.signatures = [data.signature]
                                resolve();
                            } catch(err) {
                                reject();
                                this.loadingModal.dismiss().catch(() => {});
                            }
                        },
                        (err) => {
                            //this.loadingModal2.dismiss();
                        });
                    });
                }).then((txn) => {
                    return this.transactionService.sendTransaction();
                }).then((txn) => {
                    this.loadingModal.dismiss().catch(() => {})
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Friend Request Sent');
                    alert.setSubTitle('Your Friend Request has been sent successfully.');
                    alert.addButton('Ok');
                    alert.present();
                }).catch((err) => {
                    console.log(err);
                });
            }
        });
        alert.present();
    }

    alertRoutineForMessage(info) {
        if (this.walletService.wallet.balance < 0.01) {
            let alert = this.alertCtrl.create();
            alert.setTitle('Insuficient Funds');
            alert.setSubTitle('You need at least 1.01 YadaCoins');
            alert.addButton('OK');
            alert.present();
            return
        }
        let alert = this.alertCtrl.create();
        alert.setTitle('Approve Transaction');
        alert.setSubTitle('You are about to spend 0.01 coins (0.01 fee)');
        alert.addButton({
            text: 'Cancel',
            handler: (data: any) => {
                this.loadingModal.dismiss().catch(() => {});
            }
        });
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                //////////////////////////////////////////////////////////////////////////
                // create and send transaction to create the relationship on the blockchain
                //////////////////////////////////////////////////////////////////////////
                this.walletService.get().then((txn) => {
                    return new Promise((resolve, reject) => {
                        var hash = this.transactionService.generateTransaction({
                            dh_public_key: info.dh_public_key,
                            dh_private_key: info.dh_private_key,
                            relationship: {
                                signIn: info.relationship.signIn
                            },
                            shared_secret: info.shared_secret,
                            resolve: resolve,
                            rid: info.rid
                        });
                        if(hash) {
                            resolve(hash);
                        } else {
                            reject('could not generate hash');
                        }
                    });
                }).then((hash) => {
                    return new Promise((resolve, reject) => {
                        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sign-raw-transaction', {
                            hash: hash, 
                            bulletin_secret: this.bulletinSecretService.bulletin_secret,
                            input: this.transactionService.transaction.inputs[0].id,
                            id: this.transactionService.transaction.id,
                            txn: this.transactionService.transaction
                        })
                        .subscribe((res) => {
                            //this.loadingModal2.dismiss();
                            try {
                                let data = res.json();
                                this.transactionService.transaction.signatures = [data.signature]
                                resolve();
                            } catch(err) {
                                reject();
                                this.loadingModal.dismiss().catch(() => {});
                            }
                        },
                        (err) => {
                            //this.loadingModal2.dismiss();
                        });
                    });
                }).then(() => {
                    return this.transactionService.sendTransaction();
                }).then(() => {
                    return this.transactionService.sendCallback();
                }).then((txn) => {
                    this.loadingModal.dismiss().catch(() => {})
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Friend Request Sent');
                    alert.setSubTitle('Your Friend Request has been sent successfully.');
                    alert.addButton('Ok');
                    alert.present();
                }).catch((err) => {
                    //alert('transaction error');
                    this.loadingModal.dismiss().catch(() => {});
                });
            }
        });
        alert.present();
    }

    signIn() {
        this.walletService.get().then((signin_code) => {
            return this.graphService.getSharedSecretForRid(this.graphService.graph.rid);
        }).then((args) => {
            return new Promise((resolve, reject) => {
                let options = new RequestOptions({ withCredentials: true });
                this.ahttp.get(this.settingsService.remoteSettings['loginUrl'] + '?origin=' + window.location.origin, options)
                .subscribe((res) => {
                    try {
                        return this.transactionService.generateTransaction({
                            dh_public_key: args['dh_public_key'],
                            dh_private_key: args['dh_private_key'],
                            relationship: {
                                signIn: JSON.parse(res['_body']).signin_code
                            },
                            shared_secret: args['shared_secret'],
                            rid: this.graphService.graph.rid
                        }).then((hash) => {
                            this.txnId = this.transactionService.transaction.id;
                            resolve(hash);
                        });                       
                    } catch(err) {
                        reject();
                        this.loadingModal.dismiss().catch(() => {});
                    }
                },
                (err) => {
                });
            });
        }).then((hash) => {
            return new Promise((resolve, reject) => {
                this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sign-raw-transaction', {
                    hash: hash,
                    bulletin_secret: this.bulletinSecretService.bulletin_secret,
                    input: this.transactionService.transaction.inputs[0].id,
                    id: this.transactionService.transaction.id,
                    txn: this.transactionService.transaction
                })
                .subscribe((res) => {
                    try {
                        let data = res.json();
                        this.transactionService.transaction.signatures = [data.signature]
                        resolve();
                    } catch(err) {
                        reject();
                    }
                },
                (err) => {
                });
            });
        }).then(() => {
            return this.transactionService.sendTransaction();
        }).then(() => {
            this.signedIn = true;
            this.refresh(null);
        }).catch((err) => {
            alert(err);
        });
    }

    itemTapped(event, item) {
        item.pageTitle = "Posts";
        this.navCtrl.push(ListPage, {
            item: item
        });
    }

    presentModal() {
        let modal = this.modalCtrl.create(PostModal, {blockchainAddress: this.settingsService.remoteSettings['baseUrl'], logicalParent: this});
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
                        this.transactionService.generateTransaction({
                            relationship: {
                                postText: item.url || item.description
                            },
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
