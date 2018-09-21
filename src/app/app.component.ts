import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { WalletService } from './wallet.service';

import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';
import { Settings } from '../pages/settings/settings';
import { ProfilePage } from '../pages/profile/profile';
import { SendReceive } from '../pages/sendreceive/sendreceive';

declare var forge;

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = HomePage;

  pages: Array<{title: string, label: string, component: any, count: any, color: any}>;

  graph: any;
  friend_request_count: any;
  new_messages_count: any;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService
  ) {
    this.graphService.graph = {}
    this.initializeApp();
    this.pages = [
      { title: 'News Feed', label: 'Home', component: HomePage, count: false, color: '' },
      { title: 'Me', label: 'Profile', component: ProfilePage, count: false, color: '' },
      { title: 'Messages', label: 'Chat', component: ListPage, count: false, color: '' },
      //{ title: 'Sign Ins', label: 'Sign Ins', component: ListPage, count: false, color: '' },
      { title: 'Friend Requests', title: 'Friend Requests', component: ListPage, count: this.graphService.friend_request_count, color: this.graphService.friend_request_count > 0 ? 'danger' : '' },
      { title: 'Sent Requests', title: 'Sent Requests', component: ListPage, count: 0, color: '' },
      { title: 'Coins', title: 'Coins', component: SendReceive, count: false, color: '' },
      { title: 'Settings', label: 'Settings', component: Settings, count: false, color: '' }
    ];
    this.walletService.get();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      if (this.platform.is('android') || this.platform.is('ios')) {
        this.statusBar.styleDefault();
        this.splashScreen.hide();
      }
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component, {pageTitle: page});
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
}
