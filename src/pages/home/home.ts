import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { Transaction } from '../transaction/transaction';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { PeerService } from '../../app/peer.service';
import { WalletService } from '../../app/wallet.service';

declare var forge;
declare var elliptic;
declare var uuid4;

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {
    postText = null;
    createdCode = null;
    scannedCode = null;
    key = null;
    blockchainAddress = null;
    balance = null;
    constructor(
        public navCtrl: NavController,
        private qrScanner: QRScanner,
        private storage: Storage,
        private bulletinSecretService: BulletinSecretService,
        private peerService: PeerService,
        private alertCtrl: AlertController,
        private walletService: WalletService
        ) {
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
            this.createCode();
        });
        this.balance = walletService.wallet.balance;
    }

    createCode() {
        this.createdCode = JSON.stringify({
            bulletin_secret: this.bulletinSecretService.bulletin_secret,
            shared_secret: uuid4(),
            to: this.bulletinSecretService.key.getAddress()
        });
    }

    scan_friend() {
        this.qrScanner.prepare().then((status: QRScannerStatus) => {
            console.log(status);
            if (status.authorized) {
                // start scanning
                let scanSub = this.qrScanner.scan().subscribe((text: string) => {

                    let alert = this.alertCtrl.create();
                    alert.setTitle('Traceability');
                    alert.setSubTitle('You can choose whether you want others to see this relationship.');

                    alert.addInput({
                        type: 'radio',
                        label: 'Traceable ',
                        value: 'traceable'
                    });

                    alert.addInput({
                        type: 'radio',
                        label: 'Untraceable',
                        value: 'untraceable'
                    });

                    alert.addButton('Cancel');
                    alert.addButton({
                        text: 'Ok',
                        handler: (data: any) => {
                            let alert2 = this.alertCtrl.create();
                            alert2.setTitle('Approve Transaction');
                            alert2.setSubTitle('You are about to spend 1.01 coins (1 coin + 0.01 fee)');
                            alert2.addButton('Cancel');
                            alert2.addButton({
                                text: 'Confirm',
                                handler: (data2: any) => {
                                    console.log('Scanned something', text);
                                    let info = JSON.parse(text);
                                    // camera permission was granted
                                    var requester_rid = info.requester_rid;
                                    var requested_rid = info.requested_rid;
                                    if (data === 'traceable') {
                                        var bulletin_secrets = [this.bulletinSecretService.bulletin_secret, this.bulletinSecretService.bulletin_secret].sort(function (a, b) {
                                            return a.toLowerCase().localeCompare(b.toLowerCase());
                                        });
                                        var rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
                                        if (!info.requester_rid) {
                                            requester_rid = rid;
                                        }
                                        if (!info.requested_rid) {
                                            requested_rid = rid;
                                        }
                                    } else if (data === 'untraceable') {
                                        requester_rid = '';
                                        requested_rid = '';
                                    }
                                    this.navCtrl.push(Transaction, {
                                        relationship: {
                                            bulletin_secret: info.bulletin_secret,
                                            shared_secret: info.shared_secret
                                        },
                                        requester_rid: requester_rid,
                                        requested_rid: requested_rid,
                                        blockchainurl: this.blockchainAddress,
                                        challenge_code: info.challenge_code,
                                        callbackurl: info.callbackurl,
                                        to: info.to
                                    });
                                    this.peerService.rid = info.requester_rid;
                                    this.peerService.init();
                                }
                            });
                            alert2.present();
                        }
                    });
                    this.qrScanner.hide(); // hide camera preview
                    scanSub.unsubscribe(); // stop scanning
                    window.document.querySelector('ion-app').classList.remove('transparentBody');
                    alert.present();
                });
                console.log(this.qrScanner);
                this.qrScanner.resumePreview();
                // show camera preview
                this.qrScanner.show();
                window.document.querySelector('ion-app').classList.add('transparentBody');
                // wait for user to scan something, then the observable callback will be called


            } else if (status.denied) {
                // camera permission was permanently denied
                // you must use QRScanner.openSettings() method to guide the user to the settings page
                // then they can grant the permission from there
            } else {
                // permission was denied, but not permanently. You can ask for permission again at a later time.
            }

        }).catch((e: any) => console.log('Error is', e));
    }
}
