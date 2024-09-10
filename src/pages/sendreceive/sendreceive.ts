import { Component } from "@angular/core";
import { NavController, NavParams } from "ionic-angular";
import { AlertController, LoadingController } from "ionic-angular";
import { WalletService } from "../../app/wallet.service";
import { TransactionService } from "../../app/transaction.service";
import { BulletinSecretService } from "../../app/bulletinSecret.service";
import { QRScanner, QRScannerStatus } from "@ionic-native/qr-scanner";
import { SettingsService } from "../../app/settings.service";
import { SocialSharing } from "@ionic-native/social-sharing";
import { ListPage } from "../list/list";
import { Http, Headers, RequestOptions } from "@angular/http";

@Component({
  selector: "page-sendreceive",
  templateUrl: "sendreceive.html",
})
export class SendReceive {
  value = null;
  createdCode = null;
  address = null;
  loadingBalance: any;
  balance = null;
  isDevice = null;
  loadingModal: any;
  past_sent_transactions: String[];
  past_sent_pending_transactions: String[];
  past_received_transactions: String[];
  past_received_pending_transactions: String[];
  sentPage: any;
  receivedPage: any;
  sentPendingPage: any;
  receivedPendingPage: any;
  sentPendingLoading: any;
  receivedPendingLoading: any;
  sentLoading: any;
  receivedLoading: any;
  past_sent_page_cache: any;
  past_sent_pending_page_cache: any;
  past_received_page_cache: any;
  past_received_pending_page_cache: any;
  identity: any;
  recipients: any;
  fee: any;
  masternode_fee: any;
  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private qrScanner: QRScanner,
    private transactionService: TransactionService,
    private alertCtrl: AlertController,
    private bulletinSecretService: BulletinSecretService,
    private walletService: WalletService,
    private socialSharing: SocialSharing,
    public loadingCtrl: LoadingController,
    private ahttp: Http,
    private settingsService: SettingsService
  ) {
    if (this.navParams.get("identity")) {
      this.identity = this.navParams.get("identity");
      this.address = this.bulletinSecretService.publicKeyToAddress(
        this.identity.public_key
      );
    }
    this.recipients = [
      {
        to: "",
        value: 0,
      },
    ];
    this.value = 0;
    this.createdCode = bulletinSecretService.key.getAddress();
    this.refresh();
    this.sentPage = 1;
    this.receivedPage = 1;
    this.sentPendingPage = 1;
    this.receivedPendingPage = 1;
    this.past_sent_transactions = [];
    this.past_sent_pending_transactions = [];
    this.past_received_transactions = [];
    this.past_received_pending_transactions = [];
    this.sentPendingLoading = false;
    this.receivedPendingLoading = false;
    this.sentLoading = false;
    this.receivedLoading = false;
    this.past_sent_page_cache = {};
    this.past_sent_pending_page_cache = {};
    this.past_received_page_cache = {};
    this.past_received_pending_page_cache = {};
    this.fee = 0;
    this.masternode_fee = 0;
  }

  scan() {
    if (
      !document.URL.startsWith("http") ||
      document.URL.startsWith("http://localhost:8080")
    ) {
      this.isDevice = true;
    } else {
      this.isDevice = false;
    }
    this.qrScanner.prepare().then((status: QRScannerStatus) => {
      console.log(status);
      if (status.authorized) {
        // start scanning
        let scanSub = this.qrScanner.scan().subscribe((text: string) => {
          console.log("Scanned address", text);
          this.address = text;
          this.qrScanner.hide(); // hide camera preview
          scanSub.unsubscribe(); // stop scanning
          window.document
            .querySelector("ion-app")
            .classList.remove("transparentBody");
        });
      }
    });
    this.qrScanner.resumePreview();
    // show camera preview
    this.qrScanner.show();
    window.document.querySelector("ion-app").classList.add("transparentBody");
  }

  addRecipient() {
    this.recipients.push({
      address: "",
      value: 0,
    });
  }

  removeRecipient(index) {
    this.recipients.splice(index, 1);
  }

  submit() {
    const fee = parseFloat(this.fee) || 0;
    const masternode_fee = parseFloat(this.masternode_fee) || 0;
    var alert = this.alertCtrl.create();
    if (!this.recipients[0].to && masternode_fee === 0) {
      alert.setTitle("Enter an address");
      alert.addButton("Ok");
      alert.present();
      return;
    }
    if (!this.recipients[0].value && masternode_fee === 0) {
      alert.setTitle("Enter an amount");
      alert.addButton("Ok");
      alert.present();
      return;
    }
    let total = fee + masternode_fee;
    this.recipients.map((output, i) => {
      this.recipients[i].value = parseFloat(output.value);
      total += parseFloat(output.value);
    });
    alert.setTitle("Approve Transaction");
    alert.setSubTitle("You are about to spend " + total + " coins");
    alert.addButton("Cancel");
    alert.addButton({
      text: "Confirm",
      handler: (data: any) => {
        this.loadingModal = this.loadingCtrl.create({
          content: "Please wait...",
        });
        this.loadingModal.present();
        this.walletService
          .get(total)
          .then(() => {
            if (this.walletService.wallet.balance < total) {
              let title = "Insufficient Funds";
              let message = "Not enough YadaCoins for transaction.";
              var alert = this.alertCtrl.create();
              alert.setTitle(title);
              alert.setSubTitle(message);
              alert.addButton("Ok");
              alert.present();
              this.value = "0";
              this.address = "";
              this.refresh();
              this.loadingModal.dismiss().catch(() => {});
              throw "insufficient funds";
            }
            if (this.walletService.wallet.unspent_transactions.length > 100) {
              let title = "Too many inputs";
              let message =
                "This transaction requires too many inputs. Send a smaller amount.";
              var alert = this.alertCtrl.create();
              alert.setTitle(title);
              alert.setSubTitle(message);
              alert.addButton("Ok");
              alert.present();
              this.loadingModal.dismiss().catch(() => {});
              throw "insufficient funds";
            }
            return this.transactionService.generateTransaction({
              outputs: JSON.parse(JSON.stringify(this.recipients)),
            });
          })
          .then((txn) => {
            return this.transactionService.sendTransaction(txn);
          })
          .then((txn) => {
            var title = "Transaction Sent";
            var message = "Your transaction has been sent succefully.";
            var alert = this.alertCtrl.create();
            alert.setTitle(title);
            alert.setSubTitle(message);
            alert.addButton("Ok");
            alert.present();
            this.value = "0";
            this.address = "";
            this.refresh();
            this.loadingModal.dismiss().catch(() => {});
          })
          .catch((err) => {
            var alert = this.alertCtrl.create();
            alert.setTitle("Error");
            alert.setSubTitle(err);
            alert.addButton("Ok");
            alert.present();
            console.log(err);
            try {
              this.loadingModal.dismiss().catch(() => {});
            } catch (err) {}
          });
      },
    });
    alert.present();
  }
  refresh() {
    this.loadingBalance = true;
    return this.walletService
      .get(this.value)
      .then(() => {
        this.loadingBalance = false;
        this.balance = this.walletService.wallet.balance;
      })
      .then(() => {
        this.getSentHistory();
      })
      .then(() => {
        this.getSentPendingHistory();
      })
      .then(() => {
        this.getReceivedHistory();
      })
      .then(() => {
        this.getReceivedPendingHistory();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  convertDateTime(timestamp) {
    var a = new Date(timestamp * 1000);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = "0" + a.getHours();
    var min = "0" + a.getMinutes();
    var time =
      date +
      "-" +
      month +
      "-" +
      year +
      " " +
      hour.substr(-2) +
      ":" +
      min.substr(-2);
    return time;
  }

  getSentPendingHistory() {
    return new Promise((resolve, reject) => {
      this.sentPendingLoading = true;
      let options = new RequestOptions({ withCredentials: true });
      this.ahttp
        .get(
          this.settingsService.remoteSettings["baseUrl"] +
            "/get-past-pending-sent-txns?page=" +
            this.sentPendingPage +
            "&public_key=" +
            this.bulletinSecretService.key
              .getPublicKeyBuffer()
              .toString("hex") +
            "&origin=" +
            encodeURIComponent(window.location.origin),
          options
        )
        .subscribe(
          (res) => {
            this.sentPendingLoading = false;
            this.past_sent_pending_transactions = res
              .json()
              ["past_pending_transactions"].sort(this.sortFunc);
            this.getSentOutputValue(this.past_sent_pending_transactions);
            this.past_sent_pending_page_cache[this.sentPendingPage] =
              this.past_sent_pending_transactions;
            resolve(res);
          },
          (err) => {
            return reject("cannot unlock wallet");
          }
        );
    });
  }

  getSentHistory(public_key = null) {
    return new Promise((resolve, reject) => {
      this.sentLoading = true;
      let options = new RequestOptions({ withCredentials: true });
      this.ahttp
        .get(
          this.settingsService.remoteSettings["baseUrl"] +
            "/get-past-sent-txns?page=" +
            this.sentPage +
            "&public_key=" +
            (public_key ||
              this.bulletinSecretService.key
                .getPublicKeyBuffer()
                .toString("hex")) +
            "&origin=" +
            encodeURIComponent(window.location.origin),
          options
        )
        .subscribe(
          (res) => {
            this.sentLoading = false;
            this.past_sent_transactions = res
              .json()
              ["past_transactions"].sort(this.sortFunc);
            this.getSentOutputValue(this.past_sent_transactions);
            this.past_sent_page_cache[this.sentPage] =
              this.past_sent_transactions;
            resolve(res);
          },
          (err) => {
            return reject("cannot unlock wallet");
          }
        );
    });
  }

  getReceivedPendingHistory() {
    return new Promise((resolve, reject) => {
      this.receivedPendingLoading = true;
      let options = new RequestOptions({ withCredentials: true });
      this.ahttp
        .get(
          this.settingsService.remoteSettings["baseUrl"] +
            "/get-past-pending-received-txns?page=" +
            this.receivedPendingPage +
            "&public_key=" +
            this.bulletinSecretService.key
              .getPublicKeyBuffer()
              .toString("hex") +
            "&origin=" +
            encodeURIComponent(window.location.origin),
          options
        )
        .subscribe(
          (res) => {
            this.receivedPendingLoading = false;
            this.past_received_pending_transactions = res
              .json()
              ["past_pending_transactions"].sort(this.sortFunc);
            this.getReceivedOutputValue(
              this.past_received_pending_transactions
            );
            this.past_received_pending_page_cache[this.receivedPendingPage] =
              this.past_received_pending_transactions;
            resolve(res);
          },
          (err) => {
            return reject("cannot unlock wallet");
          }
        );
    });
  }

  getReceivedHistory() {
    return new Promise((resolve, reject) => {
      this.receivedLoading = true;
      let options = new RequestOptions({ withCredentials: true });
      this.ahttp
        .get(
          this.settingsService.remoteSettings["baseUrl"] +
            "/get-past-received-txns?page=" +
            this.receivedPage +
            "&public_key=" +
            this.bulletinSecretService.key
              .getPublicKeyBuffer()
              .toString("hex") +
            "&origin=" +
            encodeURIComponent(window.location.origin),
          options
        )
        .subscribe(
          (res) => {
            this.receivedLoading = false;
            this.past_received_transactions = res
              .json()
              ["past_transactions"].sort(this.sortFunc);
            this.getReceivedOutputValue(this.past_received_transactions);
            this.past_received_page_cache[this.receivedPage] =
              this.past_received_transactions;
            resolve(res);
          },
          (err) => {
            return reject("cannot unlock wallet");
          }
        );
    });
  }

  getReceivedOutputValue(array) {
    for (var i = 0; i < array.length; i++) {
      var txn = array[i];
      if (!array[i]["value"]) {
        array[i]["value"] = 0;
      }
      for (var j = 0; j < txn["outputs"].length; j++) {
        var output = txn["outputs"][j];
        if (this.bulletinSecretService.key.getAddress() === output.to) {
          array[i]["value"] += parseFloat(output.value);
        }
      }
      array[i]["value"] = array[i]["value"].toFixed(8);
    }
  }

  getSentOutputValue(array) {
    for (var i = 0; i < array.length; i++) {
      var txn = array[i];
      if (!array[i]["value"]) {
        array[i]["value"] = 0;
      }
      for (var j = 0; j < txn["outputs"].length; j++) {
        var output = txn["outputs"][j];
        if (this.bulletinSecretService.key.getAddress() !== output.to) {
          array[i]["value"] += parseFloat(output.value);
        }
      }
      array[i]["value"] = array[i]["value"].toFixed(8);
    }
  }

  sortFunc(a, b) {
    if (parseInt(a.time) < parseInt(b.time)) return 1;
    if (parseInt(a.time) > parseInt(b.time)) return -1;
    return 0;
  }

  prevReceivedPage() {
    this.receivedPage--;
    var result = this.past_received_page_cache[this.receivedPage] || [];
    if (result.length > 0) {
      this.past_received_transactions = result;
      return;
    }
    return this.getReceivedHistory();
  }

  nextReceivedPage() {
    this.receivedPage++;
    var result = this.past_received_page_cache[this.receivedPage] || [];
    if (result.length > 0) {
      this.past_received_transactions = result;
      return;
    }
    return this.getReceivedHistory();
  }

  prevReceivedPendingPage() {
    this.receivedPendingPage--;
    var result =
      this.past_received_pending_page_cache[this.receivedPendingPage] || [];
    if (result.length > 0) {
      this.past_received_pending_transactions = result;
      return;
    }
    return this.getReceivedPendingHistory();
  }

  nextReceivedPendingPage() {
    this.receivedPendingPage++;
    var result = (this.past_received_pending_transactions =
      this.past_received_pending_page_cache[this.receivedPendingPage] || []);
    if (result.length > 0) {
      this.past_sent_transactions = result;
      return;
    }
    return this.getReceivedPendingHistory();
  }

  prevSentPage() {
    this.sentPage--;
    var result = (this.past_sent_transactions =
      this.past_sent_page_cache[this.sentPage] || []);
    if (result.length > 0) {
      this.past_sent_transactions = result;
      return;
    }
    return this.getSentHistory();
  }

  nextSentPage() {
    this.sentPage++;
    var result = this.past_sent_page_cache[this.sentPage] || [];
    if (result.length > 0) {
      this.past_sent_transactions = result;
      return;
    }
    return this.getSentHistory();
  }

  prevSentPendingPage() {
    this.sentPendingPage--;
    var result = (this.past_sent_pending_transactions =
      this.past_sent_pending_page_cache[this.sentPendingPage] || []);
    if (result.length > 0) {
      this.past_sent_pending_transactions = result;
      return;
    }
    return this.getSentPendingHistory();
  }

  nextSentPendingPage() {
    this.sentPendingPage++;
    var result = this.past_sent_pending_page_cache[this.sentPendingPage] || [];
    if (result.length > 0) {
      this.past_sent_pending_transactions = result;
      return;
    }
    return this.getSentPendingHistory();
  }

  shareAddress() {
    this.socialSharing.share(
      this.bulletinSecretService.key.getAddress(),
      "Send Yada Coin to this address!"
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
}
