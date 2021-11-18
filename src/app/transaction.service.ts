import { Injectable } from '@angular/core';
import { BulletinSecretService } from './bulletinSecret.service';
import { WalletService } from './wallet.service';
import { SettingsService } from './settings.service';
import { Http } from '@angular/http';
import { encrypt, decrypt, PrivateKey } from 'eciesjs'

declare var foobar;
declare var forge;
declare var Base64;

@Injectable()
export class TransactionService {
    info = null;
    transaction = null;
    key = null;
    xhr = null;
    rid = null;
    callbackurl = null;
    blockchainurl = null;
    shared_secret = null;
    to = null;
    txnattempts = null;
    cbattempts = null;
    prevTxn = null;
    txns = null;
    resolve = null;
    unspent_transaction_override = null;
    value = null;
    username = null;
    signatures = null;
    recipient_identity = null;
    constructor(
        private walletService: WalletService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http,
        private settingsService: SettingsService
    ) {}

    generateTransaction(info) {
        return new Promise((resolve, reject) => {
            this.key = this.bulletinSecretService.key;
            this.username = this.bulletinSecretService.username;
            this.recipient_identity = info.recipient_identity;
            this.txnattempts = [12, 5, 4];
            this.cbattempts = [12, 5, 4];
            this.info = info;
            this.unspent_transaction_override = this.info.unspent_transaction;
            this.blockchainurl = this.info.blockchainurl;
            this.callbackurl = this.info.callbackurl;
            this.to = this.info.to;
            this.value = this.info.value;

            this.transaction = {
                rid:  this.info.rid,
                fee: 0.00,
                requester_rid: typeof this.info.requester_rid == 'undefined' ? '' : this.info.requester_rid,
                requested_rid: typeof this.info.requested_rid == 'undefined' ? '' : this.info.requested_rid,
                outputs: [],
                time: parseInt(((+ new Date()) / 1000).toString()).toString(),
                public_key: this.key.getPublicKeyBuffer().toString('hex')
            };
            if (this.info.dh_public_key && this.info.relationship.dh_private_key) {
                this.transaction.dh_public_key = this.info.dh_public_key;
            }
            if (this.to) {
                this.transaction.outputs.push({
                    to: this.to,
                    value: this.value || 0
                })
            }
            if (this.transaction.outputs.length > 0) {
                var transaction_total = this.transaction.outputs[0].value + this.transaction.fee;
            } else {
                transaction_total = this.transaction.fee;
            }
            if ((this.info.relationship && this.info.relationship.dh_private_key && this.walletService.wallet.balance < transaction_total) /* || this.walletService.wallet.unspent_transactions.length == 0*/) {
                reject("not enough money");
                return
            } else {
                var inputs = [];
                var input_sum = 0
                let unspent_transactions: any;
                if(this.unspent_transaction_override) {
                    unspent_transactions = [this.unspent_transaction_override];
                } else {
                    this.info.relationship = this.info.relationship || {};
                    unspent_transactions = this.walletService.wallet.unspent_transactions;
                    unspent_transactions.sort(function (a, b) {
                        if (a.height < b.height)
                          return -1
                        if ( a.height > b.height)
                          return 1
                        return 0
                    });
                }
                let already_added = []
                dance:
                for (var i=0; i < unspent_transactions.length; i++) {
                    var unspent_transaction = unspent_transactions[i];
                    for (var j=0; j < unspent_transaction.outputs.length; j++) {
                        var unspent_output = unspent_transaction.outputs[j];
                        if (unspent_output.to === this.key.getAddress()) {
                            if (already_added.indexOf(unspent_transaction.id) === -1){
                                already_added.push(unspent_transaction.id);
                                inputs.push({id: unspent_transaction.id});
                                input_sum += parseFloat(unspent_output.value);
                                console.log(parseFloat(unspent_output.value));
                            }
                            if (input_sum >= transaction_total) {
                                this.transaction.outputs.push({
                                    to: this.key.getAddress(),
                                    value: (input_sum - transaction_total)
                                })
                                break dance;
                            }
                        }
                    }
                }
            }
            var myAddress = this.key.getAddress();
            var found = false;
            for (var h=0; h < this.transaction.outputs.length; h++) {
                if (this.transaction.outputs[h].to == myAddress) {
                    found = true;
                }
            }
            if (!found) {
                this.transaction.outputs.push({
                    to: this.key.getAddress(),
                    value: 0
                })
            }

            if (input_sum < transaction_total) {
                return reject(false);
            }
            this.transaction.inputs = inputs;

            var inputs_hashes = [];
            for(i=0; i < inputs.length; i++) {
                inputs_hashes.push(inputs[i].id);
            }

            var inputs_hashes_arr = inputs_hashes.sort(function (a, b) {
                if (a.toLowerCase() < b.toLowerCase())
                  return -1
                if ( a.toLowerCase() > b.toLowerCase())
                  return 1
                return 0
            });

            var inputs_hashes_concat = inputs_hashes_arr.join('')

            var outputs_hashes = [];
            for(i=0; i < this.transaction.outputs.length; i++) {
                outputs_hashes.push(this.transaction.outputs[i].to+this.transaction.outputs[i].value.toFixed(8));
            }

            var outputs_hashes_arr = outputs_hashes.sort(function (a, b) {
                if (a.toLowerCase() < b.toLowerCase())
                  return -1
                if ( a.toLowerCase() > b.toLowerCase())
                  return 1
                return 0
            });
            var outputs_hashes_concat = outputs_hashes_arr.join('');
            if (typeof this.info.relationship === 'string') {
              this.transaction.relationship = this.info.relationship;
            }

            if (this.info.dh_public_key && this.info.relationship.dh_private_key) {
                // creating new relationship
                this.transaction.relationship = this.publicEncrypt(JSON.stringify(this.info.relationship), this.recipient_identity.public_key)
                var hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.dh_public_key +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else if (
              this.info.relationship[this.settingsService.collections.CALENDAR] ||
              this.info.relationship[this.settingsService.collections.CHAT] ||
              this.info.relationship[this.settingsService.collections.GROUP_CALENDAR] ||
              this.info.relationship[this.settingsService.collections.GROUP_CHAT] ||
              this.info.relationship[this.settingsService.collections.GROUP_MAIL] ||
              this.info.relationship[this.settingsService.collections.MAIL]
            ) {
                // chat
                this.transaction.relationship = this.shared_encrypt(this.info.shared_secret, JSON.stringify(this.info.relationship));

                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else if (this.info.relationship[this.settingsService.collections.WEB_PAGE_REQUEST ]) {
                // sign in
                this.transaction.relationship = this.shared_encrypt(this.info.shared_secret, JSON.stringify(this.info.relationship));

                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else if (this.info.relationship.wif) {
                // recovery
                this.transaction.relationship = this.shared_encrypt(this.info.shared_secret, JSON.stringify(this.info.relationship));

                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else if (
              this.info.relationship[this.settingsService.collections.GROUP]
            ) {
                // join or create group
                if (this.info.relationship[this.settingsService.collections.GROUP].parent) {
                  this.transaction.relationship = this.shared_encrypt(this.info.relationship[this.settingsService.collections.GROUP].parent.username_signature, JSON.stringify(this.info.relationship));
                } else {
                  this.transaction.relationship = this.encrypt();
                }

                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else if (
              this.info.relationship[this.settingsService.collections.WEB_CHALLENGE_REQUEST] ||
              this.info.relationship[this.settingsService.collections.WEB_CHALLENGE_RESPONSE] ||
              this.info.relationship[this.settingsService.collections.WEB_PAGE_REQUEST] ||
              this.info.relationship[this.settingsService.collections.WEB_PAGE_RESPONSE] ||
              this.info.relationship[this.settingsService.collections.WEB_SIGNIN_REQUEST] ||
              this.info.relationship[this.settingsService.collections.WEB_SIGNIN_RESPONSE]
            ) {
                this.transaction.relationship = this.shared_encrypt(this.info.shared_secret, JSON.stringify(this.info.relationship));

                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else if (this.info.relationship[this.settingsService.collections.WEB_PAGE]) {
                // mypage
                this.transaction.relationship = this.encrypt();

                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.fee.toFixed(8) +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex')
            } else {
                //straight transaction
                hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.public_key +
                    this.transaction.time +
                    (this.transaction.rid || '') +
                    (this.transaction.relationship || '') +
                    this.transaction.fee.toFixed(8) +
                    inputs_hashes_concat +
                    outputs_hashes_concat
                ).toString('hex');
            }

            this.transaction.hash = hash
            var attempt = this.txnattempts.pop();
            attempt = this.cbattempts.pop();
            this.transaction.id = this.get_transaction_id(this.transaction.hash, attempt);
            if(hash) {
                resolve(this.transaction);
            } else {
                reject(false);
            }
        });
    }

    getFastGraphSignature() {
        return new Promise((resolve, reject) => {
            this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sign-raw-transaction', {
                hash: this.transaction.hash,
                username_signature: this.bulletinSecretService.generate_username_signature(),
                input: this.transaction.inputs[0].id,
                id: this.transaction.id,
                txn: this.transaction
            })
            .subscribe((res) => {
                try {
                    let data = res.json();
                    this.transaction.signatures = [data.signature]
                    return resolve(data);
                } catch(err) {
                  return reject(err);

                }
            },
            (err) => {
                reject(err);
            });
        });
    }

    sendTransaction(txn=null, transactionUrlOverride = undefined) {
        return new Promise((resolve, reject) => {
            var url = '';
            url = (transactionUrlOverride || this.settingsService.remoteSettings['transactionUrl']) + '?username_signature=' + this.bulletinSecretService.username_signature + '&to=' + this.key.getAddress() + '&username=' + this.username

            this.ahttp.post(
                url,
                txn || this.transaction)
            .subscribe((data) => {
                try {
                    resolve(JSON.parse(data['_body']));
                }
                catch(err) {
                    reject(err);
                }
            },
            (error) => {
                if (this.txnattempts.length > 0) {
                    reject(error);
                }
            });
        });
    }

    get_transaction_id(hash, trynum) {
        var combine = new Uint8Array(hash.length);
        //combine[0] = 0;
        //combine[1] = 64;
        for (var i = 0; i < hash.length; i++) {
            combine[i] = hash.charCodeAt(i)
        }
        var shaMessage = foobar.bitcoin.crypto.sha256(combine);
        var signature = this.key.sign(shaMessage);
        var der = signature.toDER();
        return foobar.base64.fromByteArray(der);
    }

    direct_message(data) {
        //placeholder
    }

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }

    hexToByteArray(str) {
      if (!str) {
        return new Uint8Array([]);
      }

      var a = [];
      for (var i = 0, len = str.length; i < len; i+=2) {
        a.push(parseInt(str.substr(i,2),16));
      }

      return new Uint8Array(a);
    }

    byteArrayToHexString(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }

    encrypt() {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.key.toWIF()).digest().toHex(), 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = forge.random.getBytesSync(16);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + JSON.stringify(this.info.relationship)));
        cipher.finish()
        return cipher.output.toHex()
    }

    publicEncrypt(message, public_key) {
      const data = Buffer.from(message);
      return encrypt(public_key, data).toString('hex');
    }

    shared_encrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = forge.random.getBytesSync(16);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + Base64.encode(message)));
        cipher.finish()
        return cipher.output.toHex()
    }

    decrypt(message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.key.toWIF()).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output
    }

    publicDecrypt(message) {
      const decrypted = decrypt(this.key.d.toHex(), Buffer.from(this.hexToByteArray(message))).toString();
      return decrypted
    }

    shared_decrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output
    }

}