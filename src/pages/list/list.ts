import { Component } from '@angular/core';
import { List, NavController, NavParams } from 'ionic-angular';
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
import { ProfilePage } from '../profile/profile';
import { Events } from 'ionic-angular';
import { Http } from '@angular/http';

declare var X25519;
declare var foobar;

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
        var public_key = '';
        var graphArray = [];
        if (this.pageTitle == 'Contacts') {
          return this.graphService.getFriends()
          .then(() => {
            var graphArray = this.graphService.graph.friends;
            graphArray = this.getDistinctFriends(graphArray).friend_list;
            graphArray.sort(function (a, b) {
                if (a.relationship.identity.username.toLowerCase() < b.relationship.identity.username.toLowerCase())
                  return -1
                if ( a.relationship.identity.username.toLowerCase() > b.relationship.identity.username.toLowerCase())
                  return 1
                return 0
            });
            this.makeList(graphArray);
            this.loading = false;
          }).catch((err) => {
              console.log('listpage getFriends error: ' + err);
          });
        } else if (this.pageTitle == 'Groups') {
          return this.graphService.getGroups()
          .then(() => {
            graphArray = this.graphService.graph.groups;
            graphArray.sort(function (a, b) {
                if (a.relationship.username.toLowerCase() < b.relationship.username.toLowerCase())
                  return -1
                if ( a.relationship.username.toLowerCase() > b.relationship.username.toLowerCase())
                  return 1
                return 0
            });
            this.makeList(graphArray);
            this.loading = false;
          }).catch((err) => {
              console.log(err);
          });
        } else if (this.pageTitle == 'Messages') {
          public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          return this.graphService.getFriends()
          .then(() => {
            return this.graphService.getGroups();
          })
          .then(() => {
            return this.graphService.getNewMessages();
          })
          .then((graphArray) => {
            var messages = this.markNew(public_key, graphArray, this.graphService.new_messages_counts);
            var friendsWithMessagesList = this.getDistinctFriends(messages);
            this.populateRemainingFriends(friendsWithMessagesList.friend_list, friendsWithMessagesList.used_rids);
            this.loading = false;
            friendsWithMessagesList.friend_list.sort(function (a, b) {
                const ausername = a.relationship.identity ? a.relationship.identity.username : a.relationship.username
                const busername = b.relationship.identity ? b.relationship.identity.username : b.relationship.username
                if (ausername.toLowerCase() < busername.toLowerCase())
                  return -1
                if ( ausername.toLowerCase() > busername.toLowerCase())
                  return 1
                return 0
            });
            return this.makeList(friendsWithMessagesList.friend_list);
          }).catch((err) => {
              console.log(err);
          });
        } else if (this.pageTitle == 'Sent') {
          public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          return this.graphService.getFriends()
          .then(() => {
            return this.graphService.getSentMessages();
          })
          .then((graphArray) => {
            var messages = this.markNew(public_key, graphArray, this.graphService.new_messages_counts);
            var friendsWithMessagesList = this.getDistinctFriends(messages);
            this.populateRemainingFriends(friendsWithMessagesList.friend_list, friendsWithMessagesList.used_rids);
            this.loading = false;
            friendsWithMessagesList.friend_list.sort(function (a, b) {
                if (a.relationship.identity.username.toLowerCase() < b.relationship.identity.username.toLowerCase())
                  return -1
                if ( a.relationship.identity.username.toLowerCase() > b.relationship.identity.username.toLowerCase())
                  return 1
                return 0
            });
            return this.makeList(friendsWithMessagesList.friend_list);
          }).catch((err) => {
              console.log(err);
          });
        } else if (this.pageTitle == 'Sign Ins') {
          public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
          return this.graphService.getFriends()
          .then(() => {
            return this.graphService.getNewSignIns();
          })
          .then((graphArray) => {
              var sign_ins = this.markNew(public_key, graphArray, this.graphService.new_sign_ins_counts);
              var friendsWithSignInsList = this.getDistinctFriends(sign_ins);
              this.populateRemainingFriends(friendsWithSignInsList.friend_list, friendsWithSignInsList.used_rids);
              this.loading = false;
              return this.makeList(friendsWithSignInsList.friend_list);
          }).catch(() => {
              console.log('listpage getFriends or getNewSignIns error');
          });
        } else if (this.pageTitle == 'Contact Requests') {
          return this.graphService.getFriendRequests()
          .then(() => {
              var graphArray = this.graphService.graph.friend_requests;
              graphArray.sort(function (a, b) {
                  if (a.relationship.identity.username.toLowerCase() < b.relationship.identity.username.toLowerCase())
                    return -1
                  if ( a.relationship.identity.username.toLowerCase() > b.relationship.identity.username.toLowerCase())
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
                  if (a.relationship.identity.username.toLowerCase() < b.relationship.identity.username.toLowerCase())
                    return -1
                  if ( a.relationship.identity.username.toLowerCase() > b.relationship.identity.username.toLowerCase())
                    return 1
                  return 0
              });
              this.loading = false;
              return this.makeList(graphArray);
          }).catch(() => {
              console.log('listpage getSentFriendRequests error');
          });
        } else if (this.pageTitle == 'Reacts Detail') {
          graphArray = this.navParams.get('detail');
          this.loading = false;
          return this.makeList(graphArray);
        } else if (this.pageTitle == 'Comment Reacts Detail') {
          graphArray = this.navParams.get('detail');
          this.loading = false;
          return this.makeList(graphArray);
        }
      } else {
        this.loading = false;
        this.loadingBalance = false;
        if (this.pageTitle == 'Sent Requests') {
          resolve();
        }
        else if (this.pageTitle == 'Contact Requests') {
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
            reject('listpage getSignIns error');
          });
        }
      }
    });
  }

  markNew(public_key, graphArray, graphCount) {
    var collection = [];
    for (let i in graphArray) {
      if(public_key !== graphArray[i]['public_key'] && graphCount[i] && graphCount[i] < graphArray[i]['height']) {
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
      if(!this.graphService.groups_indexed[item.requested_rid] && !this.graphService.friends_indexed[item.rid]) {
        continue
      }
      if(used_rids.indexOf(this.graphService.groups_indexed[item.requested_rid] || this.graphService.friends_indexed[item.rid]) === -1) {
        friend_list.push(item);
        used_rids.push(this.graphService.groups_indexed[item.requested_rid] || this.graphService.friends_indexed[item.rid]);
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
      if(!item.relationship || !item.relationship.identity) {
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
    const friendsAndGroupsList = this.graphService.graph.friends.concat(this.graphService.graph.groups)
    for (var i=0; i < friendsAndGroupsList.length; i++) {
      let rid;
      if(this.graphService.groups_indexed[friendsAndGroupsList[i].requested_rid]) {
        rid = friendsAndGroupsList[i].requested_rid;
      } else {
        rid = friendsAndGroupsList[i].rid;
      }
      if (used_rids.indexOf(rid) === -1) {
        friend_list.push(friendsAndGroupsList[i]);
        used_rids.push(rid);
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
      this.navCtrl.push(ProfilePage, {
        item: item.transaction,
        group: this.graphService.isGroup(item.transaction.relationship.group)
      });
    } else if(this.pageTitle == 'Contacts') {
      this.navCtrl.push(ProfilePage, {
        item: item.transaction
      });
    } else {
      this.navCtrl.push(ListPage, {
        item: item
      });
    }
  }

  accept() {
    return this.graphService.addFriend(
      {
        username: this.friend_request.relationship.identity.username,
        username_signature: this.friend_request.relationship.identity.username_signature,
        public_key: this.friend_request.relationship.identity.public_key
      },
      this.friend_request.rid,
      this.friend_request.requester_rid,
      this.friend_request.requested_rid
    ).then((txn) => {
      return this.graphService.getFriends();
    }).then((txn) => {
      return this.graphService.getFriendRequests();
    })
    .then(() => {
      var alert = this.alertCtrl.create();
      alert.setTitle('Friend Accept Sent');
      alert.setSubTitle('Your Friend Request acceptance has been submitted successfully.');
      alert.addButton('Ok');
      alert.present();
      this.navCtrl.setRoot(ListPage, {pageTitle: { title: 'Contacts', label: 'Contacts', component: ListPage, count: false, color: '' }});
    }).catch((err) => {
        console.log(err);
    });
  }

  addFriend() {
      var buttons = [];
      buttons.push({
          text: 'Add',
          handler: (data) => {
              this.graphService.addFriend(JSON.parse(data.identity))
          }
      });
      let alert = this.alertCtrl.create({
          inputs: [
              {
                  name: 'identity',
                  placeholder: 'Paste identity here...'
              }
          ],
          buttons: buttons
      });
      alert.setTitle('Request contact');
      alert.setSubTitle('Paste the identity of your contact below');
      alert.present();
  }

  addGroup() {
      var buttons = [];
      buttons.push({
          text: 'Add',
          handler: (data) => {
              this.graphService.addGroup(JSON.parse(data.identity))
          }
      });
      let alert = this.alertCtrl.create({
          inputs: [
              {
                  name: 'identity',
                  placeholder: 'Paste identity here...'
              }
          ],
          buttons: buttons
      });
      alert.setTitle('Add group');
      alert.setSubTitle('Paste the identity of your contact below');
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
