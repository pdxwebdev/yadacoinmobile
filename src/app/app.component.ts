import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { GraphService } from './graph.service';
import { SettingsService } from './settings.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { WalletService } from './wallet.service';
import { Events } from 'ionic-angular';

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

  rootPage: any;

  pagesForRegisteredUser: Array<{title: string, label: string, component: any, count: any, color: any}>;
  pagesForUnregisteredUser: Array<{title: string, label: string, component: any, count: any, color: any}>;
  defaultPages: Array<{title: string, label: string, component: any, count: any, color: any}>;
  noUrlPages: any;

  graph: any;
  friend_request_count: any;
  new_messages_count: any;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private walletService: WalletService,
    private graphService: GraphService,
    public settingsService: SettingsService,
    private bulletinSecretService: BulletinSecretService,
    public events: Events
  ) {
    events.subscribe('graph', () => {
      this.rootPage = HomePage;
    });
    events.subscribe('pages-error', () => {
      
    });
    this.graphService.graph = {
      comments: "",
      reacts: "",
      commentReacts: ""
    }
    this.initializeApp();
    this.walletService.get().then((data: any) => {
      this.rootPage = HomePage;
    }).catch(() => {
      this.rootPage = Settings;
    });

    this.pagesForRegisteredUser = [
      { title: 'Home', label: 'App', component: HomePage, count: false, color: '' },
      { title: 'Messages', label: 'Messages', component: ListPage, count: false, color: '' },
      { title: 'Friend Requests', label: 'Friend Requests', component: ListPage, count: this.graphService.friend_request_count, color: this.graphService.friend_request_count > 0 ? 'danger' : '' },
      { title: 'Sent Requests', label: 'Sent Requests', component: ListPage, count: 0, color: '' }
    ];

    this.pagesForUnregisteredUser = [
      { title: 'Home', label: 'App', component: HomePage, count: false, color: '' }
    ];

    this.defaultPages = [
      { title: 'Identity', label: 'Identity', component: Settings, count: false, color: '' },
      { title: 'Wallet', label: 'Wallet', component: SendReceive, count: false, color: '' }
    ];

    this.noUrlPages = [
    ];
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
