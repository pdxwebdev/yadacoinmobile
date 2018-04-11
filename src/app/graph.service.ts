import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
import { Badge } from '@ionic-native/badge';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';


declare var forge;
declare var foobar;

@Injectable()
export class GraphService {
    graph: any;
    graphproviderAddress: any;
    xhr: any;
    key: any;
    rid: any;
    humanHash: any;
    constructor(
        private storage: Storage,
        private http: HTTP,
        private bulletinSecretService: BulletinSecretService,
        private badge: Badge,
        private platform: Platform,
        private ahttp: Http
    ) {
        if(this.platform.is('cordova')) {
          http.setDataSerializer('json');
        }
    }

    getGraph() {
        return this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            this.graphproviderAddress = graphproviderAddress;
            return new Promise((resolve, reject) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve1, reject1) => {
                        if (this.platform.is('cordova')) {
                            this.http.get(
                                this.graphproviderAddress,
                                {bulletin_secret: this.bulletinSecretService.bulletin_secret},
                                {'Content-Type': 'application/json'}
                            ).then((data) => {
                                this.graphParser(data['data'], resolve1);
                            });
                        } else {
                            this.ahttp.get(this.graphproviderAddress + '?bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
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

    graphParser(data, resolve1) {
        this.graph = JSON.parse(data);
        this.graph.friend_posts.reverse();
        this.rid = this.graph.rid;
        this.humanHash = this.graph.human_hash;
        var shared_secrets = {};
        var sent_friend_requests = {};
        for(var i=0; i<this.graph.sent_friend_requests.length; i++) {
            var sent_friend_request = this.graph.sent_friend_requests[i];
            try {
                var decrypted = this.decrypt(sent_friend_request.relationship);
                var relationship = JSON.parse(decrypted);
                if(relationship.shared_secret != null) {
                    if (!shared_secrets[sent_friend_request.rid]) {
                        shared_secrets[sent_friend_request.rid] = [];
                    }
                    shared_secrets[sent_friend_request.rid].push(relationship.shared_secret);
                    sent_friend_requests[sent_friend_request.rid] = sent_friend_request;
                }
            } catch(err) {

            }
        }
        var friend_requests = {};
        for(var i=0; i<this.graph.friend_requests.length; i++) {
            var friend_request = this.graph.friend_requests[i];
            try {
                var decrypted = this.decrypt(friend_request.relationship);
                var relationship = JSON.parse(decrypted);
                if(relationship.shared_secret != null) {
                    if (!shared_secrets[friend_request.rid]) {
                        shared_secrets[friend_request.rid] = [];
                    }
                    shared_secrets[friend_request.rid].push(relationship.shared_secret);
                    friend_requests[friend_request.rid] = friend_request;
                }
            } catch(err) {
                friend_requests[friend_request.rid] = friend_request;
            }
        }
        var messages = {};
        var chats = {};
        for(var i=0; i<this.graph.messages.length; i++) {
            var message = this.graph.messages[i];
            if (!message.rid) continue;
            for(var j=0; j<shared_secrets[message.rid].length; j++) {
                var shared_secret = shared_secrets[message.rid][j];
                try {
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
                    }
                } catch(err) {

                }
            }
        }
        this.graph.chats = chats;
        var arr_messages = [];
        for(let i in messages) {
            arr_messages.push(messages[i].rid);
        }
        var arr_sent_friend_requests = [];
        for(let i in sent_friend_requests) {
            arr_sent_friend_requests.push(sent_friend_requests[i].rid);
        }
        var arr_friend_requests = [];
        for(let i in friend_requests) {
            arr_friend_requests.push(friend_requests[i].rid);
        }
        let messagesset = new Set(arr_messages);
        let sent_friend_requests_diff = new Set(arr_sent_friend_requests.filter(x => !messagesset.has(x)));
        let friend_requests_diff = new Set(arr_friend_requests.filter(x => !messagesset.has(x)));

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
        if (this.platform.is('cordova')) {
            this.badge.set(this.graph.friend_requests.length);
        }

        for(let i in messages) {
            this.graph.friends.push(messages[i]);
        }
        resolve1();
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