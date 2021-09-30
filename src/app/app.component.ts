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
import { CalendarPage } from '../pages/calendar/calendar';
import { Settings } from '../pages/settings/settings';
import { SiaFiles } from '../pages/siafiles/siafiles';
import { StreamPage } from '../pages/stream/stream';
import { SendReceive } from '../pages/sendreceive/sendreceive';
import { ProfilePage } from '../pages/profile/profile';
import { MailPage } from '../pages/mail/mail';
import { Deeplinks } from '@ionic-native/deeplinks';

declare var forge;

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any;

  pages: Array<{title: string, label: string, component: any, count: any, color: any, root: boolean}>;
  graph: any;
  friend_request_count: any;
  new_messages_count: any;
  version: any;
  menu: any;
  root: boolean;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private walletService: WalletService,
    private graphService: GraphService,
    public settingsService: SettingsService,
    private bulletinSecretService: BulletinSecretService,
    public events: Events,
    private deeplinks: Deeplinks
  ) {
    events.subscribe('graph', () => {
      this.rootPage = HomePage;
    });
    events.subscribe('menu', (options) => {
      this.root = this.pages[0].root;
      this.setMenu(options);
      this.openPage(this.pages[0])
    });
    events.subscribe('menuonly', (options) => {
      this.root = this.pages[0].root;
      this.setMenu(options);
    });
    this.rootPage = Settings;
  }
  
  ngAfterViewInit() {
    this.initializeApp();
  }

  setMenu(pages = null) {
    if (pages) {
      this.pages = pages;
      return
    }
    if (this.settingsService.menu == 'home') {
      this.pages = [
        { title: 'Home', label: 'Home', component: HomePage, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'mail') {
      this.pages = [
        { title: 'Inbox', label: 'Inbox', component: MailPage, count: false, color: '', root: true },
        { title: 'Sent', label: 'Sent', component: MailPage, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'chat') {
      this.pages = [
        { title: 'Messages', label: 'Chat', component: ListPage, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'community') {
      this.pages = [
        { title: 'Community', label: 'Community', component: ListPage, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'calendar') {
      this.pages = [
        { title: 'Calendar', label: 'Calendar', component: CalendarPage, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'contacts') {
      this.pages = [
        { title: 'Contacts', label: 'Contacts', component: ListPage, count: false, color: '', root: true },
        { title: 'Contact Requests', label: 'Contact Requests', component: ListPage, count: false, color: '', root: true },
        { title: 'Groups', label: 'Groups', component: ListPage, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'files') {
      this.pages = [
        { title: 'Files', label: 'Files', component: SiaFiles, count: false, color: '', root: true },
      ];
    } else if (this.settingsService.menu == 'wallet') {
      this.pages = [
        { title: 'Send / Receive', label: 'Send / Receive', component: SendReceive, count: false, color: '', root: true }
      ];
    } else if (this.settingsService.menu == 'stream') {
      this.pages = [ 
        { title: 'Stream', label: 'Stream', component: StreamPage, count: false, color: '', root: true }
      ]
    } else if (this.settingsService.menu == 'settings') {
      this.pages = [
        { title: 'Settings', label: 'Identity', component: Settings, count: false, color: '', root: true },
        { title: 'Profile', label: 'Profile', component: ProfilePage, count: false, color: '', root: true }
      ];
    }
    this.openPage(this.pages[0])
  }

  initializeApp() {
    this.platform.ready()
    .then(() => {
      if(this.platform.is('cordova')) {
        this.deeplinks.routeWithNavController(this.nav, {
            '/app': Settings
        }).subscribe(match => {
            // match.$route - the route we matched, which is the matched entry from the arguments to route()
            // match.$args - the args passed in the link
            // match.$link - the full link data
            console.log('Successfully matched route', match);
        }, nomatch => {
            // nomatch.$link - the full link data
            console.error('Got a deeplink that didn\'t match', nomatch);
        });
      }
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
    if (page.root) {
      this.nav.setRoot(page.component, {pageTitle: page, ...page.kwargs});
    } else {
      this.nav.push(page.component, {pageTitle: page, ...page.kwargs})
    }
  }

  segmentChanged(e) {
    this.settingsService.menu = e.value;
    this.setMenu();
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
