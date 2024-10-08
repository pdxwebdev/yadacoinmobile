import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";
import { Events } from "ionic-angular";
import { GraphService } from "./graph.service";

declare var foobar;
declare var forge;

@Injectable()
export class BulletinSecretService {
  key = null;
  username_signature = null;
  keyname = null;
  keykeys = null;
  username = null;
  public_key = null;
  identity: any = {
    username: "",
    username_signature: "",
    public_key: "",
  };
  constructor(private storage: Storage, public events: Events) {}

  shared_encrypt(shared_secret, message) {
    var key = forge.pkcs5.pbkdf2(
      forge.sha256.create().update(shared_secret).digest().toHex(),
      "salt",
      400,
      32
    );
    var cipher = forge.cipher.createCipher("AES-CBC", key);
    var iv = "";
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(iv + message));
    cipher.finish();
    return cipher.output.toHex();
  }

  get() {
    return this.all()
      .then((keys: any) => {
        return this.setKeyName(keys);
      })
      .then(() => {
        return this.setKey();
      });
  }

  setKeyName(keys) {
    return new Promise((resolve, reject) => {
      keys.sort(function (a, b) {
        if (a.idx < b.idx) return -1;
        if (a.idx > b.idx) return 1;
        return 0;
      });
      if (!this.keyname) {
        this.storage.get("last-keyname").then((key) => {
          if (key && typeof key == "string") {
            this.keyname = key;
          } else {
            this.keyname = keys[0].idx;
          }
          resolve(keys);
        });
      } else {
        resolve(keys);
      }
    });
  }

  setKey() {
    return new Promise((resolve, reject) => {
      this.storage.get(this.keyname).then((key) => {
        this.key = foobar.bitcoin.ECPair.fromWIF(key);
        this.username = this.keyname.substr("usernames-".length);
        this.public_key = this.key.getPublicKeyBuffer().toString("hex");
        this.identity = {
          username: this.username,
          username_signature: this.username_signature,
          public_key: this.public_key,
        };
        this.username_signature = this.generate_username_signature();
        return resolve(null);
      });
    });
  }

  cloneIdentity() {
    return JSON.parse(this.identityJson());
  }

  identityJson() {
    return JSON.stringify(this.identity, null, 4);
  }

  generate_username_signature() {
    return foobar.base64.fromByteArray(
      this.key.sign(foobar.bitcoin.crypto.sha256(this.username)).toDER()
    );
  }

  set(key) {
    return new Promise((resolve, reject) => {
      this.keyname = key;
      return this.storage
        .set("last-keyname", key)
        .then(() => {
          return this.storage.remove("usernames-");
        })
        .then((key) => {
          return this.get();
        })
        .then(() => {
          return this.setKey();
        })
        .then(() => {
          return resolve(null);
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }

  create(username) {
    return new Promise((resolve, reject) => {
      if (!username) return reject("username missing");
      this.keyname = "usernames-" + username;
      this.storage.set("last-keyname", this.keyname);

      this.username = username;
      this.key = foobar.bitcoin.ECPair.makeRandom();
      this.storage.set(this.keyname, this.key.toWIF());
      this.username_signature = this.generate_username_signature();
      return this.get().then(() => {
        return resolve(null);
      });
    });
  }

  import(keyWif, username) {
    return new Promise((resolve, reject) => {
      if (!username) return reject("username missing");
      this.keyname = "usernames-" + username;
      this.storage.set("last-keyname", this.keyname);

      this.username = username;
      this.storage.set(this.keyname, keyWif.trim());
      this.key = foobar.bitcoin.ECPair.fromWIF(keyWif.trim());
      this.username_signature = this.generate_username_signature();
      return this.get().then(() => {
        return resolve(null);
      });
    });
  }

  all() {
    return new Promise((resolve, reject) => {
      var keykeys = [];
      this.storage
        .forEach((value, key) => {
          if (key.substr(0, "usernames-".length) === "usernames-") {
            keykeys.push({ key: value, idx: key });
          }
        })
        .then(() => {
          this.keykeys = keykeys;
          resolve(keykeys);
        });
    });
  }

  unset() {
    this.key = null;
    this.username_signature = null;
    this.keyname = null;
    this.keykeys = null;
    this.username = null;
    this.public_key = null;
    this.identity = {
      username: "",
      username_signature: "",
      public_key: "",
    };
  }

  publicKeyToAddress(public_key) {
    return foobar.bitcoin.ECPair.fromPublicKeyBuffer(
      foobar.Buffer.Buffer.from(public_key, "hex")
    ).getAddress();
  }

  decrypt(message) {
    var key = forge.pkcs5.pbkdf2(
      forge.sha256.create().update(this.key.toWIF()).digest().toHex(),
      "salt",
      400,
      32
    );
    var decipher = forge.cipher.createDecipher("AES-CBC", key);
    var enc = this.hexToBytes(message);
    decipher.start({ iv: enc.slice(0, 16) });
    decipher.update(forge.util.createBuffer(enc.slice(16)));
    decipher.finish();
    return decipher.output;
  }

  hexToBytes(s) {
    var arr = [];
    for (var i = 0; i < s.length; i += 2) {
      var c = s.substr(i, 2);
      arr.push(parseInt(c, 16));
    }
    return String.fromCharCode.apply(null, arr);
  }
}
