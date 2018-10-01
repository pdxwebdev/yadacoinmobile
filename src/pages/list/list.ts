import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AlertController, LoadingController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ChatPage } from '../chat/chat';

declare var X25519;

@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})
export class ListPage {
  selectedItem: any;
  pageTitle: any;
  icons: string[];
  items: Array<{pageTitle: string, transaction: object}>;
  blockchainAddress: any;
  balance: any;
  baseAddress: any;
  createdCode: any;
  confirmCode: any;
  loading: any;
  loadingBalance: any;
  loadingModal: any;
  createdCodeEncoded: any;
  friend_request: any;
  cryptoGenModal: any;
  context: any;
  signIn: any;
  signInText: any;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private walletService: WalletService,
    private transactionService: TransactionService,
    private socialSharing: SocialSharing,
    private alertCtrl: AlertController,
    public loadingCtrl: LoadingController
  ) {
    this.loadingModal = this.loadingCtrl.create({
        content: 'Please wait...'
    });
    this.cryptoGenModal = this.loadingCtrl.create({
        content: 'Generating encryption, please wait... (could take several minutes)'
    });
    this.refresh(null);

  }

  refresh(refresher) {
    return new Promise((resolve, reject) => {
      this.loading = true;
      this.loadingBalance = true;

      // If we navigated to this page, we will have an item available as a nav param
      this.storage.get('blockchainAddress').then((blockchainAddress) => {
          this.blockchainAddress = blockchainAddress;
      });
      this.storage.get('baseAddress').then((baseAddress) => {
          this.baseAddress = baseAddress;
      });
      this.selectedItem = this.navParams.get('item');
      this.context = this.navParams.get('context');
      this.pageTitle = this.selectedItem ? this.selectedItem.pageTitle : this.navParams.get('pageTitle').title;
      this.refreshWallet();
      if(!this.selectedItem) {
        this.label = this.navParams.get('pageTitle').label;
        // Let's populate this page with some filler content for funzies
        this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
        'american-football', 'boat', 'bluetooth', 'build'];
        if (this.pageTitle == 'Friends') {
          this.graphService.getFriends()
          .then(() => {
            var graphArray = this.graphService.graph.friends;
            graphArray.sort(function (a, b) {
                if (a.username.toLowerCase() < b.username.toLowerCase())
                  return -1
                if ( a.username.toLowerCase() > b.username.toLowerCase())
                  return 1
                return 0
            });
            this.makeList(graphArray);
            this.loading = false;
            resolve();
          });
        } else if (this.pageTitle == 'Messages') {
          var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          this.graphService.getFriends()
          .then(() => {
            this.graphService.getNewMessages()
            .then((graphArray) => {
                var messages = this.markNew(my_public_key, graphArray, this.graphService.new_messages_counts);
                var friendsWithMessagesList = this.getDistinctFriends(messages);
                this.populateRemainingFriends(friendsWithMessagesList.friend_list, friendsWithMessagesList.used_rids);
                this.makeList(friendsWithMessagesList.friend_list);
                this.loading = false;
                resolve();
            });
          })
        } else if (this.pageTitle == 'Sign Ins') {
          var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          this.graphService.getFriends()
          .then(() => {
            this.graphService.getNewSignIns(null)
            .then((graphArray) => {
                var sign_ins = this.markNew(my_public_key, graphArray, this.graphService.new_sign_ins_counts);
                var friendsWithSignInsList = this.getDistinctFriends(sign_ins);
                this.populateRemainingFriends(friendsWithSignInsList.friend_list, friendsWithSignInsList.used_rids);
                this.makeList(friendsWithSignInsList.friend_list);
                this.loading = false;
                resolve();
            });
          })
        } else if (this.pageTitle == 'Friend Requests') {
          this.graphService.getFriendRequests()
          .then(() => {
              var graphArray = this.graphService.graph.friend_requests;
              graphArray.sort(function (a, b) {
                  if (a.username.toLowerCase() < b.username.toLowerCase())
                    return -1
                  if ( a.username.toLowerCase() > b.username.toLowerCase())
                    return 1
                  return 0
              });
              this.makeList(graphArray);
              this.loading = false;
              resolve();
          });
        } else if (this.pageTitle == 'Sent Requests') {
          this.graphService.getSentFriendRequests()
          .then(() => {
              var graphArray = this.graphService.graph.sent_friend_requests;
              graphArray.sort(function (a, b) {
                  if (a.username.toLowerCase() < b.username.toLowerCase())
                    return -1
                  if ( a.username.toLowerCase() > b.username.toLowerCase())
                    return 1
                  return 0
              });
              this.makeList(graphArray);
              this.loading = false;
              resolve();
          });
        } else if (this.pageTitle == 'Reacts Detail') {
          var graphArray = this.navParams.get('detail');
          this.makeList(graphArray);
          this.loading = false;
          resolve();
        }
      } else {
          this.loading = false;
          this.loadingBalance = false;
          if (this.pageTitle == 'Sent Requests') {
          }
          else if (this.pageTitle == 'Friend Requests') {
            this.friend_request = this.navParams.get('item').transaction;
          }
          else if (this.pageTitle == 'Sign Ins') {
            this.rid = this.navParams.get('item').transaction.rid;
            this.graphService.getSignIns(this.rid)
            .then((signIn: any) => {
              this.signIn = signIn[0];
              this.signInText = this.signIn.relationship.signIn;
              if(refresher) refresher.complete();
            });
          }
          resolve();
      }
      this.balance = this.walletService.wallet.balance;
    })
    .then(() => {
      if(refresher) refresher.complete();
    });
  }

  markNew(my_public_key, graphArray, graphCount) {
    var collection = [];
    for (let i in graphArray) {
      if(my_public_key !== graphArray[i]['public_key'] && graphCount[i] && graphCount[i] < graphArray[i]['height']) {
        graphArray[i]['new'] = true;
      }
      collection.push(graphArray[i]);
    }
    return collection;
  }

  getDistinctFriends(collection) {
    // using the rids from new items
    // make a list of friends sorted by block height descending (most recent)
    var friend_list = [];
    var used_rids = [];
    for (var i=0; i < collection.length; i++) {
      // we could have multiple transactions per friendship
      // so make sure we're going using the rid once
      var item = collection[i];
      if(used_rids.indexOf(item.rid) === -1) {
        friend_list.push(item);
        used_rids.push(item.rid);
      }
    }
    return {
      friend_list: friend_list,
      used_rids: used_rids
    };
  }

  populateRemainingFriends(used_rids, friend_list) {
    // now add everyone else
    for (var i=0; i < this.graphService.graph.friends.length; i++) {
      if (used_rids.indexOf(this.graphService.graph.friends[i].rid) === -1) {
        friend_list.push(this.graphService.graph.friends[i]);
        used_rids.push(this.graphService.graph.friends[i].rid);
      }
    }
  }

  makeList(graphArray) {
    this.items = [];
    for (let i = 0; i < graphArray.length; i++) {
      this.items.push({
        pageTitle: this.pageTitle,
        transaction: graphArray[i]
      });
    }
  }

  newChat() {
    var item = {pageTitle: {title:"Friends"}, context: 'newChat'};
    this.navCtrl.push(ListPage, item);
  }

  itemTapped(event, item) {
    if(this.pageTitle == 'Chat') {
      this.navCtrl.push(ChatPage, {
        item: item
      });
    } else if(this.pageTitle == 'Friends' && this.context == 'newChat') {
      this.navCtrl.push(ChatPage, {
        item: item
      });
    } else {
      this.navCtrl.push(ListPage, {
        item: item
      });
    }
  }

  accept() {
    let alert = this.alertCtrl.create();
    alert.setTitle('Approve Transaction');
    alert.setSubTitle('You are about to spend 1.01 coins.');
    alert.addButton({
        text: 'Cancel',
        handler: (data: any) => {
            alert.dismiss();
        }
    });
    alert.addButton({
      text: 'Confirm',
      handler: (data: any) => {
        this.cryptoGenModal.present();
        this.walletService.get().then(() => {
          return new Promise((resolve, reject) => {
            var to = '';
            for (var i=0; i < this.friend_request.outputs.length; i++) {
              var output = this.friend_request.outputs[i];
              if (output.to != this.bulletinSecretService.key.getAddress()) {
                to = output.to;
              }
            }
            var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
            var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
            var dh_private_key = this.toHex(raw_dh_private_key);
            var dh_public_key = this.toHex(raw_dh_public_key);
            this.transactionService.pushTransaction({
              relationship: {
                bulletin_secret: this.friend_request.bulletin_secret,
                dh_private_key: dh_private_key,
                their_username: this.friend_request.username,
                my_username: this.bulletinSecretService.username
              },
              dh_public_key: dh_public_key,
              requested_rid: this.friend_request.requested_rid,
              requester_rid: this.friend_request.requester_rid,
              to: to,
              blockchainurl: this.blockchainAddress,
              resolve: resolve
            });
          });
        }).then((txn) => {
          this.cryptoGenModal.dismiss();
          var alert = this.alertCtrl.create();
          alert.setTitle('Friend Accept Sent');
          alert.setSubTitle('Your Friend Request acceptance has been submitted successfully.');
          alert.addButton('Ok');
          alert.present();
          
          this.refresh(null).then(() => {
            this.navCtrl.pop();
          });
        });
      }
    });
    alert.present();
  }

  sendSignIn() {
    let alert = this.alertCtrl.create();
    alert.setTitle('Approve transaction');
    alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
    alert.addButton('Cancel');
    alert.addButton({
      text: 'Confirm',
      handler: (data: any) => {
        this.cryptoGenModal = this.loadingCtrl.create({
          content: 'Generating encryption, please wait... (could take several minutes)'
        });
        this.cryptoGenModal.present();
        this.walletService.get().then(() => {
          return new Promise((resolve, reject) => {
            this.graphService.getFriends()
            .then(() => {
              var dh_public_key = this.graphService.keys[this.rid].dh_public_keys[0];
              var dh_private_key = this.graphService.keys[this.rid].dh_private_keys[0];

              if(dh_public_key && dh_private_key) {
                var key = 'shared_secret-' + this.rid + '|' + dh_public_key.slice(0, 26) + dh_private_key.slice(0, 26);
                if (this.graphService.stored_secrets[key]) {
                  var shared_secret = this.graphService.stored_secrets[key];
                } else {
                  var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
                  return parseInt(h, 16)
                  }));
                  var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
                  return parseInt(h, 16)
                  }));
                  shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
                  this.storage.set('shared_secret-' + dh_public_key.substr(0, 26) + dh_private_key.substr(0, 26), shared_secret);

                }
                // camera permission was granted
                this.transactionService.pushTransaction({
                  dh_public_key: dh_public_key,
                  dh_private_key: dh_private_key,
                  relationship: {
                    signIn: this.signIn.relationship.signIn 
                  },
                  shared_secret: shared_secret,
                  blockchainurl: this.blockchainAddress,
                  resolve: resolve,
                  rid: this.rid
                });
              } else {
                let alert = this.alertCtrl.create();
                alert.setTitle('Friendship not yet processed');
                alert.setSubTitle('Please wait a few minutes and try again');
                alert.addButton('Ok');
                alert.present();
                resolve(false);          
              }
            });
          });
        }).then((result) => {
          this.cryptoGenModal.dismiss();
          if (result) {
            let alert = this.alertCtrl.create();
            alert.setTitle('Message sent');
            alert.setSubTitle('Your message has been sent successfully');
            alert.addButton('Ok');
            alert.present();
          }
          this.navCtrl.pop();
        });
       }
    });
    alert.present();
  }
  refreshWallet() {
     this.loadingBalance = true;
     this.walletService.get()
     .then(() => {
         this.loadingBalance = false;
         this.balance = this.walletService.wallet.balance;
     });
  }

  share(code) {
    this.socialSharing.share(code);
  }

  showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
  }

  showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
  }

  toHex(byteArray) {
    var callback = function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }
    return Array.from(byteArray, callback).join('')
  }
}
