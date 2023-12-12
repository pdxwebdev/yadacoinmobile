import { Component } from "@angular/core";
import {
  Events,
  NavController,
  NavParams,
  ViewController,
} from "ionic-angular";
import { WalletService } from "../../app/wallet.service";
import { AlertController } from "ionic-angular";
import { TransactionService } from "../../app/transaction.service";
import { OpenGraphParserService } from "../../app/opengraphparser.service";
import { SettingsService } from "../../app/settings.service";
import { BulletinSecretService } from "../../app/bulletinSecret.service";
import { Http, Headers, RequestOptions } from "@angular/http";
import { GraphService } from "../../app/graph.service";
import { ProfilePage } from "../profile/profile";

declare var Base64;

@Component({
  selector: "modal-files",
  templateUrl: "siafiles.html",
})
export class SiaFiles {
  logicalParent = null;
  mode = "";
  postText = null;
  post = {};
  files = null;
  selectedFile = null;
  filepath: any;
  filedata: any;
  group = null;
  error = "";
  constructor(
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private walletService: WalletService,
    private alertCtrl: AlertController,
    private transactionService: TransactionService,
    private openGraphParserService: OpenGraphParserService,
    private settingsService: SettingsService,
    private bulletinSecretService: BulletinSecretService,
    private ahttp: Http,
    private graphService: GraphService,
    private navCtrl: NavController,
    private events: Events
  ) {
    this.group = navParams.data.group;
    this.mode = navParams.data.mode || "page";
    this.logicalParent = navParams.data.logicalParent;
    const files = [];
    for (let i = 0; i < this.graphService.graph.files.length; i++) {
      const file = this.graphService.graph.files[i];
      files.push({
        title: "Messages",
        label: file.relationship.username,
        component: ProfilePage,
        count: false,
        color: "",
        kwargs: { identity: file.relationship },
        root: false,
      });
    }
    this.events.publish("menuonly", files);
  }

  changeListener($event) {
    this.filepath = $event.target.files[0].name;
    const reader = new FileReader();
    reader.readAsDataURL($event.target.files[0]);
    reader.onload = () => {
      this.filedata = reader.result.toString().substr(22);
    };
    reader.onerror = () => {};
  }

  upload() {
    this.ahttp
      .post(
        this.settingsService.remoteSettings["baseUrl"] +
          "/sia-upload?filename=" +
          encodeURIComponent(this.filepath),
        { file: this.filedata }
      )
      .subscribe((res) => {
        const data = res.json();
        if (!data.skylink) return;
        this.graphService.createGroup(
          this.filepath,
          null,
          { skylink: data.skylink },
          "file"
        );
      });
  }

  delete(siapath) {
    this.ahttp
      .get(
        this.settingsService.remoteSettings["baseUrl"] +
          "/sia-delete?siapath=" +
          encodeURIComponent(siapath)
      )
      .subscribe((res) => {
        this.files = res.json()["files"];
      });
  }

  submit() {
    this.walletService.get().then(() => {
      return new Promise((resolve, reject) => {
        if (this.selectedFile) {
          this.ahttp
            .get(
              this.settingsService.remoteSettings["baseUrl"] +
                "/sia-share-file?siapath=" +
                this.selectedFile
            )
            .subscribe((res) => {
              let sharefiledata = res.json()["filedata"];
              this.approveTxn(sharefiledata, resolve);
            });
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
    alert.setTitle("Approve Transaction");
    alert.setSubTitle("You are about to spend 0.01 coins ( 0.01 fee)");
    alert.addButton("Cancel");
    alert.addButton({
      text: "Confirm",
      handler: (data: any) => {
        // camera permission was granted
        new Promise((resolve, reject) => {
          if (sharefiledata) {
            const info = {
              relationship: {
                my_username_signature:
                  this.bulletinSecretService.generate_username_signature(),
                my_username: this.bulletinSecretService.username,
              },
              username_signature: this.group.username_signature,
              rid: this.group.rid,
              requester_rid: this.group.requester_rid,
              requested_rid: this.group.requested_rid,
            };
            info.relationship[this.settingsService.collections.GROUP_CHAT] =
              this.postText;
            info.relationship[
              this.settingsService.collections.GROUP_CHAT_FILE
            ] = sharefiledata;
            info.relationship[
              this.settingsService.collections.GROUP_CHAT_FILE_NAME
            ] = this.selectedFile;

            return this.transactionService
              .generateTransaction(info)
              .then(() => {
                resolve(null);
              })
              .catch((err) => {
                reject("failed generating transaction");
              });
          } else {
            return this.transactionService
              .generateTransaction({
                relationship: {
                  postText: this.postText,
                },
              })
              .then(() => {
                resolve(null);
              })
              .catch((err) => {
                reject(err);
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
            console.log("could not generate hash");
          });
      },
    });
    alert.present();
  }

  openProfile(item) {
    this.navCtrl.push(ProfilePage, {
      identity: item.relationship,
    });
  }

  import() {
    var buttons = [];
    buttons.push({
      text: "Import",
      handler: (data) => {
        const identity = JSON.parse(data.identity);
        this.graphService.addGroup(identity, null, null, null);
      },
    });
    let alert = this.alertCtrl.create({
      inputs: [
        {
          name: "identity",
          placeholder: "Paste file code...",
        },
      ],
      buttons: buttons,
    });
    alert.setTitle("Import file");
    alert.setSubTitle("Paste the code of your file below");
    alert.present();
  }

  dismiss() {
    this.logicalParent.refresh();
    this.viewCtrl.dismiss();
  }
}
