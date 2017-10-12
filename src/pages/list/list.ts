import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

import { GraphService } from '../../app/graph.service';

@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})
export class ListPage {
  selectedItem: any;
  icons: string[];
  items: Array<{pageTitle: string, title: string, note: string, icon: string}>;

  constructor(public navCtrl: NavController, public navParams: NavParams, private graphService: GraphService) {
    // If we navigated to this page, we will have an item available as a nav param
    this.selectedItem = navParams.get('item');

    // Let's populate this page with some filler content for funzies
    this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
    'american-football', 'boat', 'bluetooth', 'build'];

    if (navParams.data.pageTitle.title == 'Friends') {
        var graphArray = graphService.graph.friends
        var accessor = 'rid';
    } else if (navParams.data.pageTitle.title == 'Friend Requests') {
        var graphArray = graphService.graph.friend_requests
        var accessor = 'rid';
    } else if (navParams.data.pageTitle.title == 'Sent Requests') {
        var graphArray = graphService.graph.sent_friend_requests
        var accessor = 'rid';
    } else if (navParams.data.pageTitle.title == 'Posts') {
        var graphArray = graphService.graph.friend_posts
        var accessor = 'post_text';
    }

    this.items = [];
    for (let i = 0; i < graphArray.length; i++) {
      this.items.push({
        pageTitle: navParams.data.pageTitle.title,
        title: graphArray[i][accessor],
        note: 'This is friend #' + i,
        icon: this.icons[Math.floor(Math.random() * this.icons.length)]
      });
    }
  }

  itemTapped(event, item) {
    // That's right, we're pushing to ourselves!
    this.navCtrl.push(ListPage, {
      item: item
    });
  }
}
