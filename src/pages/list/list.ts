import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Transaction } from '../transaction/transaction';
import { GraphService } from '../../app/graph.service';
import { PeerService } from '../../app/peer.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { HTTP } from '@ionic-native/http';


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
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private graphService: GraphService,
    private peerService: PeerService,
    private bulletinSecretService: BulletinSecretService,
    private walletService: WalletService,
    private http: HTTP
  ) {

    // If we navigated to this page, we will have an item available as a nav param
      this.storage.get('blockchainAddress').then((blockchainAddress) => {
          this.blockchainAddress = blockchainAddress;
      });
      this.storage.get('baseAddress').then((baseAddress) => {
          this.baseAddress = baseAddress;
      });
    this.selectedItem = navParams.get('item');
    var pageTitle = this.selectedItem ? this.selectedItem.pageTitle : navParams.get('pageTitle').title;
    this.pageTitle = pageTitle;
    if(!this.selectedItem) {
      // Let's populate this page with some filler content for funzies
      this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
      'american-football', 'boat', 'bluetooth', 'build'];

      graphService.getGraph().then(() => {
        if (pageTitle == 'Friends') {
            var graphArray = graphService.graph.friends
        } else if (pageTitle == 'Friend Requests') {
            var graphArray = graphService.graph.friend_requests
        } else if (pageTitle == 'Sent Requests') {
            var graphArray = graphService.graph.sent_friend_requests
        } else if (pageTitle == 'Posts') {
            var graphArray = graphService.graph.friend_posts
        }

        this.items = [];
        for (let i = 0; i < graphArray.length; i++) {
          this.items.push({
            pageTitle: pageTitle,
            transaction: graphArray[i]
          });
        }
      });
    }
    this.balance = walletService.wallet.balance;
  }

  itemTapped(event, item) {
    // That's right, we're pushing to ourselves!
    this.navCtrl.push(ListPage, {
      item: item
    });
  }
  relationship = null;
  accept(transaction) {
    this.http.get(this.baseAddress + '/get-peer', {rid: transaction.requester_rid}, {})
    .then((res) => {
      return new Promise((resolve, reject) => {
        var data = JSON.parse(res.data);
        this.peerService.rid = transaction.requested_rid;
        this.peerService.callback = this.pushTransaction;
        this.peerService.init().then(() => {
          this.peerService.connect(data.peerId, () => {
            // Receive messages: step 3 in friend accept process
            this.peerService.conn.on('data', (data2) => {
                console.log('Received', data2);
                resolve(JSON.parse(data2));
            });

            // Send messages: step 1 in friend accept process
            this.peerService.conn.send(JSON.stringify({
                bulletin_secret: this.bulletinSecretService.bulletin_secret
            }));
          });
        });
      });
    }).then((res) => {
      this.relationship = res;
      this.walletService.get().then(() => {
        return new Promise((resolve, reject) => {
          this.pushTransaction({
              relationship: this.relationship,
              requested_rid: transaction.requested_rid,
              requester_rid: transaction.requester_rid,
              to: this.relationship.to,
              blockchainurl: this.blockchainAddress,
              confirm_friend: false,
              resolve: resolve
          });
        });
      }).then((txn) => {
        this.pushTransaction({
            relationship: this.relationship,
            requested_rid: transaction.requested_rid,
            requester_rid: transaction.requester_rid,
            to: this.relationship.to,
            blockchainurl: this.blockchainAddress,
            confirm_friend: true,
            unspent_transaction: txn
        });
      });
    })
    .catch((error) => {
      console.log(error);
    });
  }

  pushTransaction(relationships) {
    this.navCtrl.push(Transaction, relationships);
  }

  refreshWallet() {
     this.walletService.get()
     .then(() => {
       this.balance = this.walletService.wallet.balance;
     });
  }
}
