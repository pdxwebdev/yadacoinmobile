import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';

declare var forge;
declare var foobar;

@Injectable()
export class GraphService {
    graph: any;
    graphproviderAddress: any;
    xhr: any;
    key: any;
    constructor(private storage: Storage, private http: HTTP, private bulletinSecret: BulletinSecretService) {
        this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            this.graphproviderAddress = graphproviderAddress;
        });
        this.storage.get('key').then((key) => {
            if(key && typeof key == 'string') {
                this.key = foobar.bitcoin.ECPair.fromWIF(key);
            } else {
                this.key = foobar.bitcoin.ECPair.makeRandom();
                this.storage.set('key', this.key.toWIF());
            }
        });
    }

    getGraph(callback) {
        this.xhr = new XMLHttpRequest();
        this.xhr.open('GET', this.graphproviderAddress + '?bulletin_secret='+this.bulletinSecret.bulletin_secret, true);
        this.xhr.onreadystatechange = () => {
            if (this.xhr.readyState === 4) {
                this.graph = JSON.parse(this.xhr.responseText);
                var shared_secrets = [];
                var sent_friend_requests = {};
                for(var i=0; i<this.graph.sent_friend_requests.length; i++) {
                    var sent_friend_request = this.graph.sent_friend_requests[i];
                    try {
                        var decrypted = this.decrypt(sent_friend_request.relationship);
                        var relationship = JSON.parse(decrypted);
                        if(relationship.shared_secret != null) {
                            shared_secrets.push(relationship.shared_secret);
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
                            shared_secrets.push(relationship.shared_secret);
                            friend_requests[friend_request.rid] = friend_request;
                        }
                    } catch(err) {

                    }
                }
                var friends = {};
                for(var i=0; i<this.graph.messages.length; i++) {
                    var message = this.graph.messages[i];
                    for(var v=0; v<shared_secrets.length; v++) {
                        try {
                            var shared_secret = shared_secrets[v];
                            var decrypted = this.shared_decrypt(shared_secret, message.relationship);
                            if(decrypted != '') {
                                friends[message.rid] = message;
                            }
                        } catch(err) {

                        }
                    }
                }
                var arr_friends = [];
                for(let i in friends) {
                    arr_friends.push(friends[i].rid);
                }
                var arr_sent_friend_requests = [];
                for(let i in sent_friend_requests) {
                    arr_sent_friend_requests.push(sent_friend_requests[i].rid);
                }
                var arr_friend_requests = [];
                for(let i in friend_requests) {
                    arr_friend_requests.push(friend_requests[i].rid);
                }
                let friendsset = new Set(arr_friends);
                let sent_friend_requests_diff = new Set(arr_sent_friend_requests.filter(x => !friendsset.has(x)));
                let friend_requests_diff = new Set(arr_friend_requests.filter(x => !friendsset.has(x)));

                let arr_sent_friend_request_keys = Array.from(friend_requests_diff.keys())
                this.graph.sent_friend_requests = []
                for(var i=0; i<arr_sent_friend_request_keys.length; i++) {
                    this.graph.sent_friend_requests.push(sent_friend_requests[arr_sent_friend_request_keys[i]])
                }

                let arr_friend_request_keys = Array.from(friend_requests_diff.keys())
                this.graph.friend_requests = []
                for(var i=0; i<arr_friend_request_keys.length; i++) {
                    this.graph.friend_requests.push(friend_requests[arr_friend_request_keys[i]])
                }

                for(let i in friends) {
                    this.graph.friends.push(friends[i]);
                }

                callback();
            }
        }
        this.xhr.send();
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

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }
}