import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { WalletService } from '../../app/wallet.service';
import { AlertController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { OpenGraphParserService } from '../../app/opengraphparser.service'
import { SettingsService } from '../../app/settings.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { Http, Headers, RequestOptions } from '@angular/http';

declare var Base64

@Component({
    selector: 'modal-files',
    templateUrl: 'siafiles.html'
})
export class SiaFiles {
	logicalParent = null;
    mode = '';
	postText = null;
    post = {};
    files = null;
    selectedFile = null;
    filepath = '';
    group = null;
    error = '';
    constructor(
        public navParams: NavParams,
        public viewCtrl: ViewController,
        private walletService: WalletService,
        private alertCtrl: AlertController,
        private transactionService: TransactionService,
        private openGraphParserService: OpenGraphParserService,
        private settingsService: SettingsService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http
    ) {
        this.group = navParams.data.group;
        this.mode = navParams.data.mode || 'page';
        this.logicalParent = navParams.data.logicalParent;
        let headers = new Headers();
        headers.append('Authorization', 'Bearer ' + this.settingsService.tokens[this.bulletinSecretService.keyname]);
        let options = new RequestOptions({ headers: headers});
        this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/sia-files', options)
        .subscribe((res) => {
            this.files = res.json()['files'];
        },
        (err) => {
            this.error = err.json().message
        })
    }

    changeListener($event) {
        this.filepath = $event.target.files[0];
    }

    upload() {
        this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/sia-upload?filepath=' + encodeURIComponent(this.filepath))
        .subscribe((res) => {
            this.files = res.json()['files'];
        })
    }

    delete(siapath) {
        this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/sia-delete?siapath=' + encodeURIComponent(siapath))
        .subscribe((res) => {
            this.files = res.json()['files'];
        })
    }

    submit() {
        this.walletService.get().then(() => {
        	return new Promise((resolve, reject) => {
                if (this.selectedFile) {

                    this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/sia-share-file?siapath=' + this.selectedFile)
                    .subscribe((res) => {
                        let sharefiledata = res.json()['filedata'];
                        this.approveTxn(sharefiledata, resolve);
                    })
                } else {
                    this.approveTxn(null, resolve);
                }
	            console.log(status);
        	}).then(() => {
        		this.dismiss();
        	});
        });
    }

    approveTxn(sharefiledata, resolve) {
        let alert = this.alertCtrl.create();
        alert.setTitle('Approve Transaction');
        alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
        alert.addButton('Cancel');
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                // camera permission was granted
                new Promise((resolve, reject) => {
                    if (sharefiledata) {
                        return this.transactionService.generateTransaction({
                            relationship: {
                                groupChatText: this.postText,
                                groupChatFile: sharefiledata,
                                groupChatFileName: this.selectedFile,
                                my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                                my_username: this.bulletinSecretService.username
                            },
                            their_bulletin_secret: this.group.their_bulletin_secret,
                            rid: this.group.rid,
                            requester_rid: this.group.requester_rid,
                            requested_rid: this.group.requested_rid
                        })
                        .then(() => {
                            resolve()
                        })
                        .catch((err) => {
                            reject();
                        });
                    } else {
                        return this.transactionService.generateTransaction({
                            relationship: {
                                postText: this.postText
                            }
                        })
                        .then(() => {
                            resolve()
                        })
                        .catch((err) => {
                            reject();
                        });
                    }
                })
                .then((hash) => {
                    return this.transactionService.sendTransaction();
                })
                .then(() => {
                    this.dismiss();
                })
                .catch((err) => {
                    console.log('could not generate hash');
                });
            }
        });
        alert.present();
    }

    dismiss() {
    	this.logicalParent.refresh();
    	this.viewCtrl.dismiss();
    }
}