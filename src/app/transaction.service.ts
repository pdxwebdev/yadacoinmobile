import { Injectable } from '@angular/core';
import { Component } from '@angular/core';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { WalletService } from './wallet.service';
import { HTTP } from '@ionic-native/http';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';
import { Storage } from '@ionic/storage';

declare var foobar;
declare var forge;
declare var uuid4;
declare var diffiehellman;

@Injectable()
export class TransactionService {
    info = null;
    transaction = null;
    key = null;
    xhr = null;
    rid = null;
    callbackurl = null;
    blockchainurl = null;
    bulletin_secret = null;
    shared_secret = null;
    to = null;
    txnattempts = null;
    cbattempts = null;
    prevTxn = null;
    txns = null;
    resolve = null;
    unspent_transaction_override = null;
    value = null;
    constructor(
        private walletService: WalletService,
        private bulletinSecretService: BulletinSecretService,
        private http: HTTP,
        private platform: Platform,
        private storage: Storage,
        private ahttp: Http
    ) {}

    pushTransaction(info) {
        this.key = this.bulletinSecretService.key;
        this.bulletin_secret = this.bulletinSecretService.bulletin_secret;

        this.txnattempts = [12, 5, 4];
        this.cbattempts = [12, 5, 4];
        this.info = info;
        this.resolve = this.info.resolve;
        this.unspent_transaction_override = this.info.unspent_transaction;
        this.blockchainurl = this.info.blockchainurl;
        this.callbackurl = this.info.callbackurl;
        this.to = this.info.to;
        this.value = this.info.value;
        if (this.info.rid) {
            this.rid = this.info.rid;
        }
        else if (this.info.relationship && this.info.relationship.bulletin_secret) {
            var bulletin_secrets = [this.bulletin_secret, this.info.relationship.bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            this.rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
        } else if (this.info.bulletin_secret) {
            var bulletin_secrets = [this.bulletin_secret, this.info.bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            this.rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
        } else {
            this.rid = '';
        }
        this.ahttp.get(this.blockchainurl + '?rid=' + this.rid)
        .subscribe((data) => {
            this.alreadyFriends(data['_body']);
        });
    }

    alreadyFriends(data) {
        var transactions = JSON.parse(data);

        if (transactions.length > 0 && this.info.relationship.dh_private_key) {
            // existing relationship, exit
            //return;
        }
        this.walletService.get().then(() => {
            this.generateTransaction();
            this.sendTransaction()
        }).then(() => {
            this.sendCallback();
        });
    }

    generateTransaction() {

        this.transaction = {
            rid:  this.rid,
            fee: 0.1,
            requester_rid: typeof this.info.requester_rid == 'undefined' ? '' : this.info.requester_rid,
            requested_rid: typeof this.info.requested_rid == 'undefined' ? '' : this.info.requested_rid,
            outputs: []
        };
        if (this.info.dh_public_key && this.info.relationship.dh_private_key) {
            this.transaction.dh_public_key = this.info.dh_public_key;
        }
        if (this.to) {
            this.transaction.outputs.push({
                to: this.to,
                value: this.value || 1
            })
        }
        if (this.transaction.outputs.length > 0) {
            var transaction_total = this.transaction.outputs[0].value + this.transaction.fee;
        } else {
            var transaction_total = this.transaction.fee;
        }
        if ((this.info.relationship.dh_private_key && this.walletService.wallet.balance < (this.transaction.outputs[0].value + this.transaction.fee)) || this.walletService.wallet.unspent_transactions.length == 0) {
            if (this.resolve) this.resolve(false);
            return
        } else {
            var inputs = [];
            var input_sum = 0
            let unspent_transactions: any;
            if(this.unspent_transaction_override) {
                unspent_transactions = [this.unspent_transaction_override];
            } else {
                unspent_transactions = this.walletService.wallet.unspent_transactions;
            }
            dance:
            for (var i=0; i < unspent_transactions.length; i++) {
                var unspent_transaction = unspent_transactions[i];
                for (var j=0; j < unspent_transaction.outputs.length; j++) {
                    var unspent_output = unspent_transaction.outputs[j];
                    if (unspent_output.to === this.key.getAddress()) {
                        inputs.push({id: unspent_transaction.id});
                        input_sum += parseFloat(unspent_output.value);
                        if (input_sum > transaction_total) {
                            let value: any;
                            value = (input_sum - transaction_total).toFixed(1);

                            this.transaction.outputs.push({
                                to: this.key.getAddress(),
                                value: value / 1
                            })
                            break dance;
                        } else if (input_sum === transaction_total) {
                            break dance;
                        }
                    }
                }
            }
        }
        
        if (input_sum < transaction_total) {
            if (this.resolve) this.resolve(false);
            return
        }
        this.transaction.inputs = inputs;

        var inputs_hashes = [];
        for(var i=0; i < inputs.length; i++) {
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
        for(var i=0; i < this.transaction.outputs.length; i++) {
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

        if (this.info.relationship) {
            var bulletin_secrets = [this.bulletin_secret, this.info.relationship.bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            this.rid = foobar.bitcoin.crypto.sha256(bulletin_secrets[0] + bulletin_secrets[1]).toString('hex');
        } else {
            this.info.relationship = {};
        }

        if (this.info.dh_public_key && this.info.relationship.dh_private_key) {
            // creating new relationship
            this.transaction.relationship = this.encrypt()
            var hash = foobar.bitcoin.crypto.sha256(
                this.transaction.dh_public_key +
                this.transaction.rid +
                this.transaction.relationship +
                this.transaction.fee +
                this.transaction.requester_rid +
                this.transaction.requested_rid +
                inputs_hashes_concat +
                outputs_hashes_concat
            ).toString('hex')
        } else if (this.info.relationship.postText) {
            // post

            this.transaction.relationship = this.shared_encrypt(this.bulletin_secret, JSON.stringify(this.info.relationship));                    

            var hash = foobar.bitcoin.crypto.sha256(
                this.transaction.relationship +
                this.transaction.fee +
                inputs_hashes_concat +
                outputs_hashes_concat
            ).toString('hex')
        } else if (this.info.relationship.chatText) {
            // chat
            this.transaction.relationship = this.shared_encrypt(this.info.shared_secret, JSON.stringify(this.info.relationship));                    

            var hash = foobar.bitcoin.crypto.sha256(
                this.transaction.rid +
                this.transaction.relationship +
                this.transaction.fee +
                inputs_hashes_concat +
                outputs_hashes_concat
            ).toString('hex')
        } else {
            //straight transaction
            var hash = foobar.bitcoin.crypto.sha256(
                this.transaction.fee +
                inputs_hashes_concat +
                outputs_hashes_concat
            ).toString('hex');            
        }

        this.transaction.hash = hash
        var attempt = this.txnattempts.pop();
        var attempt = this.cbattempts.pop();
        this.transaction.id = this.get_transaction_id(this.transaction.hash, attempt);
        this.transaction.public_key = this.key.getPublicKeyBuffer().toString('hex');
    }

    onTransactionError() {
        if (this.txnattempts.length > 0) {
            var attempt = this.txnattempts.pop();
            this.transaction.id = this.get_transaction_id(this.transaction.hash, attempt);
            this.sendTransaction();
        }
    }

    onCallbackError() {
        if (this.cbattempts.length > 0) {
            var attempt = this.cbattempts.pop();
            this.transaction.id = this.get_transaction_id(this.transaction.hash, attempt);
            this.sendCallback();
        }
    }

    sendTransaction() {
        this.ahttp.post(
            this.blockchainurl + '?bulletin_secret=' + this.bulletin_secret,
            this.transaction)
        .subscribe((data) => {
            if (this.resolve && !this.callbackurl) this.resolve(JSON.parse(data['_body']));
        },
        (error) => {
            if (this.txnattempts.length > 0) {
                this.onTransactionError();
            }
        });
    }

    sendCallback() {
        if(this.callbackurl) {
            this.ahttp.post(
                this.callbackurl,
                {
                    bulletin_secret: this.bulletin_secret,
                    to: this.key.getAddress()
                })
            .subscribe((data) => {
                if (this.resolve) this.resolve(JSON.parse(data['_body']));
            },
            (error) => {
                if (this.cbattempts.length > 0) {
                    this.onCallbackError();
                }
            });
        }
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

    shared_encrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = forge.random.getBytesSync(16);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + message));
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