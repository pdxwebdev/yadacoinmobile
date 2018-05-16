import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { HTTP } from '@ionic-native/http';
import { Deeplinks } from '@ionic-native/deeplinks';
import { Firebase } from '@ionic-native/firebase';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';
import { Storage } from '@ionic/storage';
import { FirebaseService } from './firebase.service';
import { PushService } from './push.service';

import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';
import { Settings } from '../pages/settings/settings';
import { ProfilePage } from '../pages/profile/profile';
import { SendReceive } from '../pages/sendreceive/sendreceive';


declare var forge;
declare var diffiehellman;

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any = HomePage;

  pages: Array<{title: string, component: any, count: any, color: any}>;

  graph: any;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private settingsService: SettingsService,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private deeplinks: Deeplinks,
    private firebase: Firebase,
    private http: HTTP,
    private storage: Storage,
    private firebaseService: FirebaseService,
    private pushService: PushService
  ) {
    this.graphService.graph = {}
    this.initializeApp();
    this.pages = [
      { title: 'Me', component: ProfilePage, count: false, color: '' },
      { title: 'News Feed', component: HomePage, count: false, color: '' },
      { title: 'Chat', component: ListPage, count: false, color: '' },
      { title: 'Friends', component: ListPage, count: 0, color: '' },
      { title: 'Friend Requests', component: ListPage, count: 0, color: '' },
      { title: 'Sent Requests', component: ListPage, count: 0, color: '' },
      { title: 'Coins', component: SendReceive, count: false, color: '' },
      { title: 'Settings', component: Settings, count: false, color: '' }
    ];
    this.walletService.get();
  }

  ngAfterViewInit() {
    if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
      this.deeplinks.routeWithNavController(this.nav, {
        '/:txnData': HomePage
      }).subscribe((match) => {
        // match.$route - the route we matched, which is the matched entry from the arguments to route()
        // match.$args - the args passed in the link
        // match.$link - the full link data
        console.log('Successfully matched route', match);
      }, (nomatch) => {
        // nomatch.$link - the full link data
        console.error('Got a deeplink that didn\'t match', nomatch);
      });
    }
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
