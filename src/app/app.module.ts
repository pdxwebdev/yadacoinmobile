import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { PostModal } from '../pages/home/postmodal';
import { ListPage } from '../pages/list/list';
import { Transaction } from '../pages/transaction/transaction'
import { Settings } from '../pages/settings/settings';

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

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    PostModal,
    ListPage,
    Transaction,
    Settings
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
    NgxQRCodeModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    PostModal,
    ListPage,
    Transaction,
    Settings
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
    HTTP
  ]
})
export class AppModule {}
