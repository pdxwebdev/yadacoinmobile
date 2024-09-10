import { Component, Injectable } from "@angular/core";
import {
  NavController,
  NavParams,
  Platform,
  ToastController,
} from "ionic-angular";
import { Storage } from "@ionic/storage";
import { SettingsService } from "../../app/settings.service";
import { PeerService } from "../../app/peer.service";
import { BulletinSecretService } from "../../app/bulletinSecret.service";
import { FirebaseService } from "../../app/firebase.service";
import { ListPage } from "../list/list";
import { AlertController, LoadingController } from "ionic-angular";
import { GraphService } from "../../app/graph.service";
import { WalletService } from "../../app/wallet.service";
import { TransactionService } from "../../app/transaction.service";
import { SocialSharing } from "@ionic-native/social-sharing";
import { Events } from "ionic-angular";
import { HomePage } from "../home/home";
import { Http, Headers, RequestOptions } from "@angular/http";
import { SendReceive } from "../sendreceive/sendreceive";
import {
  GoogleMaps,
  GoogleMapsEvent,
  LatLng,
  MarkerOptions,
  Marker,
  Environment,
  GoogleMapsMapTypeId,
} from "@ionic-native/google-maps";
import { WebSocketService } from "../../app/websocket.service";
import Groups from "../../app/groups";
import { MailPage } from "../mail/mail";

declare var forge;
declare var foobar;
declare var CenterIdentity;
declare var google;

