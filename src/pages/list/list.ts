import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AlertController, LoadingController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { PeerService } from '../../app/peer.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { SettingsService } from '../../app/settings.service';
import { TransactionService } from '../../app/transaction.service';
import { HTTP } from '@ionic-native/http';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ChatPage } from '../chat/chat';

declare var forge;
declare var foobar;
declare var uuid4;

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
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private graphService: GraphService,
    private peerService: PeerService,
    private bulletinSecretService: BulletinSecretService,
    private walletService: WalletService,
    private transactionService: TransactionService,
    private http: HTTP,
    private socialSharing: SocialSharing,
    private settingsService: SettingsService,
    private alertCtrl: AlertController,
    public loadingCtrl: LoadingController
  ) {
    this.refresh();
  }

  refresh() {

    this.loading = true;
    this.loadingBalance = true;
    this.loadingModal = this.loadingCtrl.create({
        content: 'Please wait...'
    });

    // If we navigated to this page, we will have an item available as a nav param
    this.storage.get('blockchainAddress').then((blockchainAddress) => {
        this.blockchainAddress = blockchainAddress;
    });
    this.storage.get('baseAddress').then((baseAddress) => {
        this.baseAddress = baseAddress;
    });
    this.selectedItem = this.navParams.get('item');
    var pageTitle = this.selectedItem ? this.selectedItem.pageTitle : this.navParams.get('pageTitle').title;
    this.pageTitle = pageTitle;
    if(!this.selectedItem) {
      // Let's populate this page with some filler content for funzies
      this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
      'american-football', 'boat', 'bluetooth', 'build'];

      this.graphService.getGraph()
      .then(() => {
        this.loading = false;
        if (pageTitle == 'Friends') {
            var graphArray = this.graphService.graph.friends
        } else if (pageTitle == 'Chat') {
            var graphArray = this.graphService.graph.friends
        } else if (pageTitle == 'Friend Requests') {
            var graphArray = this.graphService.graph.friend_requests
        } else if (pageTitle == 'Sent Requests') {
            var graphArray = this.graphService.graph.sent_friend_requests
        }
        this.items = [];
        for (let i = 0; i < graphArray.length; i++) {
          this.items.push({
            pageTitle: pageTitle,
            transaction: graphArray[i]
          });
        }
      });
      this.refreshWallet();
    } else {
        this.loading = false;
        this.loadingBalance = false;
        if (pageTitle == 'Sent Requests') {
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
            this.createdCodeEncoded = 'http://71.237.161.227:5000/deeplink?txn=' + encodeURIComponent(this.createdCode);
        }
        else if (pageTitle == 'Friend Requests') {
          var friend_requests = {};
          this.storage.forEach((value, key) => {
            if (key.substr(0, 'friend_request'.length) === 'friend_request') {
              try {
                var parsed = JSON.parse(value);
                if (key.substr('friend_request-'.length) === this.navParams.get('item').transaction.requester_rid+this.navParams.get('item').transaction.requested_rid) {
                  this.friend_request = parsed;
                }
              } catch(error) {

              }
            }
          });
        }
    }
    this.balance = this.walletService.wallet.balance;
  }

  itemTapped(event, item) {
    if(this.pageTitle == 'Chat') {
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
    alert.setSubTitle('You are about to spend 2.02 coins.');
    alert.addButton({
        text: 'Cancel',
        handler: (data: any) => {
            this.loadingModal.dismiss();
        }
    });
    alert.addButton({
      text: 'Confirm',
      handler: (data: any) => {
        this.loadingModal.present();
        this.walletService.get().then(() => {
          return new Promise((resolve, reject) => {
            this.transactionService.pushTransaction({
              relationship: {
                bulletin_secret: this.friend_request.bulletin_secret,
                shared_secret: this.friend_request.shared_secret
              },
              requested_rid: this.friend_request.requested_rid,
              requester_rid: this.friend_request.requester_rid,
              to: this.friend_request.to,
              blockchainurl: this.blockchainAddress,
              confirm_friend: false,
              resolve: resolve
            });
          });
        }).then((txn) => {
          return new Promise((resolve, reject) => {
            this.transactionService.pushTransaction({
              relationship: {
                bulletin_secret: this.friend_request.bulletin_secret,
                shared_secret: this.friend_request.shared_secret
              },
              requested_rid: this.friend_request.requested_rid,
              requester_rid: this.friend_request.requester_rid,
              to: this.friend_request.to,
              blockchainurl: this.blockchainAddress,
              confirm_friend: true,
              unspent_transaction: txn,
              resolve: resolve
            });
          });
        }).then((txn) => {
          this.loadingModal.dismiss();
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

  sendFriendRequestNotification(txn) {
    for (var i=0; i < this.graphService.graph.friends.length; i++) {
        var friend = this.graphService.graph.friends[i];
        if (this.graphService.graph.rid = friend.rid) {
          try {
            if (friend.relationship.shared_secret) {
                break;
            }
            friend.relationship = JSON.parse(this.bulletinSecretService.decrypt(friend.relationship));
            break;
          } catch(error) {

          }
        }
    }
    if (!friend.relationship.shared_secret) {
        return;
    }
    var txn = JSON.parse(txn);
    this.http.post(this.settingsService.baseAddress + '/request-notification', {
        rid: friend.rid,
        shared_secret: friend.relationship.shared_secret,
        requested_rid: txn['requested_rid'],
        data: JSON.stringify(txn)
    }, {'Content-Type': 'application/json'});
  }

  refreshWallet() {
     this.loadingBalance = true;;
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
}
