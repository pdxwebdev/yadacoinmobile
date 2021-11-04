import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpModule } from '@angular/http';
import { CommonModule } from '@angular/common';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { PostModal } from '../pages/home/postmodal';
import { ListPage } from '../pages/list/list';
import { Settings } from '../pages/settings/settings';
import { ChatPage } from '../pages/chat/chat';
import { ProfilePage } from '../pages/profile/profile';
import { GroupPage } from '../pages/group/group';
import { SiaFiles } from '../pages/siafiles/siafiles';
import { StreamPage } from '../pages/stream/stream';
import { MailPage } from '../pages/mail/mail';
import { ComposePage } from '../pages/mail/compose';
import { CalendarPage } from '../pages/calendar/calendar';


import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { QRScanner } from '@ionic-native/qr-scanner';
import { NgxQRCodeModule } from 'ngx-qrcode2';
import { IonicStorageModule } from '@ionic/storage';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { PeerService } from './peer.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';
import { WebSocketService } from './websocket.service';
import { TransactionService } from './transaction.service';
import { OpenGraphParserService } from './opengraphparser.service'
import { FirebaseService } from './firebase.service';
import { SendReceive } from '../pages/sendreceive/sendreceive';
import { Clipboard } from '@ionic-native/clipboard';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Badge } from '@ionic-native/badge';
import { Deeplinks } from '@ionic-native/deeplinks';
import { Firebase } from '@ionic-native/firebase';
import { EmojiPickerModule } from '@ionic-tools/emoji-picker';
import { File } from '@ionic-native/file';
import { AutoCompleteModule, AutoCompleteComponent } from 'ionic2-auto-complete';
import { CompleteTestService } from './autocomplete.provider';
import { Geolocation } from '@ionic-native/geolocation';
import { GoogleMaps } from '@ionic-native/google-maps';
import { MailItemPage } from '../pages/mail/mailitem';
import { SignatureRequestPage } from '../pages/signaturerequest/signaturerequest';
import { WebPage } from '../pages/web/web';
import { MyPagesPage } from '../pages/web/mypages'
import { BuildPagePage } from '../pages/web/buildpage';
import { TooltipsModule } from 'ionic-tooltips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


@NgModule({
  declarations: [
    MyApp,
    HomePage,
    PostModal,
    ListPage,
    Settings,
    SendReceive,
    ChatPage,
    ProfilePage,
    GroupPage,
    SiaFiles,
    StreamPage,
    MailPage,
    ComposePage,
    CalendarPage,
    MailItemPage,
    SignatureRequestPage,
    WebPage,
    MyPagesPage,
    BuildPagePage
  ],
  imports: [
    BrowserModule,
    AutoCompleteModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot({
      name: '__mydb',
         driverOrder: ['websql', 'sqlite', 'indexeddb']
    }),
    NgxQRCodeModule,
    HttpModule,
    EmojiPickerModule.forRoot(),
    CommonModule,
    TooltipsModule.forRoot(),
    BrowserAnimationsModule
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
    ProfilePage,
    GroupPage,
    SiaFiles,
    StreamPage,
    MailPage,
    ComposePage,
    CalendarPage,
    MailItemPage,
    SignatureRequestPage,
    WebPage,
    MyPagesPage,
    BuildPagePage
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
    WebSocketService,
    TransactionService,
    OpenGraphParserService,
    Clipboard,
    SocialSharing,
    Badge,
    Deeplinks,
    Firebase,
    FirebaseService,
    File,
    CompleteTestService,
    AutoCompleteComponent,
    Geolocation,
    GoogleMaps
  ]
})
export class AppModule {}
