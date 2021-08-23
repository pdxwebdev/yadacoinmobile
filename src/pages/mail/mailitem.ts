import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { ComposePage } from './compose';


@Component({
  selector: 'mail-item',
  templateUrl: 'mailitem.html'
})
export class MailItemPage {
  navParams: any;
  item: any;
  constructor(
    public navCtrl: NavController,
    navParams: NavParams
  ) {
    this.item = navParams.data.item
  }

  replyMail(item) {
    this.navCtrl.push(ComposePage, {
      item: item,
      mode: 'reply'
    });
  }

  forwardMail(item) {
    this.navCtrl.push(ComposePage, {
      item: item,
      mode: 'forward'
    });
  }

}
