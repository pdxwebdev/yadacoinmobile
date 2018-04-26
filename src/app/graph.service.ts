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
    humanHash: any;
    stored_secrets: any;
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
    }

    getGraph() {
        return this.settingsService.refresh().then(() => {
            return new Promise((resolve, reject) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve1, reject1) => {
                        if (this.platform.is('android') || this.platform.is('ios')) {
                            this.http.get(
                                this.settingsService.graphproviderAddress,
                                {bulletin_secret: this.bulletinSecretService.bulletin_secret},
                                {'Content-Type': 'application/json'}
                            ).then((data) => {
                                this.graphParser(data['data'], resolve1);
                            });
                        } else {
                            this.ahttp.get(this.settingsService.graphproviderAddress + '?bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
                            .subscribe((data) => {
                                this.graphParser(data['_body'], resolve1);
                            });
                        }
                    }).then(() => {
                        resolve();
                    });
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

    graphParser(data, resolve1) {
        this.getStoredSecrets().then(() => {
            this.graph = JSON.parse(data);
            this.graph.friend_posts.reverse();
            this.rid = this.graph.rid;
            this.humanHash = this.graph.human_hash;
            var dh_private_keys = {};
            var sent_friend_requests = {};
            for(var i=0; i<this.graph.sent_friend_requests.length; i++) {
                var sent_friend_request = this.graph.sent_friend_requests[i];
                if (!dh_private_keys[sent_friend_request.rid]) {
                    dh_private_keys[sent_friend_request.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                try {
                    var decrypted = this.decrypt(sent_friend_requests['relationship']);
                    var relationship = JSON.parse(decrypted);
                    sent_friend_requests[sent_friend_request.rid] = sent_friend_request;
                    dh_private_keys[sent_friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                } catch(err) {
                    dh_private_keys[sent_friend_request.rid].dh_public_keys.push(sent_friend_request.dh_public_key);
                }
            }
            var friend_requests = {};
            for(var i=0; i<this.graph.friend_requests.length; i++) {
                var friend_request = this.graph.friend_requests[i];
                if (!dh_private_keys[sent_friend_request.rid]) {
                    dh_private_keys[sent_friend_request.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                try {
                    var decrypted = this.decrypt(friend_request.relationship);
                    var relationship = JSON.parse(decrypted);
                    friend_requests[friend_request.rid] = friend_request;
                    dh_private_keys[friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                } catch(err) {
                    dh_private_keys[friend_request.rid].dh_public_keys.push(friend_request.dh_public_key);
                }
            }
            var friends = {};
            for(var i=0; i<this.graph.friends.length; i++) {
                var friend = this.graph.friends[i];
                if (!dh_private_keys[friend.rid]) {
                    dh_private_keys[friend.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                try {
                    var decrypted = this.decrypt(friend.relationship);
                    var relationship = JSON.parse(decrypted);
                    friends[friend.rid] = friend;
                    dh_private_keys[friend.rid].dh_private_keys.push(relationship.dh_private_key);
                } catch(err) {
                    dh_private_keys[friend.rid].dh_public_keys.push(friend.dh_public_key);
                }
            }
            var messages = {};
            var chats = {};
            dance:
            for(var i=0; i<this.graph.friends.length; i++) {
                var message = this.graph.friends[i];
                if (!message.rid) continue;
                if (!dh_private_keys[message.rid]) continue;
                if (message.dh_public_key) continue;
                for(var j=0; j<dh_private_keys[message.rid].dh_private_keys.length; j++) {
                    var dh_private_key = dh_private_keys[message.rid].dh_private_keys[j];
                    for(var k=0; k<dh_private_keys[message.rid].dh_public_keys.length; k++) {
                        var dh_public_key = dh_private_keys[message.rid].dh_public_keys[j];
                        try {
                            if (this.stored_secrets['shared_secret-' + dh_public_key.substr(0, 25) + dh_private_key.substr(0, 25)]) {
                                var shared_secret = this.stored_secrets['shared_secret-' + dh_public_key.substr(0, 25) + dh_private_key.substr(0, 25)];
                            } else {
                                var dh = diffiehellman.getDiffieHellman('modp17');
                                var dh1 = diffiehellman.createDiffieHellman(dh.getPrime(), dh.getGenerator());
                                var pubk2 = this.hexToBytes(dh_public_key);
                                dh1.setPublicKey(pubk2);
                                dh1.setPrivateKey(this.hexToBytes(dh_private_key));
                                var shared_secret = dh1.computeSecret(pubk2).toString('hex'); //this is the actual shared secret
                                this.storage.set('shared_secret-' + dh_public_key.substr(0, 25) + dh_private_key.substr(0, 25), shared_secret);
                            }
                            var decrypted = this.shared_decrypt(shared_secret, message.relationship);
                            if(decrypted != '') {
                                messages[message.rid] = message;
                                if (!chats[message.rid]) {
                                    chats[message.rid] = [];
                                }
                                var messageJson = JSON.parse(decrypted)
                                if(messageJson.chatText) {
                                    message.relationship = messageJson;
                                    chats[message.rid].push(message);
                                }
                                break dance;
                            }
                        } catch(err) {

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
            }

            if(arr_friends.length > 0) {
                let arr_friends_keys = Array.from(friends_diff.keys())
                this.graph.friends = []
                for(var i=0; i<arr_friends_keys.length; i++) {
                    if (usernames[arr_friends_keys[i]]) {
                        messages[i].username = usernames[arr_friends_keys[i]];
                    }
                    this.graph.friends.push(friends[arr_friends_keys[i]])
                }
            }
            if (this.platform.is('android') || this.platform.is('ios')) {
                this.badge.set(this.graph.friend_requests.length);
            }
            this.graph.keys = dh_private_keys;
            resolve1();
        });
    }

    decrypt(message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.bulletinSecretService.key.toWIF()).digest().toHex(), 'salt', 400, 32);
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

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }
}