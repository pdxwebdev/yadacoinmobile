import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Transaction } from '../transaction/transaction';
import { GraphService } from '../../app/graph.service';
import { PeerService } from '../../app/peer.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';

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
  constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage, private graphService: GraphService, private peerService: PeerService, private bulletinSecretService: BulletinSecretService) {
    // If we navigated to this page, we will have an item available as a nav param
      this.storage.get('blockchainAddress').then((blockchainAddress) => {
          this.blockchainAddress = blockchainAddress;
      });
    this.selectedItem = navParams.get('item');
    this.pageTitle = this.selectedItem ? this.selectedItem.pageTitle : navParams.get('pageTitle').title;

    if(!this.selectedItem) {
      // Let's populate this page with some filler content for funzies
      this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
      'american-football', 'boat', 'bluetooth', 'build'];
      var callback = () => {
        if (this.pageTitle == 'Friends') {
            var graphArray = graphService.graph.friends
        } else if (this.pageTitle == 'Friend Requests') {
            var graphArray = graphService.graph.friend_requests
        } else if (this.pageTitle == 'Sent Requests') {
            var graphArray = graphService.graph.sent_friend_requests
        }

        this.items = [];
        for (let i = 0; i < graphArray.length; i++) {
          this.items.push({
            pageTitle: this.pageTitle,
            transaction: graphArray[i]
          });
        }
      }

      graphService.getGraph(callback);
    }
  }

  itemTapped(event, item) {
    // That's right, we're pushing to ourselves!
    this.navCtrl.push(ListPage, {
      item: item
    });
  }

  accept(transaction) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://34.237.46.10/get-peer?rid=' + transaction.requester_id, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        var data = JSON.parse(xhr.responseText);
        this.peerService.callback = this.pushTransaction;
        this.peerService.connect(data.peerId, (conn) => {
            // Receive messages: step 3 in friend accept process
            conn.on('data', function(data) {
                console.log('Received', data);
                var relationship = JSON.parse(data);
                this.pushTransaction(relationship);
            });

            // Send messages: step 1 in friend accept process
            conn.send(JSON.stringify({
                bulletin_secret: this.bulletinSecretService.bulletin_secret
            }));
        });
      }
    }
    xhr.send();
  }

  pushTransaction(relationship) {
    this.navCtrl.push(Transaction, {
       relationship: relationship,
       blockchainurl: this.blockchainAddress
    });
  }
}
