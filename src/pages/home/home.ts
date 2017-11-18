import { Component } from '@angular/core';
import { NavController, ModalController } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { Transaction } from '../transaction/transaction';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { PeerService } from '../../app/peer.service';
import { WalletService } from '../../app/wallet.service';
import { GraphService } from '../../app/graph.service';
import { TransactionService } from '../../app/transaction.service';
import { ListPage } from '../list/list';
import { PostModal } from './postmodal';

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
    items = null;
    loading = true;
    loadingBalance = true;
    constructor(
        public navCtrl: NavController,
        public modalCtrl: ModalController,
        private qrScanner: QRScanner,
        private storage: Storage,
        private bulletinSecretService: BulletinSecretService,
        private peerService: PeerService,
        private alertCtrl: AlertController,
        private walletService: WalletService,
        private graphService: GraphService,
        private transactionService: TransactionService
    ) {
        this.refresh();
    }

    refresh() {
        this.loading = true;
        this.loadingBalance = true;
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.walletService.get().then(() => {
            this.balance = this.walletService.wallet.balance;
            this.loadingBalance = false;
        });
        this.graphService.getGraph().then(() => {
            var graphArray = this.graphService.graph.friend_posts

            this.items = [];
            for (let i = 0; i < graphArray.length; i++) {
                this.items.push({
                    transaction: graphArray[i]
                });
            }
            this.loading = false;
        });
    }

    createCode() {
        this.graphService.getGraph().then(() => {
            this.peerService.init();
            this.createdCode = JSON.stringify({
                bulletin_secret: this.bulletinSecretService.bulletin_secret,
                shared_secret: uuid4(),
                to: this.bulletinSecretService.key.getAddress(),
                requested_rid: this.graphService.rid
            });
        });
    }

    scanFriend() {
        this.qrScanner.prepare().then((status: QRScannerStatus) => {
            console.log(status);
            if (status.authorized) {
                // start scanning
                let scanSub = this.qrScanner.scan().subscribe((text: string) => {

                    let alert = this.alertCtrl.create();
                    alert.setTitle('Approve Transaction');
                    alert.setSubTitle('You are about to spend 1.01 coins (1 coin + 0.01 fee)');
                    alert.addButton('Cancel');
                    alert.addButton({
                        text: 'Confirm',
                        handler: (data: any) => {
                            console.log('Scanned something', text);
                            let info = JSON.parse(text);
                            // camera permission was granted
                            var requester_rid = info.requester_rid;
                            var requested_rid = info.requested_rid;
                            var confirm_friend = info.confirm_friend;
                            if (requester_rid && requested_rid) {
                                var bulletin_secrets = [this.bulletinSecretService.bulletin_secret, this.bulletinSecretService.bulletin_secret].sort(function (a, b) {
                                    return a.toLowerCase().localeCompare(b.toLowerCase());
                                });
                                var rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
                                if (!info.requester_rid) {
                                    // TODO: MUST VERIFY THIS RID IS RELATED TO THE SAME NODE AS THE REQUESTED RID!!!
                                    requester_rid = this.graphService.rid;
                                }
                                if (!info.requested_rid) {
                                    requested_rid = rid;
                                }
                            } else {
                                requester_rid = '';
                                requested_rid = '';
                            }

                            this.walletService.get().then(() => {
                                return new Promise((resolve, reject) => {
                                    this.transactionService.pushTransaction({
                                        relationship: {
                                            bulletin_secret: info.bulletin_secret,
                                            shared_secret: info.shared_secret
                                        },
                                        requested_rid: info.requested_rid,
                                        requester_rid: info.requester_rid,
                                        blockchainurl: this.blockchainAddress,
                                        challenge_code: info.challenge_code,
                                        callbackurl: info.callbackurl,
                                        to: info.to,
                                        confirm_friend: false,
                                        resolve: resolve
                                    });
                                });
                            }).then((txn) => {
                                if(info.accept && txn) {
                                    this.transactionService.pushTransaction({
                                        relationship: {
                                            bulletin_secret: info.bulletin_secret,
                                            shared_secret: info.shared_secret
                                        },
                                        requested_rid: info.requested_rid,
                                        requester_rid: info.requester_rid,
                                        to: info.to,
                                        blockchainurl: this.blockchainAddress,
                                        confirm_friend: true,
                                        unspent_transaction: txn
                                    });
                                }
                            });

                            this.peerService.rid = info.requester_rid;
                            this.peerService.init();
                        }
                    });
                    alert.present();
                    this.qrScanner.hide(); // hide camera preview
                    scanSub.unsubscribe(); // stop scanning
                    window.document.querySelector('ion-app').classList.remove('transparentBody');
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

    itemTapped(event, item) {
        item.pageTitle = "Posts";
        this.navCtrl.push(ListPage, {
            item: item
        });
    }

    presentModal() {
        let modal = this.modalCtrl.create(PostModal, {blockchainAddress: this.blockchainAddress, logicalParent: this});
        modal.present();
    }

    addPeer() {
        this.peerService.init();
    }
}