@Component({
  selector: "page-settings",
  templateUrl: "settings.html",
})
export class Settings {
  baseUrl = null;
  blockchainAddress = null;
  graphproviderAddress = null;
  walletproviderAddress = null;
  siaAddress = null;
  siaPassword = null;
  keys = null;
  loadingModal = null;
  prefix = null;
  importedKey = null;
  activeKey = null;
  serverDown = false;
  noUsername = false;
  key = null;
  geoWalletUsername: any;
  identity: any;
  centerIdentityImportEnabled = false;
  centerIdentityExportEnabled = false;
  exportKeyEnabled = false;
  centerIdentityLocation: any;
  centerIdentityPrivateUsername = "";
  ci: any;
  centerIdentitySaveSuccess = false;
  centerIdentityImportSuccess = false;
  identitySkylink: any;
  busy: any;
  CIBusy: any;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private settingsService: SettingsService,
    private bulletinSecretService: BulletinSecretService,
    private firebaseService: FirebaseService,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    private storage: Storage,
    private graphService: GraphService,
    private socialSharing: SocialSharing,
    private walletService: WalletService,
    private websocketService: WebSocketService,
    private transactionService: TransactionService,
    public events: Events,
    public toastCtrl: ToastController,
    public peerService: PeerService,
    private ahttp: Http,
    private platform: Platform
  ) {
    if (typeof this.peerService.mode == "undefined")
      this.peerService.mode = true;
    this.prefix = "usernames-";
    this.ci = new CenterIdentity(
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      5
    );
    this.refresh(null)
      .then(() => {
        return this.peerService.go();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  loadMap(mapType) {
    /* The create() function will take the ID of your map element */
    const map = GoogleMaps.create("map-" + mapType, {
      mapType: GoogleMapsMapTypeId.HYBRID,
    });

    map.one(GoogleMapsEvent.MAP_READY).then((data: any) => {
      const coordinates: LatLng = new LatLng(41, -87);

      map.setCameraTarget(coordinates);
      map.setCameraZoom(8);
    });

    map.on(GoogleMapsEvent.MAP_CLICK).subscribe((e) => {
      map.clear();
      this.centerIdentityLocation = e[0];
      map.addMarker({
        position: e[0],
      });
    });
  }

  refresh(refresher) {
    this.noUsername = false;
    return this.bulletinSecretService
      .all()
      .then((keys) => {
        this.setKey(keys);
      })
      .then(() => {
        if (refresher) refresher.complete();
      });
  }

  setKey(keys) {
    var keys_indexed = {};
    for (var i = 0; i < keys.length; i++) {
      keys_indexed[keys[i].key] = keys[i].key;
    }
    var newKeys = [];
    this.storage
      .forEach((value, key) => {
        if (key.substr(0, this.prefix.length) === this.prefix) {
          let active =
            (this.bulletinSecretService.username || "") ==
            key.substr(this.prefix.length);
          newKeys.push({
            username: key.substr(this.prefix.length),
            key: value,
            active: active,
          });
          if (active) {
            this.activeKey = value;
          }
        }
      })
      .then(() => {
        newKeys.sort(function (a, b) {
          if (a.username.toLowerCase() < b.username.toLowerCase()) return -1;
          if (a.username.toLowerCase() > b.username.toLowerCase()) return 1;
          return 0;
        });
        this.keys = newKeys;
      })
      .then(() => {
        if (!this.activeKey) return;
        if (this.settingsService.remoteSettings.restricted) {
          this.busy = true;
          this.graphService
            .identityToSkylink(this.bulletinSecretService.identity)
            .then((skylink) => {
              this.identitySkylink = skylink;
              this.busy = false;
            });
        }
      });
  }

  exportKey() {
    let alert = this.alertCtrl.create();
    alert.setTitle("Export Key");
    alert.setSubTitle(
      "Warning: Never ever share this secret key with anybody but yourself!"
    );
    alert.addButton({
      text: "Ok",
      handler: (data: any) => {
        this.socialSharing.share(
          this.bulletinSecretService.key.toWIF(),
          "Export Secret Key"
        );
        this.exportKeyEnabled = true;
      },
    });
    alert.present();
  }

  importKey(wif = null) {
    return new Promise((resolve, reject) => {
      if (wif) return resolve(wif);
      let alert = this.alertCtrl.create({
        title: "Set WIF",
        inputs: [
          {
            name: "wif",
            placeholder: "WIF",
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
            text: "Continue",
            handler: (data) => {
              resolve(data.wif);
            },
          },
        ],
      });
      alert.present();
    })
      .then((wifkey) => {
        return new Promise((resolve, reject) => {
          wif = wifkey;
          let alert = this.alertCtrl.create({
            title: "Set username",
            inputs: [
              {
                name: "username",
                placeholder: "Username",
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
                text: "Save",
                handler: (data) => {
                  resolve(data.username);
                },
              },
            ],
          });
          alert.present();
        });
      })
      .then((username) => {
        return this.bulletinSecretService.import(wif, username);
      })
      .then((wif) => {
        const toast = this.toastCtrl.create({
          message: "Identity created",
          duration: 2000,
        });
        toast.present();
        this.importedKey = "";
        return this.refresh(null);
      })
      .catch(() => {
        const toast = this.toastCtrl.create({
          message: "Error importing identity!",
          duration: 2000,
        });
        toast.present();
      });
  }

  getUsername() {
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: "Set username",
        inputs: [
          {
            name: "username",
            placeholder: "Username",
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
            text: "Save",
            handler: (data) => {
              resolve(data.username);
            },
          },
        ],
      });
      alert.present();
    });
  }

  getInvite() {
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: "Set invite code",
        inputs: [
          {
            name: "invite",
            placeholder: "Invite",
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
            text: "Save",
            handler: (data) => {
              resolve(data.invite);
            },
          },
        ],
      });
      alert.present();
    }).then((skylink) => {
      return this.graphService.identityFromSkylink(skylink);
    });
  }

  getPromo() {
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: "Set promo code",
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

  createWalletFromInvite() {
    let promise;
    let username;
    let userType;
    let userParent;
    let invite;
    let promo;

    this.loadingModal = this.loadingCtrl.create({
      content: "initializing...",
    });
    this.loadingModal.present();

    promise = this.getInvite()
      .then(() => {
        return this.getPromo();
      })
      .then((inv: any) => {
        invite = inv;
        return this.graphService.checkInvite(invite);
      })
      .then((result: any) => {
        if (!result.status) {
          this.bulletinSecretService.unset();
          const toast = this.toastCtrl.create({
            message: result.message,
            duration: 10000,
          });
          toast.present();
          throw result.message;
        }
        userType = result.type;
        userParent = result.parent;
      })
      .then(() => {
        return this.createKey(invite.identifier);
      })
      .then(() => {
        invite = {
          ...invite,
          ...this.graphService.toIdentity(this.bulletinSecretService.identity),
        };
        return this.graphService.checkInvite(invite);
      })
      .then((): Promise<null | void> => {
        if (userType === "member_contact") {
          return this.joinGroup(userParent);
        } else if (userType === "organization_member") {
          return this.joinGroup(userParent);
        } else if (userType === "organization") {
          return this.joinGroup(this.settingsService.remoteSettings.identity);
        } else if (userType === "admin") {
          return new Promise((resolve, reject) => {
            return resolve(null);
          });
        }
      })
      .then(() => {
        return this.selectIdentity(
          this.bulletinSecretService.keyname.substr(this.prefix.length),
          false
        );
      })
      .then(() => {
        if (this.settingsService.remoteSettings["walletUrl"]) {
          return this.graphService.getInfo();
        }
      })
      .then(() => {
        return this.refresh(null);
      })
      .then(() => {
        this.loadingModal.dismiss();
      })
      .then(() => {
        const toast = this.toastCtrl.create({
          message: "Identity created",
          duration: 2000,
        });
        toast.present();
      })
      .catch(() => {
        this.events.publish("pages");
        this.loadingModal.dismiss();
      });
  }

  createWallet() {
    let promise;
    let username;
    let userType;
    let userParent;

    this.loadingModal = this.loadingCtrl.create({
      content: "initializing...",
    });
    this.loadingModal.present();

    return this.getUsername()
      .then((uname) => {
        username = uname;
        return this.createKey(username);
      })
      .then(() => {
        return this.refresh(null);
      })
      .then(() => {
        return this.selectIdentity(username, false);
      })
      .then(() => {
        return this.graphService.refreshFriendsAndGroups();
      })
      .then(() => {
        this.loadingModal.dismiss();
      })
      .catch(() => {
        this.loadingModal.dismiss();
      })
      .then(() => {
        const toast = this.toastCtrl.create({
          message: "Identity created",
          duration: 2000,
        });
        toast.present();
      });
  }

  createKey(username) {
    return new Promise((resolve, reject) => {
      this.bulletinSecretService.create(username).then(() => {
        return resolve(username);
      });
    })
      .then((key) => {
        return this.set(key);
      })
      .then(() => {
        return this.save();
      });
  }

  selectIdentity(key, showModal = true) {
    this.graphService.resetGraph();
    if (showModal) {
      this.loadingModal = this.loadingCtrl.create({
        content: "initializing...",
      });
      this.loadingModal.present();
    }
    if (this.settingsService.remoteSettings.restricted) {
      return this.set(key)
        .then(() => {
          return this.graphService.refreshFriendsAndGroups();
        })
        .then(() => {
          return this.graphService.getUserType(
            this.bulletinSecretService.identity.username
          );
        })
        .then((result: any): Promise<null | void> => {
          if (result.status) {
            const userType = result.type;
            this.bulletinSecretService.identity.type = result.type;
            this.bulletinSecretService.identity.parent = result.parent;
            if (userType === "member_contact") {
              if (
                !this.graphService.isAdded(
                  this.bulletinSecretService.identity.parent
                )
              )
                return this.joinGroup(
                  this.bulletinSecretService.identity.parent
                );
            } else if (userType === "organization_member") {
              if (
                !this.graphService.isAdded(
                  this.bulletinSecretService.identity.parent
                )
              )
                return this.joinGroup(
                  this.bulletinSecretService.identity.parent
                );
            } else if (userType === "organization") {
              if (
                !this.graphService.isAdded(
                  this.bulletinSecretService.identity.parent
                )
              )
                return this.joinGroup(
                  this.bulletinSecretService.identity.parent
                );
            } else if (userType === "admin") {
              return new Promise((resolve, reject) => {
                return resolve(null);
              });
            }
          } else {
            this.bulletinSecretService.unset();
            const toast = this.toastCtrl.create({
              message: result.message,
              duration: 10000,
            });
            toast.present();
            throw result.message;
          }
        })
        .then(() => {
          return this.websocketService.init();
        })
        .then(() => {
          if (showModal) {
            this.loadingModal.dismiss();
          }
          this.settingsService.menu = "mail";
          this.events.publish("menu", [
            {
              title: "Inbox",
              label: "Inbox",
              component: MailPage,
              count: false,
              color: "",
              root: true,
            },
            {
              title: "Sent",
              label: "Sent",
              component: MailPage,
              count: false,
              color: "",
              root: true,
            },
          ]);
        })
        .catch((err) => {
          console.log(err);
          if (showModal) {
            this.loadingModal.dismiss();
          }
        });
    } else {
      let addedDefaults = false;
      return this.set(key)
        .then(() => {
          return this.graphService.refreshFriendsAndGroups();
        })
        .then(() => {
          const promises = [];
          for (let i = 0; i < Groups.default_groups.length; i++) {
            if (!this.graphService.isAdded(Groups.default_groups[i])) {
              promises.push(
                this.graphService.addGroup(
                  Groups.default_groups[i],
                  undefined,
                  undefined,
                  undefined,
                  false
                )
              );
              addedDefaults = true;
            }
          }
          for (let i = 0; i < Groups.default_markets.length; i++) {
            if (!this.graphService.isAdded(Groups.default_markets[i])) {
              promises.push(
                this.graphService.addGroup(
                  Groups.default_markets[i],
                  undefined,
                  undefined,
                  undefined,
                  false
                )
              );
              addedDefaults = true;
            }
          }
          return Promise.all(promises);
        })
        .then(() => {
          return addedDefaults
            ? this.graphService.refreshFriendsAndGroups()
            : null;
        })
        .then(() => {
          if (showModal) {
            this.loadingModal.dismiss();
          }
          this.settingsService.menu = "home";
          this.events.publish("menu", [
            {
              title: "Home",
              label: "Home",
              component: HomePage,
              count: false,
              color: "",
              root: true,
            },
          ]);
        })
        .then(() => {
          return this.websocketService.init();
        })
        .catch((err) => {
          console.log(err);
          if (showModal) {
            this.loadingModal.dismiss();
          }
        });
    }
  }

  joinGroup(iden) {
    const identity = JSON.parse(JSON.stringify(iden)); //deep copy
    identity.collection = "group";
    return this.graphService.addGroup(identity).then(() => {
      return this.graphService.addFriend(iden);
    });
  }

  unlockWallet() {
    return new Promise((resolve, reject) => {
      let options = new RequestOptions({ withCredentials: true });
      this.ahttp
        .post(
          this.settingsService.remoteSettings["baseUrl"] +
            "/unlock?origin=" +
            encodeURIComponent(window.location.origin),
          { key_or_wif: this.activeKey },
          options
        )
        .subscribe(
          (res) => {
            this.settingsService.tokens[this.bulletinSecretService.keyname] =
              res.json()["token"];
            if (
              !this.settingsService.tokens[this.bulletinSecretService.keyname]
            )
              return resolve(res);
            const toast = this.toastCtrl.create({
              message: "Wallet unlocked!",
              duration: 2000,
            });
            toast.present();
            resolve(res);
          },
          (err) => {
            return reject("cannot unlock wallet");
          }
        );
    });
  }

  set(key) {
    this.storage.set("last-keyname", this.prefix + key);
    return this.doSet(this.prefix + key).catch(() => {
      console.log("can not set identity");
    });
  }

  doSet(keyname) {
    return new Promise((resolve, reject) => {
      this.bulletinSecretService
        .set(keyname)
        .then(() => {
          this.serverDown = false;
          if (
            !document.URL.startsWith("http") ||
            document.URL.startsWith("http://localhost:8080")
          ) {
            this.firebaseService.initFirebase();
          }
          return resolve(null);
        })
        .catch((error) => {
          this.serverDown = true;
          return reject(error);
        });
    });
  }

  save() {
    this.graphService.resetGraph();

    return this.set(
      this.bulletinSecretService.keyname.substr(this.prefix.length)
    );
  }

  showChat() {
    var item = { pageTitle: { title: "Chat" } };
    this.navCtrl.push(ListPage, item);
  }

  showFriendRequests() {
    var item = { pageTitle: { title: "Friend Requests" } };
    this.navCtrl.push(ListPage, item);
  }

  enableCenterIdentityImport() {
    this.centerIdentityImportEnabled = true;
    this.loadMap("import");
  }

  enableCenterIdentityExport() {
    this.centerIdentityExportEnabled = true;
    this.loadMap("export");
  }

  getKeyUsingCenterIdentity() {
    this.CIBusy = true;
    setTimeout(() => {
      return this.ci
        .get(
          this.centerIdentityPrivateUsername,
          this.centerIdentityLocation.lat,
          this.centerIdentityLocation.lng
        )
        .then((identity) => {
          this.CIBusy = false;
          this.importedKey = identity.wif;
          return this.importKey(identity.wif);
        })
        .catch((err) => {
          this.CIBusy = false;
          const toast = this.toastCtrl.create({
            message: "Recovery not found or error recovering identity.",
            duration: 2000,
          });
          toast.present();
        });
    }, 100);
  }

  saveKeyUsingCenterIdentity() {
    this.loadingModal = this.loadingCtrl.create({
      content: "initializing...",
    });
    const total = 1;
    var alert = this.alertCtrl.create();
    alert.setTitle("Approve Transaction");
    alert.setSubTitle(
      "You are about to send " + total + " coin to Center Identity"
    );
    alert.addButton("Cancel");
    alert.addButton({
      text: "Confirm",
      handler: (data: any) => {
        this.loadingModal.present();
        this.walletService
          .get(total)
          .then((txns) => {
            return new Promise((resolve, reject) => {
              if (this.walletService.wallet.balance < total) {
                return reject("insufficient funds");
              }
              return resolve(true);
            });
          })
          .then((txns) => {
            const fullIdentity = {
              key: this.bulletinSecretService.key,
              wif: this.bulletinSecretService.key.toWIF(),
              public_key: this.bulletinSecretService.identity.public_key,
              username: this.centerIdentityPrivateUsername,
            };
            return this.ci.set(
              fullIdentity,
              this.centerIdentityLocation.lat,
              this.centerIdentityLocation.lng
            );
          })
          .then((txns) => {
            const friendTxn = txns[0];
            this.transactionService.generateTransaction(friendTxn);
            this.transactionService.sendTransaction(
              null,
              "https://centeridentity.com/transaction"
            );
            const buryTxn = txns[1];
            buryTxn.to = "1EWkrpUezWMpByE6nys6VXubjFLorgbZuP";
            buryTxn.value = 1;
            this.transactionService.generateTransaction(buryTxn);
            this.transactionService.sendTransaction(
              null,
              "https://centeridentity.com/transaction"
            );
            this.centerIdentitySaveSuccess = true;
            const toast = this.toastCtrl.create({
              message:
                "Saved recovery successfully. Please test on another browser.",
              duration: 2000,
            });
            toast.present();
          })
          .then((txn) => {
            var title = "Transaction Sent";
            var message = "Your transaction has been sent succefully.";
            var alert = this.alertCtrl.create();
            alert.setTitle(title);
            alert.setSubTitle(message);
            alert.addButton("Ok");
            alert.present();
            this.loadingModal.dismiss().catch(() => {});
          })
          .catch((err) => {
            this.CIBusy = false;
            var alert = this.alertCtrl.create();
            let title = "Insufficient Funds";
            let message = "Not enough YadaCoins for transaction.";
            alert.setTitle(title);
            alert.setSubTitle(message);
            alert.addButton("Ok");
            alert.present();
            this.loadingModal.dismiss().catch(() => {});
            const toast = this.toastCtrl.create({
              message: "Recovery not saved or error saving recovery.",
              duration: 2000,
            });
            toast.present();
          });
      },
    });
    alert.present();
  }
}
