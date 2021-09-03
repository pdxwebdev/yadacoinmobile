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
        this.refresh(null)
        .then(() => {
            return this.graphService.getInfo()
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                let options = new RequestOptions({ withCredentials: true });
                this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/fcm-token?origin=' + window.location.origin, {
                  rid: this.graphService.graph.rid,
                }, options).subscribe(() => {
                    resolve();
                });
            })
        })
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
      return new Promise((resolve, reject) => {
        let headers = new Headers({'Content-Type': 'application/json'});
        let options = new RequestOptions({headers: headers, withCredentials: true });
        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/fcm-token?origin=' + window.location.origin, {
          rid: this.graphService.graph.rid,
          token: token,
        }, options).subscribe(() => {
            resolve();
        });
      })
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
            this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/unlocked?rid=' + this.graphService.graph.rid + '&id=' + '' + '&username_signature=' + this.bulletinSecretService.username_signature + '&origin=' + window.location.origin, options).subscribe((res) => {
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

    sharePhrase() {
        this.socialSharing.share(this.bulletinSecretService.username, "Add me on Yada Coin!");
    }

    addFriend() {
        var buttons = [];
        buttons.push({
            text: 'Add',
            handler: (data) => {
                this.graphService.addFriend(data.identity);
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
            });
        })
        .then((groupName) => {
            return this.graphService.createGroup(groupName);
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
            if (!groupinvite) throw 'failed to join group';
            let invite = JSON.parse(Base64.decode(groupinvite));
            return this.graphService.addGroup(invite)
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

    signIn() {
        this.loadingModal = this.loadingCtrl.create({
            content: 'Preparing session...'
        });
        this.loadingModal.present();
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
                                signIn: res.json().signin_code
                            },
                            shared_secret: args['shared_secret'],
                            rid: this.graphService.graph.rid
                        }).then((hash) => {
                            this.txnId = this.transactionService.transaction.id;
                            resolve(hash);
                        });                       
                    } catch(err) {
                        reject('failed to generate transaction');
                        this.loadingModal.dismiss().catch(() => {});
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
        }).then(() => {
            this.loadingModal.dismiss().catch(() => {});
        }).catch((err) => {
            alert(err);
            this.loadingModal.dismiss().catch(() => {});
        });
    }

    signInRemote() {
        this.signInCode = shortid.js.generate()
        this.loadingModal = this.loadingCtrl.create({
            content: 'Preparing session...'
        });
        this.txnId = null;
        this.loadingModal.present();
        this.walletService.get().then((signin_code) => {
            return this.graphService.getSharedSecretForRid(this.graphService.graph.rid);
        }).then((args) => {
            return this.transactionService.generateTransaction({
                dh_public_key: args['dh_public_key'],
                dh_private_key: args['dh_private_key'],
                relationship: {
                    signIn: this.signInCode
                },
                shared_secret: args['shared_secret'],
                rid: this.graphService.graph.rid
            });
        }).then(() => {
            return this.transactionService.sendTransaction();
        }).then(() => {
            this.refresh(null);
        }).then(() => {
            this.loadingModal.dismiss().catch(() => {});
        }).catch((err) => {
            alert(err);
            this.loadingModal.dismiss().catch(() => {});
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
