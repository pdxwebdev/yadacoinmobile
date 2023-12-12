import { Component, ViewChild } from "@angular/core";
import { NavController, NavParams, ModalController } from "ionic-angular";
import { Storage } from "@ionic/storage";
import { GraphService } from "../../app/graph.service";
import { BulletinSecretService } from "../../app/bulletinSecret.service";
import { WalletService } from "../../app/wallet.service";
import {
  AlertController,
  LoadingController,
  ToastController,
} from "ionic-angular";
import { TransactionService } from "../../app/transaction.service";
import { SettingsService } from "../../app/settings.service";
import { ListPage } from "../list/list";
import { SiaFiles } from "../siafiles/siafiles";
import { Http } from "@angular/http";
import { DomSanitizer } from "@angular/platform-browser";

declare var Base64;

@Component({
  selector: "page-stream",
  templateUrl: "stream.html",
  queries: {
    content: new ViewChild("content"),
  },
})
export class StreamPage {
  groupChatText: any;
  bulletinSecret: any;
  blockchainAddress: any;
  chats: any;
  rid: any;
  public_key: any;
  loading: any;
  loadingModal: any;
  content: any;
  wallet_mode: any;
  username_signature: any;
  username: any;
  requester_rid: any;
  requested_rid: any;
  their_address: any;
  extraInfo: any;
  files: any;
  streamUrl: any;
  streams: any;
  i: any;
  j: any;
  groups: any;
  selectedGroup: any;
  label: any;
  error: any;
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public storage: Storage,
    public walletService: WalletService,
    public transactionService: TransactionService,
    public alertCtrl: AlertController,
    public graphService: GraphService,
    public loadingCtrl: LoadingController,
    public bulletinSecretService: BulletinSecretService,
    public settingsService: SettingsService,
    public ahttp: Http,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    private dom: DomSanitizer
  ) {
    this.streams = {};
    this.label = this.navParams.get("pageTitle").label;
    // if (this.showLoading) {
    //     this.loading = true;
    // }
    this.getSiaFiles()
      .then(() => {
        return new Promise((resolve, reject) => {
          for (var i = 0; i < this.graphService.graph.groups.length; i++) {
            var group = this.graphService.graph.groups[i];
            if (!this.streams[group.rid]) {
              this.streams[group.rid] = [];
            }
          }
          resolve(null);
        });
      })
      .then(() => {
        var promises = [];
        for (var i = 0; i < this.graphService.graph.groups.length; i++) {
          var group = this.graphService.graph.groups[i];
          promises.push(this.getGroupMessages(group));
        }
        return Promise.all(promises);
      })
      .then((groups) => {
        var promises = [];
        for (var i = 0; i < groups.length; i++) {
          var group = groups[i];
          promises.push(this.parseChats(group));
        }
        return Promise.all(promises);
      })
      .then((groups: Array<any>) => {
        this.i = 0;
        this.j = 0;
        this.groups = groups;
        this.cycleMedia();
        setInterval(() => this.cycleMedia(), 1200000);
      })
      .catch((err) => {
        this.error = true;
        console.log(err);
      });
  }

  selectGroup(rid) {
    this.selectedGroup = rid;
    this.cycleMedia();
  }

  cycleMedia() {
    if (this.error) return;
    if (!this.groups[this.i]) {
      this.i = 0;
      if (!this.groups[this.i]) {
        return;
      }
    }
    var group = this.groups[this.i];
    var rid = this.selectedGroup || group.rid;
    if (!this.streams[rid][this.j]) {
      if (this.j === 0) {
        this.i = 0;
        var group = this.groups[this.i];
      } else {
        this.j = 0;
      }
    }
    var stream = this.streams[rid][this.j];
    this.ahttp.get(stream.url).subscribe(
      (res) => {
        this.streamUrl = stream.url;
        this.j += 1;
      },
      (err) => {
        this.import(stream.relationship);
        this.j += 1;
        if (!this.streams[rid][this.j]) {
          this.selectedGroup = null;
          this.i += 1;
          this.j = 0;
        }
        setTimeout(() => {
          this.cycleMedia();
        }, 5000);
      }
    );
  }

  import(relationship) {
    return this.ahttp
      .post(
        this.settingsService.remoteSettings["baseUrl"] +
          "/sia-share-file?origin=" +
          encodeURIComponent(window.location.origin),
        relationship
      )
      .subscribe(
        (res) => {
          console.log("New file imported:");
          console.log(res.json());
          var files = res.json();
        },
        (err) => {
          this.error = true;
        }
      );
  }

  getGroupMessages(group) {
    return new Promise((resolve, reject) => {
      this.graphService
        .getGroupMessages(
          group["relationship"]["username_signature"],
          null,
          group.rid
        )
        .then(() => {
          return resolve(group);
        });
    });
  }

  parseChats(group) {
    return new Promise((resolve, reject) => {
      if (!this.graphService.graph["messages"][group.rid])
        return resolve(group);
      for (
        var j = 0;
        j < this.graphService.graph["messages"][group.rid].length;
        j++
      ) {
        var message = this.graphService.graph["messages"][group.rid][j];
        if (message["relationship"]["groupChatFileName"]) {
          this.streams[group.rid].push({
            url:
              this.settingsService.remoteSettings["baseUrl"] +
              "/sia-files-stream?siapath=" +
              message["relationship"]["groupChatFileName"],
            title: "",
            relationship: message["relationship"],
          });
        }
      }
      if (this.streams[group.rid].length === 0) {
        delete this.streams[group.rid];
      }
      resolve(group);
    });
  }

  sanitize(url) {
    return this.dom.bypassSecurityTrustResourceUrl(url);
  }

  getSiaFiles() {
    return new Promise((resolve, reject) => {
      this.ahttp
        .get(this.settingsService.remoteSettings["baseUrl"] + "/sia-files")
        .subscribe(
          (res) => {
            var files = res.json();
            resolve(files);
          },
          (err) => {
            this.error = true;
            reject(this.error);
          }
        );
    });
  }
}
