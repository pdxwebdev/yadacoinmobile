import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpModule } from '@angular/http';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { PostModal } from '../pages/home/postmodal';
import { ListPage } from '../pages/list/list';
import { Settings } from '../pages/settings/settings';
import { ChatPage } from '../pages/chat/chat';
import { ProfilePage } from '../pages/profile/profile';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { QRScanner } from '@ionic-native/qr-scanner';
import { NgxQRCodeModule } from 'ngx-qrcode2';
import { IonicStorageModule } from '@ionic/storage';
import { HTTP } from '@ionic-native/http';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { PeerService } from './peer.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { OpenGraphParserService } from './opengraphparser.service'
import { FirebaseService } from './firebase.service'
import { SendReceive } from '../pages/sendreceive/sendreceive';
import { Clipboard } from '@ionic-native/clipboard';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Badge } from '@ionic-native/badge';
import { Deeplinks } from '@ionic-native/deeplinks';
import { Firebase } from '@ionic-native/firebase';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    PostModal,
    ListPage,
    Settings,
    SendReceive,
    ChatPage,
    ProfilePage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
    NgxQRCodeModule,
    HttpModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    PostModal,
    ListPage,
    Settings,
    SendReceive,
    ChatPage,
    ProfilePage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    QRScanner,
    NgxQRCodeModule,
    GraphService,
    BulletinSecretService,
    PeerService,
    SettingsService,
    WalletService,
    TransactionService,
    OpenGraphParserService,
    HTTP,
    Clipboard,
    SocialSharing,
    Badge,
    Deeplinks,
    Firebase,
    FirebaseService
  ]
})
export class AppModule {}
