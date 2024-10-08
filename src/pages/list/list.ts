import { Component } from "@angular/core";
import { List, NavController, NavParams, ToastController } from "ionic-angular";
import { AlertController, LoadingController } from "ionic-angular";
import { Storage } from "@ionic/storage";
import { GraphService } from "../../app/graph.service";
import { BulletinSecretService } from "../../app/bulletinSecret.service";
import { WalletService } from "../../app/wallet.service";
import { TransactionService } from "../../app/transaction.service";
import { SettingsService } from "../../app/settings.service";
import { SocialSharing } from "@ionic-native/social-sharing";
import { ChatPage } from "../chat/chat";
import { ProfilePage } from "../profile/profile";
import { SignatureRequestPage } from "../signaturerequest/signaturerequest";
import { Events } from "ionic-angular";
import { Http } from "@angular/http";
import { MailPage } from "../mail/mail";
import { MailItemPage } from "../mail/mailitem";
import { WebSocketService } from "../../app/websocket.service";
import { CalendarPage } from "../calendar/calendar";
import { MarketPage } from "../markets/market";

declare var X25519;
declare var foobar;

@Component({
  selector: "page-list",
  templateUrl: "list.html",
})
export class ListPage {
  selectedItem: any;
  pageTitle: any;
  icons: string[];
  items: Array<{ pageTitle: string; identity: object; item: object }>;
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
  subitems: any;
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
    private settingsService: SettingsService,
    private toastCtrl: ToastController,
    private websocketService: WebSocketService
  ) {
    this.loadingModal = this.loadingCtrl.create({
      content: "Please wait...",
    });
    this.refresh(null).catch((e) => {
      console.log(e);
    });
    events.subscribe("notification", () => {
      this.settingsService.menu === "notifications" && this.choosePage();
    });
  }

  refresh(refresher) {
    this.subitems = {};
    this.loading = true;
    this.loadingBalance = true;

    // If we navigated to this page, we will have an item available as a nav param
    return this.storage
      .get("blockchainAddress")
      .then((blockchainAddress) => {
        this.blockchainAddress = blockchainAddress;
        return this.storage.get("baseUrl");
      })
      .then((baseUrl) => {
        this.baseUrl = baseUrl;
        this.selectedItem = this.navParams.get("item");
        this.context = this.navParams.get("context");
        this.pageTitle = this.selectedItem
          ? this.selectedItem.pageTitle
          : this.navParams.get("pageTitle").title;
        return this.choosePage();
      })
      .then(() => {
        if (refresher) refresher.complete();
      });
  }

  createGroup() {
    this.graphService
      .getInfo()
      .then(() => {
        return new Promise((resolve, reject) => {
          let alert = this.alertCtrl.create({
            title: "Group name",
            inputs: [
              {
                name: "groupname",
                placeholder: "Group name",
              },
            ],
            buttons: [
              {
                text: "Save",
                handler: (data) => {
                  const toast = this.toastCtrl.create({
                    message: "Group created",
                    duration: 2000,
                  });
                  toast.present();
                  resolve(data.groupname);
                },
              },
            ],
          });
          alert.present();
        });
      })
      .then((groupName) => {
        return this.graphService.createGroup(groupName);
      })
      .then((identity) => {
        this.websocketService.joinGroup(identity);
        return this.choosePage();
      });
  }

  choosePage() {
    return new Promise((resolve, reject) => {
      if (!this.selectedItem) {
        this.label = this.navParams.get("pageTitle").label;
        // Let's populate this page with some filler content for funzies
        this.icons = [
          "flask",
          "wifi",
          "beer",
          "football",
          "basketball",
          "paper-plane",
          "american-football",
          "boat",
          "bluetooth",
          "build",
        ];
        var public_key = "";
        var graphArray = [];
        if (this.pageTitle == "Contacts") {
          graphArray = this.graphService.graph.friends.filter((item) => {
            return !!item.relationship[
              this.settingsService.collections.CONTACT
            ];
          });
          graphArray = this.getDistinctFriends(graphArray).friend_list;
          this.graphService.sortTxnsByUsername(
            graphArray,
            false,
            this.settingsService.collections.CONTACT
          );
          this.makeList(graphArray, "Contacts", null);
          this.loading = false;
        } else if (this.pageTitle == "Groups") {
          this.subitems = {};
          for (let i = 0; i < this.graphService.graph.groups.length; i++) {
            let item = this.graphService.graph.groups[i];
            let parentIdentity = this.graphService.getParentIdentityFromTxn(
              item,
              this.settingsService.collections.GROUP
            );
            let itemIdentity = this.graphService.getIdentityFromTxn(
              item,
              this.settingsService.collections.GROUP
            );
            if (parentIdentity) {
              this.subitems[parentIdentity.username_signature] =
                this.subitems[parentIdentity.username_signature] || [];
              this.subitems[parentIdentity.username_signature].push({
                pageTitle: this.pageTitle,
                identity: itemIdentity,
                item: item,
              });
            } else {
              graphArray.push(item);
            }
          }
          this.graphService.sortTxnsByUsername(
            graphArray,
            false,
            this.settingsService.collections.GROUP
          );
          this.makeList(graphArray, "Groups", null);
          this.loading = false;
        } else if (this.pageTitle == "Markets") {
          this.loading = false;
          this.graphService.sortTxnsByUsername(this.graphService.graph.markets);
          let marketList = this.graphService.graph.markets.filter((item) => {
            let parentIdentity = this.graphService.getParentIdentityFromTxn(
              item,
              this.settingsService.collections.MARKET
            );
            if (parentIdentity) {
              this.subitems[parentIdentity.username_signature] =
                this.subitems[parentIdentity.username_signature] || [];
              let identity = this.graphService.getIdentityFromTxn(
                item,
                this.settingsService.collections.MARKET
              );
              this.subitems[parentIdentity.username_signature].push({
                title: "Markets",
                label: identity.username,
                component: MarketPage,
                count: false,
                color: "",
                kwargs: {
                  item: item,
                  identity: identity,
                  subitems: this.subitems,
                },
                root: true,
              });
            }
            return !parentIdentity;
          });
          return this.makeList(marketList, "", {
            title: "Markets",
            component: MarketPage,
          }).then((pages) => {
            this.events.publish("menu", pages);
            this.loading = false;
          });
        } else if (this.pageTitle == "Messages") {
          public_key = this.bulletinSecretService.key
            .getPublicKeyBuffer()
            .toString("hex");
          return this.graphService
            .getNewMessages()
            .then((graphArray) => {
              var messages = this.markNew(
                public_key,
                graphArray,
                this.graphService.new_messages_counts
              );
              var friendsWithMessagesList = this.getDistinctFriends(messages);
              this.populateRemainingFriends(
                friendsWithMessagesList.friend_list,
                friendsWithMessagesList.used_rids
              );
              this.loading = false;
              this.graphService.sortTxnsByUsername(
                friendsWithMessagesList.friend_list,
                false,
                this.settingsService.collections.CONTACT
              );
              return this.makeList(friendsWithMessagesList.friend_list, "", {
                title: "Messages",
                component: ChatPage,
              }).then((pages) => {
                this.events.publish("menu", pages);
              });
            })
            .catch((err) => {
              console.log(err);
            });
        } else if (this.pageTitle == "Notifications") {
          public_key = this.bulletinSecretService.key
            .getPublicKeyBuffer()
            .toString("hex");
          const notifications = this.graphService.getNotifications();
          this.loading = false;
          notifications["notifications"].sort(function (a, b) {
            try {
              if (parseInt(a.time) < parseInt(b.time)) return 1;
              if (parseInt(a.time) > parseInt(b.time)) return -1;
              return 0;
            } catch (err) {
              return 0;
            }
          });
          notifications["notifications"].map((item) => {
            if (
              item.relationship[this.settingsService.collections.MAIL] ||
              item.relationship[this.settingsService.collections.GROUP_MAIL]
            ) {
              item.component = MailItemPage;
              item.item = this.graphService.prepareMailItem(item, "Inbox");
              const identity =
                this.graphService.getIdentityFromMessageTransaction(item);
              item.label = "Mail from " + identity.username;
            } else if (
              item.relationship[this.settingsService.collections.CHAT] ||
              item.relationship[this.settingsService.collections.GROUP_CHAT]
            ) {
              item.component = ChatPage;
              const identity =
                this.graphService.getIdentityFromMessageTransaction(item);
              item.identity = identity;
              item.label = "Chat from " + identity.username;
            } else if (
              item.relationship[this.settingsService.collections.CALENDAR] ||
              item.relationship[this.settingsService.collections.GROUP_CALENDAR]
            ) {
              item.component = CalendarPage;
              const identity =
                this.graphService.getIdentityFromMessageTransaction(item);
              item.identity = identity;
              item.label = "Calendar entry from " + identity.username;
            } else if (
              this.graphService.graph.friend_requests.filter((fr) => {
                return fr.rid === item.rid;
              }).length > 0
            ) {
              item.component = ListPage;
              const identity = this.graphService.getIdentityFromTxn(item);
              item.identity = identity;
              item.label = "Contact request from " + identity.username;
              item.pageTitle = "Contact Requests";
              item.item = item;
            } else if (
              this.graphService.graph.friends.filter((f) => {
                return f.rid === item.rid;
              }).length > 0
            ) {
              item.component = ProfilePage;
              const identity =
                this.graphService.getIdentityFromMessageTransaction(item);
              item.identity = identity;
              item.label =
                "Contact " + identity.username + " accepted your request ";
              item.pageTitle = "Contacts";
              item.item = item;
            } else if (item.relationship.signature_request) {
              item.component = SignatureRequestPage;
            }
          });
          return this.makeList(notifications["notifications"], "", {
            title: "Notifications",
            component: ChatPage,
          }).then((pages: Array<Object>) => {
            pages.length > 0 && this.events.publish("menu", pages);
          });
        } else if (this.pageTitle == "Community") {
          public_key = this.bulletinSecretService.key
            .getPublicKeyBuffer()
            .toString("hex");
          this.loading = false;
          this.graphService.sortTxnsByUsername(this.graphService.graph.groups);
          let groupList = this.graphService.graph.groups.filter((item) => {
            let parentIdentity = this.graphService.getParentIdentityFromTxn(
              item,
              this.settingsService.collections.GROUP
            );
            if (parentIdentity) {
              this.subitems[parentIdentity.username_signature] =
                this.subitems[parentIdentity.username_signature] || [];
              let identity = this.graphService.getIdentityFromTxn(
                item,
                this.settingsService.collections.GROUP
              );
              this.subitems[parentIdentity.username_signature].push({
                title: "Community",
                label: identity.username,
                component: ChatPage,
                count: false,
                color: "",
                kwargs: {
                  item: item,
                  identity: identity,
                  subitems: this.subitems,
                },
                root: true,
              });
            }
            return !parentIdentity;
          });
          return this.makeList(groupList, "", {
            title: "Community",
            component: ChatPage,
          }).then((pages) => {
            this.events.publish("menu", pages);
            this.loading = false;
          });
        } else if (this.pageTitle == "Sent") {
          public_key = this.bulletinSecretService.key
            .getPublicKeyBuffer()
            .toString("hex");
          return this.graphService
            .getSentMessages()
            .then((graphArray) => {
              var messages = this.markNew(
                public_key,
                graphArray,
                this.graphService.new_messages_counts
              );
              var friendsWithMessagesList = this.getDistinctFriends(messages);
              this.populateRemainingFriends(
                friendsWithMessagesList.friend_list,
                friendsWithMessagesList.used_rids
              );
              this.loading = false;
              this.graphService.sortTxnsByUsername(
                friendsWithMessagesList.friend_list,
                false,
                this.settingsService.collections.CONTACT
              );
              return this.makeList(
                friendsWithMessagesList.friend_list,
                "Messages",
                null
              );
            })
            .catch((err) => {
              console.log(err);
            });
        } else if (this.pageTitle == "Sign Ins") {
          public_key = this.bulletinSecretService.key
            .getPublicKeyBuffer()
            .toString("hex");
          return this.graphService.getNewSignIns().then((graphArray) => {
            var sign_ins = this.markNew(
              public_key,
              graphArray,
              this.graphService.new_sign_ins_counts
            );
            var friendsWithSignInsList = this.getDistinctFriends(sign_ins);
            this.populateRemainingFriends(
              friendsWithSignInsList.friend_list,
              friendsWithSignInsList.used_rids
            );
            this.loading = false;
            return this.makeList(
              friendsWithSignInsList.friend_list,
              "Sing Ins",
              null
            );
          });
        } else if (this.pageTitle == "Contact Requests") {
          return this.graphService.getFriendRequests().then(() => {
            var graphArray = this.graphService.graph.friend_requests;
            this.graphService.sortTxnsByUsername(
              graphArray,
              false,
              this.settingsService.collections.CONTACT
            );
            this.loading = false;
            return this.makeList(graphArray, "Contact Requests", null);
          });
        } else if (this.pageTitle == "Sent Requests") {
          return this.graphService.getSentFriendRequests().then(() => {
            var graphArray = this.graphService.graph.sent_friend_requests;
            this.graphService.sortTxnsByUsername(
              graphArray,
              false,
              this.settingsService.collections.CONTACT
            );
            this.loading = false;
            return this.makeList(graphArray, "Sent Requests", null);
          });
        } else if (this.pageTitle == "Reacts Detail") {
          graphArray = this.navParams.get("detail");
          this.loading = false;
          return this.makeList(graphArray, "Reacts Detail", null);
        } else if (this.pageTitle == "Comment Reacts Detail") {
          graphArray = this.navParams.get("detail");
          this.loading = false;
          return this.makeList(graphArray, "Comment Reacts Detail", null);
        }
      } else {
        this.loading = false;
        this.loadingBalance = false;
        if (this.pageTitle == "Sent Requests") {
          resolve(null);
        } else if (this.pageTitle == "Contact Requests") {
          this.friend_request = this.navParams.get("item").item;
          resolve(null);
        } else if (this.pageTitle == "Sign Ins") {
          this.rid = this.navParams.get("item").transaction.rid;
          this.graphService
            .getSignIns(this.rid)
            .then((signIn: any) => {
              this.signIn = signIn[0];
              this.signInText = this.signIn.relationship.signIn;
              resolve(null);
            })
            .catch((e) => {
              console.log(e);
              reject(e);
            });
        }
      }
    });
  }

  markNew(public_key, graphArray, graphCount) {
    var collection = [];
    for (let i in graphArray) {
      if (
        public_key !== graphArray[i]["public_key"] &&
        graphCount[i] &&
        graphCount[i] < graphArray[i]["height"]
      ) {
        graphArray[i]["new"] = true;
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
    for (var i = 0; i < collection.length; i++) {
      // we could have multiple transactions per friendship
      // so make sure we're going using the rid once
      var item = collection[i];
      if (!this.graphService.friends_indexed[item.rid]) {
        continue;
      }
      if (
        used_rids.indexOf(this.graphService.friends_indexed[item.rid]) === -1
      ) {
        friend_list.push(item);
        used_rids.push(this.graphService.friends_indexed[item.rid]);
      }
    }
    return {
      friend_list: friend_list,
      used_rids: used_rids,
    };
  }

  populateRemainingFriends(friend_list, used_rids) {
    // now add everyone else
    let friendsAndGroupsList = this.graphService.graph.friends;
    for (var i = 0; i < friendsAndGroupsList.length; i++) {
      let rid;
      if (
        this.graphService.groups_indexed[friendsAndGroupsList[i].requested_rid]
      ) {
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
    const friendsAndGroupsList = this.graphService.graph.groups;
    for (var i = 0; i < friendsAndGroupsList.length; i++) {
      let rid;
      if (
        this.graphService.groups_indexed[friendsAndGroupsList[i].requested_rid]
      ) {
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

  makeList(graphArray, pageTitle: any, page: any) {
    return new Promise((resolve, reject) => {
      const items = [];
      this.items = [];
      for (let i = 0; i < graphArray.length; i++) {
        const item = graphArray[i];
        let identity =
          item.identity || this.graphService.getIdentityFromTxn(item);
        if (page) {
          const component = item.component || page.component;
          const label = identity && identity.username;
          items.push({
            title: page.title,
            label: item.label || label,
            component: component,
            count: false,
            color: "",
            kwargs: {
              item: item.item || item,
              identity: identity,
              subitems: this.subitems,
            },
            root: true,
          });
        } else {
          this.items.push({
            pageTitle: pageTitle,
            identity: identity,
            item: item,
          });
        }
      }
      resolve(items);
    });
  }

  newChat() {
    var item = { pageTitle: { title: "Friends" }, context: "newChat" };
    this.navCtrl.push(ListPage, item);
  }

  itemTapped(event, item) {
    if (this.pageTitle == "Messages") {
      this.navCtrl.push(ChatPage, item);
    } else if (this.pageTitle == "Community") {
      this.navCtrl.push(ChatPage, item);
    } else if (this.pageTitle == "Markets") {
      this.navCtrl.push(MarketPage, item);
    } else if (this.pageTitle == "Groups") {
      this.navCtrl.push(ProfilePage, item);
    } else if (this.pageTitle == "Contacts") {
      this.navCtrl.push(ProfilePage, item);
    } else if (this.pageTitle == "Notifications") {
      if (
        item.relationship[this.settingsService.collections.SIGNATURE_REQUEST]
      ) {
        this.navCtrl.push(SignatureRequestPage, item);
      } else if (item.relationship[this.settingsService.collections.MAIL]) {
        this.navCtrl.push(MailItemPage, item);
      }
    } else {
      this.navCtrl.push(ListPage, {
        item,
      });
    }
  }

  accept() {
    this.loading = true;
    const rids = this.graphService.generateRids(
      this.friend_request.relationship[this.settingsService.collections.CONTACT]
    );
    return this.graphService
      .addFriend(
        this.friend_request.relationship[
          this.settingsService.collections.CONTACT
        ],
        rids.rid,
        rids.requested_rid,
        this.friend_request.requested_rid
      )
      .then((txn) => {
        return this.graphService.refreshFriendsAndGroups();
      })
      .then(() => {
        this.loading = false;
        var alert = this.alertCtrl.create();
        alert.setTitle("Friend Accept Sent");
        alert.setSubTitle(
          "Your Friend Request acceptance has been submitted successfully."
        );
        alert.addButton("Ok");
        alert.present();
        this.navCtrl.setRoot(ListPage, {
          pageTitle: {
            title: "Contacts",
            label: "Contacts",
            component: ListPage,
            count: false,
            color: "",
          },
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  getIdentity() {
    return new Promise((resolve, reject) => {
      var buttons = [];
      buttons.push({
        text: "Add",
        handler: (data) => {
          resolve(data.identity);
        },
      });
      let alert = this.alertCtrl.create({
        inputs: [
          {
            name: "identity",
            placeholder: "Paste identity here...",
          },
        ],
        buttons: buttons,
      });
      alert.setTitle("Request contact");
      alert.setSubTitle("Paste the identity of your contact below");
      alert.present();
    });
  }

  addFriend() {
    return this.getPromo()
      .then((promo_code) => {
        if (this.settingsService.remoteSettings.restricted) {
          return this.getIdentity().then((data: any) => {
            return this.graphService.addFriendFromSkylink(data.identity);
          });
        }
        if (promo_code) {
          let promo;
          return this.graphService
            .getPromotion(promo_code)
            .then((promotion: any) => {
              promo =
                promotion.relationship[
                  this.settingsService.collections.AFFILIATE
                ].target;
              this.graphService.addFriend(
                promo,
                null,
                promotion.rid,
                promotion.requested_rid
              );
            })
            .then(() => {
              return this.graphService.addFriend(promo); // add friend to global context
            });
        } else {
          return this.getIdentity().then((identity: any) => {
            return this.graphService.addFriend(JSON.parse(identity));
          });
        }
      })
      .then(() => {
        let alert = this.alertCtrl.create();
        alert.setTitle("Contact added");
        alert.setSubTitle("Your contact was added successfully");
        alert.addButton("Ok");
        alert.present();
        return this.choosePage();
      });
  }

  addGroup() {
    let group;
    return this.getPromo()
      .then((promo_code) => {
        if (this.settingsService.remoteSettings.restricted) {
          return this.getIdentity().then((data: any) => {
            return this.graphService.addGroupFromSkylink(data.identity);
          });
        }
        if (promo_code) {
          return this.graphService
            .getPromotion(promo_code)
            .then((promotion: any) => {
              group =
                promotion.relationship[
                  this.settingsService.collections.AFFILIATE
                ].target;
              group.parent = this.graphService.toIdentity(
                promotion.relationship[
                  this.settingsService.collections.AFFILIATE
                ].contract
              );
              return this.graphService
                .addGroup(group, promotion.rid, null, promotion.requested_rid)
                .then(() => {
                  return this.graphService.addGroup(group); // add group to global context
                });
            });
        } else {
          return this.getIdentity().then((identity: any) => {
            group = identity;
            return this.graphService.addGroup(JSON.parse(identity));
          });
        }
      })
      .then(() => {
        this.websocketService.joinGroup(group);
        let alert = this.alertCtrl.create();
        alert.setTitle("Group added");
        alert.setSubTitle("Your group was added successfully");
        alert.addButton("Ok");
        alert.present();
        return this.choosePage();
      });
  }

  getPromo() {
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: "Do you have a promotion code?",
        subTitle: "If so, enter it now, otherwise, leave blank.",
        inputs: [
          {
            name: "promo",
            placeholder: "Promo code",
          },
        ],
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            handler: (data) => {
              console.log("Cancel clicked");
              reject("Cancel clicked");
            },
          },
          {
            text: "confirm",
            handler: (data) => {
              resolve(data.promo);
            },
          },
        ],
      });
      alert.present();
    });
  }

  sendSignIn() {
    let alert = this.alertCtrl.create();
    alert.setTitle("Approve transaction");
    alert.setSubTitle("You are about to spend 0.01 coins ( 0.01 fee)");
    alert.addButton("Cancel");
    alert.addButton({
      text: "Confirm",
      handler: (data: any) => {
        this.walletService
          .get()
          .then(() => {
            return this.graphService.getSharedSecretForRid(this.rid);
          })
          .then((result) => {
            if (result) {
              let alert = this.alertCtrl.create();
              alert.setTitle("Message sent");
              alert.setSubTitle("Your message has been sent successfully");
              alert.addButton("Ok");
              alert.present();
            }
            this.navCtrl.pop();
          });
      },
    });
    alert.present();
  }

  share(code) {
    this.socialSharing.share(code);
  }

  showChat() {
    var item = { pageTitle: { title: "Chat" } };
    this.navCtrl.push(ListPage, item);
  }

  showFriendRequests() {
    var item = { pageTitle: { title: "Friend Requests" } };
    this.navCtrl.push(ListPage, item);
  }

  toHex(byteArray) {
    var callback = function (byte) {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    };
    return Array.from(byteArray, callback).join("");
  }
}
