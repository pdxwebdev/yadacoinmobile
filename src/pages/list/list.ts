import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Transaction } from '../transaction/transaction';
import { GraphService } from '../../app/graph.service';

@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})
export class ListPage {
  selectedItem: any;
  pageTitle: any;
  icons: string[];
  items: Array<{pageTitle: string, title: string, note: string, icon: string}>;

  constructor(public navCtrl: NavController, public navParams: NavParams, private graphService: GraphService) {
    // If we navigated to this page, we will have an item available as a nav param
    this.selectedItem = navParams.get('item');
    this.pageTitle = this.selectedItem ? this.selectedItem.pageTitle : navParams.get('pageTitle').title;

    if(!this.selectedItem) {
      // Let's populate this page with some filler content for funzies
      this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
      'american-football', 'boat', 'bluetooth', 'build'];
      var callback = () => {
        if (this.pageTitle == 'Friends') {
            var graphArray = graphService.graph.friends
            var accessor = 'rid';
        } else if (this.pageTitle == 'Friend Requests') {
            var graphArray = graphService.graph.friend_requests
            var accessor = 'rid';
        } else if (this.pageTitle == 'Sent Requests') {
            var graphArray = graphService.graph.sent_friend_requests
            var accessor = 'rid';
        } else if (this.pageTitle == 'Posts') {
            var graphArray = graphService.graph.friend_posts
            var accessor = 'post_text';
        }

        this.items = [];
        for (let i = 0; i < graphArray.length; i++) {
          this.items.push({
            pageTitle: this.pageTitle,
            title: graphArray[i][accessor],
            note: 'This is friend #' + i,
            icon: this.icons[Math.floor(Math.random() * this.icons.length)]
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

  accept(rid) {
    this.navCtrl.push(Transaction, {
      rid: rid
    });
  }
}
