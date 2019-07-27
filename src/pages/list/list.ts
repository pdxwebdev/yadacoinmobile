import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AlertController, LoadingController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { SettingsService } from '../../app/settings.service';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ChatPage } from '../chat/chat';
import { GroupPage } from '../group/group';
import { Events } from 'ionic-angular';
import { Http, RequestOptions } from '@angular/http';

declare var X25519;

@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})
export class ListPage {
  selectedItem: any;
  pageTitle: any;
  icons: string[];
  items: Array<{pageTitle: string, transaction: object}>;
  blockchainAddress: any;
  balance: any;
  baseUrl: any;
  createdCode: any;
  confirmCode: any;
  loading: any;
  loadingBalance: any;
  loadingModal: any;
  createdCodeEncoded: any;
  friend_request: any;
  context: any;
  signIn: any;
  signInText: any;
  rid: any;
  label: any;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private walletService: WalletService,
    private transactionService: TransactionService,
    private socialSharing: SocialSharing,
    private alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    public events: Events,
    private ahttp: Http,
    private settingsService: SettingsService
  ) {
    this.loadingModal = this.loadingCtrl.create({
        content: 'Please wait...'
    });
    this.refresh(null)
    .catch(() => {
      console.log('error refreshing listpage')
    });

  }

  refresh(refresher) {
    return this.walletService.get()
    .then(() => {
      this.loading = true;
      this.loadingBalance = true;

      // If we navigated to this page, we will have an item available as a nav param
      return this.storage.get('blockchainAddress');
    })
    .then((blockchainAddress) => {
        this.blockchainAddress = blockchainAddress;
        return this.storage.get('baseUrl')
    })
    .then((baseUrl) => {
      this.baseUrl = baseUrl;
      this.selectedItem = this.navParams.get('item');
      this.context = this.navParams.get('context');
      this.pageTitle = this.selectedItem ? this.selectedItem.pageTitle : this.navParams.get('pageTitle').title;
      return this.choosePage();
    })
    .then(() => {
      if(refresher) refresher.complete();
    }).catch(() => {
        console.log('listpage walletService error');
    });
  }

  choosePage() {
    return new Promise((resolve, reject) => {
      if(!this.selectedItem) {
        this.label = this.navParams.get('pageTitle').label;
        // Let's populate this page with some filler content for funzies
        this.icons = ['flask', 'wifi', 'beer', 'football', 'basketball', 'paper-plane',
        'american-football', 'boat', 'bluetooth', 'build'];
        if (this.pageTitle == 'Friends') {
          return this.graphService.getFriends()
          .then(() => {
            var graphArray = this.graphService.graph.friends;
            graphArray = this.getDistinctFriends(graphArray).friend_list;
            graphArray.sort(function (a, b) {
                if (a.relationship.their_username.toLowerCase() < b.relationship.their_username.toLowerCase())
                  return -1
                if ( a.relationship.their_username.toLowerCase() > b.relationship.their_username.toLowerCase())
                  return 1
                return 0
            });
            this.makeList(graphArray);
            this.loading = false;
          }).catch((err) => {
              console.log('listpage getFriends error: ' + err);
          });
        } else if (this.pageTitle == 'Groups') {
          var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          return this.graphService.getGroups()
          .then(() => {
            return this.graphService.getNewGroupMessages();
          })
          .then((graphArray) => {
            var messages = this.markNew(my_public_key, graphArray, this.graphService.new_group_messages_counts);
            var groupsWithMessagesList = this.getDistinctGroups(messages);
            this.populateRemainingGroups(groupsWithMessagesList.group_list, groupsWithMessagesList.used_rids);
            this.loading = false;
            groupsWithMessagesList.group_list.sort(function (a, b) {
                if (a.relationship.their_username.toLowerCase() < b.relationship.their_username.toLowerCase())
                  return -1
                if ( a.relationship.their_username.toLowerCase() > b.relationship.their_username.toLowerCase())
                  return 1
                return 0
            });
            return this.makeList(groupsWithMessagesList.group_list);
          }).catch((err) => {
              console.log(err);
          });
        } else if (this.pageTitle == 'Messages') {
          var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          return this.graphService.getFriends()
          .then(() => {
            return this.graphService.getNewMessages();
          })
          .then((graphArray) => {
            var messages = this.markNew(my_public_key, graphArray, this.graphService.new_messages_counts);
            var friendsWithMessagesList = this.getDistinctFriends(messages);
            this.populateRemainingFriends(friendsWithMessagesList.friend_list, friendsWithMessagesList.used_rids);
            this.loading = false;
            friendsWithMessagesList.friend_list.sort(function (a, b) {
                if (a.relationship.their_username.toLowerCase() < b.relationship.their_username.toLowerCase())
                  return -1
                if ( a.relationship.their_username.toLowerCase() > b.relationship.their_username.toLowerCase())
                  return 1
                return 0
            });
            return this.makeList(friendsWithMessagesList.friend_list);
          }).catch((err) => {
              console.log(err);
          });
        } else if (this.pageTitle == 'Sign Ins') {
          var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          return this.graphService.getFriends()
          .then(() => {
            return this.graphService.getNewSignIns();
          })
          .then((graphArray) => {
              var sign_ins = this.markNew(my_public_key, graphArray, this.graphService.new_sign_ins_counts);
              var friendsWithSignInsList = this.getDistinctFriends(sign_ins);
              this.populateRemainingFriends(friendsWithSignInsList.friend_list, friendsWithSignInsList.used_rids);
              this.loading = false;
              return this.makeList(friendsWithSignInsList.friend_list);
          }).catch(() => {
              console.log('listpage getFriends or getNewSignIns error');
          });
        } else if (this.pageTitle == 'Friend Requests') {
          return this.graphService.getFriendRequests()
          .then(() => {
              var graphArray = this.graphService.graph.friend_requests;
              graphArray.sort(function (a, b) {
                  if (a.username.toLowerCase() < b.username.toLowerCase())
                    return -1
                  if ( a.username.toLowerCase() > b.username.toLowerCase())
                    return 1
                  return 0
              });
              this.loading = false;
              return this.makeList(graphArray);
          }).catch(() => {
              console.log('listpage getFriendRequests error');
          });
        } else if (this.pageTitle == 'Sent Requests') {
          return this.graphService.getSentFriendRequests()
          .then(() => {
              var graphArray = this.graphService.graph.sent_friend_requests;
              graphArray.sort(function (a, b) {
                  if (a.username.toLowerCase() < b.username.toLowerCase())
                    return -1
                  if ( a.username.toLowerCase() > b.username.toLowerCase())
                    return 1
                  return 0
              });
              this.loading = false;
              return this.makeList(graphArray);
          }).catch(() => {
              console.log('listpage getSentFriendRequests error');
          });
        } else if (this.pageTitle == 'Reacts Detail') {
          var graphArray = this.navParams.get('detail');
          this.loading = false;
          return this.makeList(graphArray);
        } else if (this.pageTitle == 'Comment Reacts Detail') {
          var graphArray = this.navParams.get('detail');
          this.loading = false;
          return this.makeList(graphArray);
        }
      } else {
        this.loading = false;
        this.loadingBalance = false;
        if (this.pageTitle == 'Sent Requests') {
          resolve();
        }
        else if (this.pageTitle == 'Friend Requests') {
          this.friend_request = this.navParams.get('item').transaction;
          resolve();
        }
        else if (this.pageTitle == 'Sign Ins') {
          this.rid = this.navParams.get('item').transaction.rid;
          this.graphService.getSignIns(this.rid)
          .then((signIn: any) => {
            this.signIn = signIn[0];
            this.signInText = this.signIn.relationship.signIn;
            resolve();
          }).catch(() => {
            console.log('listpage getSignIns error');
            reject();
          });
        }
      }
    });
  }

  markNew(my_public_key, graphArray, graphCount) {
    var collection = [];
    for (let i in graphArray) {
      if(my_public_key !== graphArray[i]['public_key'] && graphCount[i] && graphCount[i] < graphArray[i]['height']) {
        graphArray[i]['new'] = true;
      }
      collection.push(graphArray[i]);
    }
    return collection;
  }

  getDistinctFriends(collection) {
    // using the rids from new items
    // make a list of friends sorted by block height descending (most recent)
    var friend_list = [];
    var used_rids = [];
    for (var i=0; i < collection.length; i++) {
      // we could have multiple transactions per friendship
      // so make sure we're going using the rid once
      var item = collection[i];
      if(!item.relationship || !item.relationship.their_username) {
        continue
      }
      if(used_rids.indexOf(item.rid) === -1) {
        friend_list.push(item);
        used_rids.push(item.rid);
      }
    }
    return {
      friend_list: friend_list,
      used_rids: used_rids
    };
  }

  getDistinctGroups(collection) {
    // using the rids from new items
    // make a list of friends sorted by block height descending (most recent)
    var group_list = [];
    var used_rids = [];
    for (var i=0; i < collection.length; i++) {
      // we could have multiple transactions per friendship
      // so make sure we're going using the rid once
      var item = collection[i];
      if(!item.relationship || !item.relationship.their_username) {
        continue
      }
      if(used_rids.indexOf(item.rid) === -1) {
        group_list.push(item);
        used_rids.push(item.rid);
      }
    }
    return {
      group_list: group_list,
      used_rids: used_rids
    };
  }

  populateRemainingFriends(friend_list, used_rids) {
    // now add everyone else
    for (var i=0; i < this.graphService.graph.friends.length; i++) {
      if (used_rids.indexOf(this.graphService.graph.friends[i].rid) === -1) {
        friend_list.push(this.graphService.graph.friends[i]);
        used_rids.push(this.graphService.graph.friends[i].rid);
      }
    }
  }

  populateRemainingGroups(friend_list, used_rids) {
    // now add everyone else
    for (var i=0; i < this.graphService.graph.groups.length; i++) {
      if (used_rids.indexOf(this.graphService.graph.groups[i].rid) === -1) {
        friend_list.push(this.graphService.graph.groups[i]);
        used_rids.push(this.graphService.graph.groups[i].rid);
      }
    }
  }

  makeList(graphArray) {
    return new Promise((resolve, reject) => {
      this.items = [];
      for (let i = 0; i < graphArray.length; i++) {
        this.items.push({
          pageTitle: this.pageTitle,
          transaction: graphArray[i]
        });
      }
      resolve();
    })
  }

  newChat() {
    var item = {pageTitle: {title:"Friends"}, context: 'newChat'};
    this.navCtrl.push(ListPage, item);
  }

  itemTapped(event, item) {
    if(this.pageTitle == 'Messages') {
      this.navCtrl.push(ChatPage, {
        item: item
      });
    } else if(this.pageTitle == 'Groups') {
      this.navCtrl.push(GroupPage, {
        item: item
      });
    } else if(this.pageTitle == 'Friends' && this.context == 'newChat') {
      this.navCtrl.push(ChatPage, {
        item: item
      });
    } else {
      this.navCtrl.push(ListPage, {
        item: item
      });
    }
  }

  accept() {
    let alert = this.alertCtrl.create();
    alert.setTitle('Approve Transaction');
    alert.setSubTitle('You are about to spend 1.01 coins.');
    alert.addButton({
        text: 'Cancel',
        handler: (data: any) => {
            alert.dismiss();
        }
    });
    alert.addButton({
      text: 'Confirm',
      handler: (data: any) => {
        this.ahttp.get(this.settingsService.remoteSettings['baseUrl'] + '/search?requester_rid=' + this.friend_request.requester_rid + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
        .subscribe((res) => {
          let info = res.json();
          // camera permission was granted
          var requester_rid = info.requester_rid;
          var requested_rid = info.requested_rid;
          if (requester_rid && requested_rid) {
              // get rid from bulletin secrets
          } else {
              requester_rid = '';
              requested_rid = '';
          }
          //////////////////////////////////////////////////////////////////////////
          // create and send transaction to create the relationship on the blockchain
          //////////////////////////////////////////////////////////////////////////
          this.walletService.get().then(() => {
              var raw_dh_private_key = window.crypto.getRandomValues(new Uint8Array(32));
              var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
              var dh_private_key = this.toHex(raw_dh_private_key);
              var dh_public_key = this.toHex(raw_dh_public_key);
              info.dh_private_key = dh_private_key;
              info.dh_public_key = dh_public_key;
              return this.transactionService.generateTransaction({
                  relationship: {
                      dh_private_key: info.dh_private_key,
                      their_bulletin_secret: info.bulletin_secret,
                      their_username: info.username,
                      my_bulletin_secret: this.bulletinSecretService.generate_bulletin_secret(),
                      my_username: this.bulletinSecretService.username
                  },
                  dh_public_key: info.dh_public_key,
                  requested_rid: info.requested_rid,
                  requester_rid: info.requester_rid,
                  to: info.to
              });
          }).then((hash) => {
              return new Promise((resolve, reject) => {
                  this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sign-raw-transaction', {
                      hash: hash, 
                      bulletin_secret: this.bulletinSecretService.bulletin_secret,
                      input: this.transactionService.transaction.inputs[0].id,
                      id: this.transactionService.transaction.id,
                      txn: this.transactionService.transaction
                  })
                  .subscribe((res) => {
                      //this.loadingModal2.dismiss();
                      try {
                        let data = res.json();
                        this.transactionService.transaction.signatures = [data.signature]
                          resolve();
                      } catch(err) {
                          reject();
                          this.loadingModal.dismiss().catch(() => {});
                      }
                  },
                  (err) => {
                      //this.loadingModal2.dismiss();
                  });
              });
          }).then((txn) => {
              return this.transactionService.sendTransaction();
          }).then((txn) => {
            var alert = this.alertCtrl.create();
            alert.setTitle('Friend Accept Sent');
            alert.setSubTitle('Your Friend Request acceptance has been submitted successfully.');
            alert.addButton('Ok');
            alert.present();
            
            this.refresh(null).then(() => {
              this.navCtrl.pop();
            });
          }).catch((err) => {
              console.log(err);
          });
        },
        (err) => {
            //this.loadingModal2.dismiss();
            console.log(err);
        });
      }
    });
    alert.present();
  }

  sendSignIn() {
    let alert = this.alertCtrl.create();
    alert.setTitle('Approve transaction');
    alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
    alert.addButton('Cancel');
    alert.addButton({
      text: 'Confirm',
      handler: (data: any) => {
        this.walletService.get().then(() => {
            return this.graphService.getSharedSecretForRid(this.rid);
        }).then((result) => {
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

  share(code) {
    this.socialSharing.share(code);
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
