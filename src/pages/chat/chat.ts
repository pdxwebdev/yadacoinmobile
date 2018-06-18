import { Component } from '@angular/core';
import { NavController, NavParams, ModalController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { AlertController, LoadingController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { ListPage } from '../list/list';

declare var forge;
declare var elliptic;
declare var uuid4;
declare var X25519;

@Component({
    selector: 'page-chat',
    templateUrl: 'chat.html'
})
export class ChatPage {
	chatText: any;
	bulletinSecret: any;
	blockchainAddress: any;
	chats: any;
	rid: any;
	cryptoGenModal: any;
	public_key: any;
	loading: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        public transactionService: TransactionService,
        public alertCtrl: AlertController,
        public graphService: GraphService,
        public loadingCtrl: LoadingController,
        public bulletinSecretService: BulletinSecretService
    ) {
    	this.rid = navParams.data.item.transaction.rid;
        var key = 'last_message_height-' + navParams.data.item.transaction.rid;
        if(navParams.data.item.transaction.height) this.storage.set(key, navParams.data.item.transaction.height);
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        this.public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
        this.refresh(null);
    }

    parseChats() {
        if(this.graphService.graph.messages[this.rid]) {
	        var chats = this.graphService.graph.messages[this.rid].sort(function (a, b) {
	            if (a.height < b.height)
	              return -1
	            if (a.height > b.height)
	              return 1
	            return 0
	        });
	        this.chats = chats;
        } else {
        	this.chats = [];
        }
    }

    refresh(refresher) {
    	this.loading = true;
    	this.graphService.getMessages(this.rid)
    	.then(() => {
    		this.parseChats();
    		this.loading = false;
    		if(refresher) refresher.complete();
    	});
    }

    send() {
	    let alert = this.alertCtrl.create();
	    alert.setTitle('Approve transaction');
	    alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
	    alert.addButton('Cancel');
	    alert.addButton({
	        text: 'Confirm',
	        handler: (data: any) => {
                this.cryptoGenModal = this.loadingCtrl.create({
                    content: 'Generating encryption, please wait... (could take several minutes)'
                });
                this.cryptoGenModal.present();
		        this.walletService.get().then(() => {
		        	return new Promise((resolve, reject) => {
		        		this.graphService.getFriends()
		        		.then(() => {
				            var dh_public_key = this.graphService.keys[this.rid].dh_public_keys[0];
				            var dh_private_key = this.graphService.keys[this.rid].dh_private_keys[0];

				        	if(dh_public_key && dh_private_key) {
	                        	var key = 'shared_secret-' + this.rid + '|' + dh_public_key.slice(0, 26) + dh_private_key.slice(0, 26);
		                        if (this.graphService.stored_secrets[key]) {
		                            var shared_secret = this.graphService.stored_secrets[key];
		                        } else {
						            var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
						              return parseInt(h, 16)
						            }));
						            var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
						              return parseInt(h, 16)
						            }));
						            shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
						            this.storage.set('shared_secret-' + dh_public_key.substr(0, 26) + dh_private_key.substr(0, 26), shared_secret);

				                }
			                    // camera permission was granted
			                    this.transactionService.pushTransaction({
			                    	dh_public_key: dh_public_key,
			                    	dh_private_key: dh_private_key,
			                        relationship: {
			                            chatText: this.chatText 
			                        },
			                        shared_secret: shared_secret,
			                        blockchainurl: this.blockchainAddress,
			                        resolve: resolve,
			                        rid: this.rid
			                    });
				            } else {
					            let alert = this.alertCtrl.create();
					            alert.setTitle('Friendship not yet processed');
					            alert.setSubTitle('Please wait a few minutes and try again');
					            alert.addButton('Ok');
					            alert.present();
					            resolve(false);	            	
				            }
		        		});
		            });
	        	}).then((result) => {
			        this.cryptoGenModal.dismiss();
			        if (result) {
					    let alert = this.alertCtrl.create();
					    alert.setTitle('Message sent');
					    alert.setSubTitle('Your message has been sent successfully');
					    alert.addButton('Ok');
					    alert.present();
			        }
			        this.navCtrl.pop();
	        	});
	       	}
        });
		alert.present();
    }

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }

    toHex(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }
}