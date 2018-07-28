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
        } else if (this.pageTitle == 'Chat') {
          var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          this.graphService.getMessages(null)
          .then((graphArray) => {
              var messages = [];
              for (let i in graphArray) {
                for (var j=0; j < graphArray[i].length; j++) {
                  if(my_public_key !== graphArray[i][j]['public_key'] && this.graphService.new_messages_counts[i] && this.graphService.new_messages_counts[i] < graphArray[i][j]['height']) {
                    graphArray[i][j]['new'] = true;
                  }
                  messages.push(graphArray[i][j]);
                }
              }
              messages.sort(function (a, b) {
                if (a.height > b.height)
                  return -1
                if ( a.height < b.height)
                  return 1
                return 0
              });
              var friend_list = [];
              var used_rids = [];
              for (var i=0; i < messages.length; i++) {
                var message = messages[i];
                if(used_rids.indexOf(message.rid) === -1) {
                  friend_list.push(message);
                  used_rids.push(message.rid);
                }
              }

              this.graphService.graph.friends.sort(function (a, b) {
                if (a.username < b.username)
                  return -1
                if ( a.username > b.username)
                  return 1
                return 0
              });
              for (i=0; i < this.graphService.graph.friends.length; i++) {
                if (used_rids.indexOf(this.graphService.graph.friends[i].rid) === -1) {
                  friend_list.push(this.graphService.graph.friends[i]);
                  used_rids.push(this.graphService.graph.friends[i].rid);
                }
              }
              this.makeList(friend_list);
              this.loading = false;
              resolve();
          });
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
              var decrypted = this.bulletinSecretService.decrypt(this.selectedItem.transaction.relationship);
              var relationship = JSON.parse(decrypted);
              this.createdCode = JSON.stringify({
                  bulletin_secret: this.bulletinSecretService.bulletin_secret,
                  shared_secret: relationship.shared_secret,
                  to: this.bulletinSecretService.key.getAddress(),
                  requested_rid: this.selectedItem.transaction.requested_rid,
                  requester_rid: this.graphService.graph.rid,
                  accept: true
              });
              this.createdCodeEncoded = 'https://yadacoin.io/deeplink?txn=' + encodeURIComponent(this.createdCode);
          }
          else if (this.pageTitle == 'Friend Requests') {
            this.friend_request = this.navParams.get('item').transaction;
          }
          resolve();
      }
      this.balance = this.walletService.wallet.balance;
    })
    .then(() => {
      if(refresher) refresher.complete();
    });
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
                dh_private_key: dh_private_key
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
