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
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        public transactionService: TransactionService,
        public alertCtrl: AlertController,
        public graphService: GraphService
    ) {
    	this.rid = navParams.data.item.transaction.rid;
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            this.blockchainAddress = blockchainAddress;
        });
        if(graphService.graph.chats[this.rid]) {
	        var chats = graphService.graph.chats[this.rid].sort(function (a, b) {
	            if (a.block_height < b.block_height)
	              return -1
	            if (a.block_height > b.block_height)
	              return 1
	            return 0
	        });
	        this.chats = chats;
        } else {
        	this.chats = [];
        }
    }

    send() {
        this.walletService.get().then(() => {
        	return new Promise((resolve, reject) => {

	            console.log(status);
	            var dh_public_key = this.graphService.graph.keys[this.rid].dh_public_keys[0];
	            var dh_private_key = this.graphService.graph.keys[this.rid].dh_private_keys[0];
	            let alert = this.alertCtrl.create();
	            alert.setTitle('Approve Transaction');
	            alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
	            alert.addButton('Cancel');
	            alert.addButton({
	                text: 'Confirm',
	                handler: (data: any) => {
	                    // camera permission was granted
	                    this.transactionService.pushTransaction({
	                    	dh_public_key: dh_public_key,
	                    	dh_private_key: dh_private_key,
	                        relationship: {
	                            chatText: this.chatText 
	                        },
	                        blockchainurl: this.blockchainAddress,
	                        resolve: resolve,
	                        rid: this.rid
	                    });
	                }
	            });
	            alert.present();
        	}).then(() => {
        		alert('sent');
        	});
        });
    }

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }
}