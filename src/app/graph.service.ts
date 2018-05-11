import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Badge } from '@ionic-native/badge';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';


declare var forge;
declare var foobar;
declare var diffiehellman;

@Injectable()
export class GraphService {
    graph: any;
    graphproviderAddress: any;
    xhr: any;
    key: any;
    rid: any;
    stored_secrets: any;
    accepted_friend_requests: any;
    constructor(
        private storage: Storage,
        private http: HTTP,
        private bulletinSecretService: BulletinSecretService,
        private settingsService: SettingsService,
        private badge: Badge,
        private platform: Platform,
        private ahttp: Http
    ) {
        if(this.platform.is('android') || this.platform.is('ios')) {
          http.setDataSerializer('json');
        }
        this.stored_secrets = {};
        this.accepted_friend_requests = [];
    }

    getGraph() {
        return this.settingsService.refresh().then(() => {
            return new Promise((resolve, reject) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve1, reject1) => {
                        this.ahttp.get(this.settingsService.graphproviderAddress + '?bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
                        .subscribe((data) => {
                            this.graphParser(data['_body'])
                            .then(() => {
                                resolve1();
                            });
                        });
                    }).then(() => {
                        resolve();
                    });
                });
            })
            .then(() => {
                var currentWif = this.bulletinSecretService.key.toWIF();
                this.storage.forEach((value, key) => {
                    if(value === currentWif) {
                        this.storage.remove(key).then(() => {
                            this.storage.set('usernames-' + this.graph.human_hash, currentWif);
                            this.bulletinSecretService.set('usernames-' + this.graph.human_hash);
                        });
                    }
                    if (key.indexOf('accepted-') === 0) {
                        this.accepted_friend_requests.push(value);
                    }
                })
                .then(() => {
                    this.storage.set('usernames-' + this.graph.human_hash, currentWif);
                    this.bulletinSecretService.set('usernames-' + this.graph.human_hash);
                });
            });
        });
    }

    getStoredSecrets() {
        return new Promise((resolve, reject) => {
            this.storage.forEach((value, key) => {
                if (key.indexOf('shared_secret') === 0) {
                    this.stored_secrets[key] = value;
                }
            })
            .then(() => {
                resolve();
            });
        });
    }

    graphParser(data) {
        return this.getStoredSecrets().then(() => {
            this.graph = JSON.parse(data);
            this.rid = this.graph.rid;
            var dh_private_keys = {};
            var sent_friend_requests = {};
            var friends = {};
            for(var i=0; i<this.graph.sent_friend_requests.length; i++) {
                var sent_friend_request = this.graph.sent_friend_requests[i];
                if (!dh_private_keys[sent_friend_request.rid]) {
                    dh_private_keys[sent_friend_request.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                var decrypted = this.decrypt(sent_friend_request['relationship']);
                if (decrypted.indexOf('{') === 0) {
                    var relationship = JSON.parse(decrypted);
                    sent_friend_requests[sent_friend_request.rid] = sent_friend_request;
                    friends[sent_friend_request.rid] = sent_friend_request;
                    dh_private_keys[sent_friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                } else {
                    dh_private_keys[sent_friend_request.rid].dh_public_keys.push(sent_friend_request.dh_public_key);
                }
            }
            var friend_requests = {};
            for(var i=0; i<this.graph.friend_requests.length; i++) {
                var friend_request = this.graph.friend_requests[i];
                if (!dh_private_keys[friend_request.rid]) {
                    dh_private_keys[friend_request.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                var decrypted = this.decrypt(friend_request.relationship);
                if (decrypted.indexOf('{') === 0) {
                    var relationship = JSON.parse(decrypted);
                    friends[friend_request.rid] = friend_request;
                    delete friend_requests[friend_request.rid];
                    dh_private_keys[friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                } else {
                    friend_requests[friend_request.rid] = friend_request;
                    dh_private_keys[friend_request.rid].dh_public_keys.push(friend_request.dh_public_key);
                }
            }
            for(var i=0; i<this.graph.friends.length; i++) {
                var friend = this.graph.friends[i];
                if (!dh_private_keys[friend.rid]) {
                    dh_private_keys[friend.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                var decrypted = this.decrypt(friend.relationship);
                if (decrypted.indexOf('{') === 0) {
                    var relationship = JSON.parse(decrypted);
                    friends[friend.rid] = friend;
                    dh_private_keys[friend.rid].dh_private_keys.push(relationship.dh_private_key);
                } else {
                    dh_private_keys[friend.rid].dh_public_keys.push(friend.dh_public_key);
                }
            }
            var messages = {};
            var chats = {};
            dance:
            for(var i=0; i<this.graph.messages.length; i++) {
                var message = this.graph.messages[i];
                if (!message.rid) continue;
                if (!dh_private_keys[message.rid]) continue;
                if (message.dh_public_key) continue;
                for(var j=0; j<dh_private_keys[message.rid].dh_private_keys.length; j++) {
                    var dh_private_key = dh_private_keys[message.rid].dh_private_keys[j];
                    if (!dh_private_key) continue;
                    for(var k=0; k<dh_private_keys[message.rid].dh_public_keys.length; k++) {
                        var dh_public_key = dh_private_keys[message.rid].dh_public_keys[j];
                        if (!dh_public_key) continue;
                        var key = 'shared_secret-' + dh_public_key.slice(0, 26) + dh_private_key.slice(0, 26);
                        if (this.stored_secrets[key]) {
                            var shared_secret = this.stored_secrets[key];
                        } else {
                            var dh = diffiehellman.getDiffieHellman('modp17');
                            var dh1 = diffiehellman.createDiffieHellman(dh.getPrime(), dh.getGenerator());
                            var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
                              return parseInt(h, 16)
                            }));
                            dh1.setPrivateKey(privk);
                            var pubk2 = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
                              return parseInt(h, 16)
                            }));
                            var shared_secret = dh1.computeSecret(pubk2).toString('hex'); //this is the actual shared secret
                            this.storage.set(key, shared_secret);
                            this.stored_secrets[key] = shared_secret;
                        }
                        var decrypted = this.shared_decrypt(shared_secret, message.relationship);
                        if(decrypted.indexOf('{') === 0) {
                            messages[message.rid] = message;
                            if (!chats[message.rid]) {
                                chats[message.rid] = [];
                            }
                            var messageJson = JSON.parse(decrypted)
                            if(messageJson.chatText) {
                                message.relationship = messageJson;
                                chats[message.rid].push(message);
                            }
                            continue dance;
                        }
                    }
                }
            }
            this.graph.chats = chats;
            var arr_messages = [];
            var usernames = {};
            for(let i in messages) {
                arr_messages.push(messages[i].rid);
            }
            var arr_sent_friend_requests = [];
            for(let i in sent_friend_requests) {
                arr_sent_friend_requests.push(sent_friend_requests[i].rid);
                if (sent_friend_requests[i].username) {
                    usernames[sent_friend_requests[i].rid] = sent_friend_requests[i].username
                }
            }
            var arr_friend_requests = [];
            for(let i in friend_requests) {
                arr_friend_requests.push(friend_requests[i].rid);
            }
            var arr_friends = [];
            for(let i in friends) {
                arr_friends.push(friends[i].rid);
            }
            let messagesset = new Set(arr_messages);
            let sent_friend_requests_diff = new Set(arr_sent_friend_requests.filter(x => !messagesset.has(x)));
            let friend_requests_diff = new Set(arr_friend_requests.filter(x => !messagesset.has(x)));
            let friends_diff = new Set(arr_friends);

            let arr_sent_friend_request_keys = Array.from(sent_friend_requests_diff.keys())
            this.graph.sent_friend_requests = []
            for(var i=0; i<arr_sent_friend_request_keys.length; i++) {
                this.graph.sent_friend_requests.push(sent_friend_requests[arr_sent_friend_request_keys[i]])
            }

            if(arr_friend_requests.length > 0) {
                let arr_friend_request_keys = Array.from(friend_requests_diff.keys())
                this.graph.friend_requests = []
                for(var i=0; i<arr_friend_request_keys.length; i++) {
                    this.graph.friend_requests.push(friend_requests[arr_friend_request_keys[i]])
                }
            } else {
                this.graph.friend_requests = [];
            }

            if(arr_friends.length > 0) {
                let arr_friends_keys = Array.from(friends_diff.keys())
                this.graph.friends = []
                for(var i=0; i<arr_friends_keys.length; i++) {
                    if (usernames[arr_friends_keys[i]]) {
                        //messages[i].username = usernames[arr_friends_keys[i]];
                    }
                    this.graph.friends.push(friends[arr_friends_keys[i]])
                }
            }
            if (this.platform.is('android') || this.platform.is('ios')) {
                this.badge.set(this.graph.friend_requests.length);
            }
            this.graph.keys = dh_private_keys;
        });
    }

    decrypt(message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.bulletinSecretService.key.toWIF()).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output.data
    }

    shared_decrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output.data
    }

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }
}