import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';

import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';
import { Settings } from '../pages/settings/settings';
import { SendReceive } from '../pages/sendreceive/sendreceive';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = HomePage;

  pages: Array<{title: string, component: any, count: any, color: any}>;

  graph: any;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen, private settingsService: SettingsService, private walletService: WalletService, private graphService: GraphService, private bulletinSecretService: BulletinSecretService) {
    this.initializeApp();
    this.graphService.getGraph().then(() => {
      // used for an example of ngFor and navigation
      this.pages = [
        { title: 'Home', component: HomePage, count: false, color: '' },
        { title: 'Send / Receive', component: SendReceive, count: false, color: '' },
        { title: 'Friends', component: ListPage, count: this.graphService.graph.friends.length, color: '' },
        { title: 'Friend Requests', component: ListPage, count: this.graphService.graph.friend_requests.length, color: 'danger' },
        { title: 'Sent Requests', component: ListPage, count: this.graphService.graph.sent_friend_requests.length, color: '' },
        { title: 'Posts', component: ListPage, count: false, color: '' },
        { title: 'Settings', component: Settings, count: false, color: '' }
      ];
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component, {pageTitle: page});
  }
}
