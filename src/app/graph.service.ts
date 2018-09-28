import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Badge } from '@ionic-native/badge';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';
import { LoadingController } from 'ionic-angular';


declare var forge;
declare var X25519;
declare var Base64;

@Injectable()
export class GraphService {
    graph: any;
    graphproviderAddress: any;
    xhr: any;
    key: any;
    rid: any;
    stored_secrets: any;
    stored_secrets_by_rid: any;
    accepted_friend_requests: any;
    keys: any;
    storingSecretsModal: any;
    new_messages_count: any; //total new messages
    new_messages_counts: any; //new messages by rid
    new_sign_ins_count: any; //total new sign ins
    new_sign_ins_counts: any; //new sign ins by rid
    friend_request_count: any; //total friend requests
    constructor(
        private storage: Storage,
        private bulletinSecretService: BulletinSecretService,
        private settingsService: SettingsService,
        private badge: Badge,
        private platform: Platform,
        private loadingCtrl: LoadingController,
        private ahttp: Http
    ) {
        this.stored_secrets = {};
        this.stored_secrets_by_rid = {};
        this.accepted_friend_requests = [];
        this.keys = {};
        this.new_messages_count = 0;
        this.new_messages_counts = {};
        this.new_sign_ins_count = 0;
        this.new_sign_ins_counts = {};
        this.friend_request_count = 0;
    }

    endpointRequest(endpoint) {
        return new Promise((resolve, reject) => {
            return this.settingsService.refresh().then(() => {
                this.ahttp.get(this.settingsService.baseAddress + '/' + endpoint + '?bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
                .subscribe((data) => {
                    var info = JSON.parse(data['_body']);
                    this.graph.rid = info.rid;
                    resolve(info);
                });
            });
        });
    }

    getInfo() {
        return this.endpointRequest('get-graph-info');
    }

    getSentFriendRequests() {
        return this.endpointRequest('get-graph-sent-friend-requests')
        .then((data: any) => {
            this.graph.sent_friend_requests = this.parseSentFriendRequests(data.sent_friend_requests);
        });
    }

    getFriendRequests() {
        this.storingSecretsModal = this.loadingCtrl.create({
            content: 'Caching shared secrets, please wait... (could take several minutes)'
        });
        this.storingSecretsModal.present();
        return this.endpointRequest('get-graph-friend-requests')
        .then((data: any) => {
            this.graph.friend_requests = this.parseFriendRequests(data.friend_requests);
        })
        .then(() => {
            this.storeSharedSecrets()
            .then(() => {
                this.storingSecretsModal.dismiss();
            });
        });
    }

    getFriends() {
        return new Promise((resolve, reject) => {
            this.getSentFriendRequests()
            .then(() => {
                this.getFriendRequests()
                .then(() => {
                    this.endpointRequest('get-graph-friends')
                    .then((data: any) => {
                        this.parseFriends(data.friends)
                        .then((friends: any) => {
                            //sort list alphabetically by username
                            friends.sort(function (a, b) {
                              if (a.username < b.username)
                                return -1
                              if ( a.username > b.username)
                                return 1
                              return 0
                            });
                            this.graph.friends = friends;
                            resolve();
                        });
                    });
                })
            });
        });
    }

    getMessages(rid) {
        //get messages for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-messages')
            .then((data: any) => {
                this.parseMessages(data.messages, this.new_messages_counts, this.new_messages_count, rid, 'chatText', 'last_message_height')
                .then((chats: any) => {
                    chats.sort(function (a, b) {
                      if (a.height > b.height)
                        return -1
                      if ( a.height < b.height)
                        return 1
                      return 0
                    });
                    this.graph.messages = chats;
                    resolve(chats);
                });
            });
        });
    }

    getNewMessages() {
        //get the latest message for each friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-new-messages')
            .then((data: any) => {
                this.parseNewMessages(data.new_messages, this.new_messages_counts, this.new_messages_count, null, 'chatText', 'last_message_height')
                .then((newChats: any) => {
                    newChats.sort(function (a, b) {
                      if (a.height > b.height)
                        return -1
                      if ( a.height < b.height)
                        return 1
                      return 0
                    });
                    this.graph.newMessages = newChats;
                    resolve(newChats);
                });
            });
        });
    }

    getSignIns(rid) {
        //get sign ins for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-messages')
            .then((data: any) => {
                this.parseMessages(data.messages, this.new_sign_ins_counts, this.new_sign_ins_count, rid, 'signIn', 'last_sign_in_height')
                .then((signIns: any) => {
                    signIns.sort(function (a, b) {
                      if (a.height > b.height)
                        return -1
                      if ( a.height < b.height)
                        return 1
                      return 0
                    });
                    this.graph.signIns = signIns;
                    resolve(signIns);
                });
            });
        });
    }

    getNewSignIns() {
        //get the latest sign ins for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-messages')
            .then((data: any) => {
                this.parseMessages(data.messages, this.new_sign_ins_counts, this.new_sign_ins_count, null, 'signIn', 'last_sign_in_height')
                .then((newSignIns: any) => {
                    this.graph.newSignIns = newSignIns;
                    resolve(newSignIns);
                });
            });
        });
    }

    getPosts() {
        return this.endpointRequest('get-graph-posts')
        .then((data: any) => {
            this.graph.posts = this.parsePosts(data.posts);
        });
    }

    parseSentFriendRequests(sent_friend_requests) {
        var usernames = {};
        var sent_friend_requestsObj = {};
        for(var i=0; i < sent_friend_requests.length; i++) {
            var sent_friend_request = sent_friend_requests[i];
            if (!this.keys[sent_friend_request.rid]) {
                this.keys[sent_friend_request.rid] = {
                    dh_private_keys: [],
                    dh_public_keys: []
                };
            }
            var decrypted = this.decrypt(sent_friend_request['relationship']);
            if (decrypted.indexOf('{') === 0) {
                var relationship = JSON.parse(decrypted);
                sent_friend_requestsObj[sent_friend_request.rid] = sent_friend_request;
                //not sure how this affects the friends list yet, since we can't return friends from here
                //friends[sent_friend_request.rid] = sent_friend_request;
                if (this.keys[sent_friend_request.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1) {
                    this.keys[sent_friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                }
            } else {
                if (this.keys[sent_friend_request.rid].dh_public_keys.indexOf(sent_friend_request.dh_public_key) === -1) {
                    this.keys[sent_friend_request.rid].dh_public_keys.push(sent_friend_request.dh_public_key);
                }
            }
        }

        var arr_sent_friend_requests = [];
        for(let i in sent_friend_requestsObj) {
            arr_sent_friend_requests.push(sent_friend_requestsObj[i].rid);
            if (sent_friend_requestsObj[i].username) {
                usernames[sent_friend_requestsObj[i].rid] = sent_friend_requestsObj[i].username
            }
        }
        
        let sent_friend_requests_diff = new Set(arr_sent_friend_requests);

        sent_friend_requests = []
        let arr_sent_friend_request_keys = Array.from(sent_friend_requests_diff.keys())
        for(i=0; i<arr_sent_friend_request_keys.length; i++) {
            sent_friend_requests.push(sent_friend_requestsObj[arr_sent_friend_request_keys[i]])
        }

        return sent_friend_requests;
    }

    parseFriendRequests(friend_requests) {
        var friend_requestsObj = {};
        if (!this.graph.friends) this.graph.friends = [];
        for(var i=0; i<friend_requests.length; i++) {
            var friend_request = friend_requests[i];
            if (!this.keys[friend_request.rid]) {
                this.keys[friend_request.rid] = {
                    dh_private_keys: [],
                    dh_public_keys: []
                };
            }
            var decrypted = this.decrypt(friend_request.relationship);
            if (decrypted.indexOf('{') === 0) {
                var relationship = JSON.parse(decrypted);
                this.graph.friends.push(friend_request);
                delete friend_requestsObj[friend_request.rid];
                if (this.keys[friend_request.rid].dh_private_keys.indexOf(relationship.dh_private_key)) {
                    this.keys[friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                }
            } else {
                friend_requestsObj[friend_request.rid] = friend_request;
                if (this.keys[friend_request.rid].dh_public_keys.indexOf(friend_request.dh_public_key)) {
                    this.keys[friend_request.rid].dh_public_keys.push(friend_request.dh_public_key);
                }
            }
        }

        var arr_friend_requests = [];
        for(let i in friend_requestsObj) {
            arr_friend_requests.push(friend_requestsObj[i].rid);
        }

        friend_requests = []
        let friend_requests_diff = new Set(arr_friend_requests);
        if(arr_friend_requests.length > 0) {
            let arr_friend_request_keys = Array.from(friend_requests_diff.keys())
            for(i=0; i<arr_friend_request_keys.length; i++) {
                friend_requests.push(friend_requestsObj[arr_friend_request_keys[i]])
            }
        }
        this.friend_request_count = friend_requests.length;
        if (this.platform.is('android') || this.platform.is('ios')) {
            this.badge.set(friend_requests.length);
        }

        return friend_requests;
    }

    parseFriends(friends) {
        // we must call getSentFriendRequests and getFriendRequests before getting here
        // because we need this.keys to be populated with the dh_public_keys and dh_private_keys from the requests
        // though friends really should be cached
        // should be key: shared-secret_rid|pub_key[:26]priv_key[:26], value: {shared_secret: <shared_secret>, friend: [transaction.dh_public_key, transaction.dh_private_key]}
        return new Promise((resolve, reject) => {
            this.getStoredSecrets().then(() => {

                //start "just do dedup yada server because yada server adds itself to the friends array automatically straight from the api"
                var friendsObj = {};
                if (!this.graph.friends) this.graph.friends = [];
                friends = friends.concat(this.graph.friends);
                for(var i=0; i<friends.length; i++) {
                    var friend = friends[i];
                    if (!this.keys[friend.rid]) {
                        this.keys[friend.rid] = {
                            dh_private_keys: [],
                            dh_public_keys: []
                        };
                    }
                    var decrypted = this.decrypt(friend.relationship);
                    if (decrypted.indexOf('{') === 0) {
                        var relationship = JSON.parse(decrypted);
                        friendsObj[friend.rid] = friend;
                        if (this.keys[friend.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1) {
                            this.keys[friend.rid].dh_private_keys.push(relationship.dh_private_key);
                        }
                    } else {
                        if (this.keys[friend.rid].dh_public_keys.indexOf(friend.dh_public_key)) {
                            this.keys[friend.rid].dh_public_keys.push(friend.dh_public_key);
                        }
                    }
                }

                var secrets_rids = [];
                var stored_secrets_keys = Object.keys(this.stored_secrets);
                for (i=0; i < stored_secrets_keys.length; i++) {
                    var rid = stored_secrets_keys[i].slice('shared_secret-'.length, stored_secrets_keys[i].indexOf('|'));
                    secrets_rids.push(rid);
                }

                for (i=0; i < this.graph.sent_friend_requests.length; i++) {
                    var sent_friend_request = this.graph.sent_friend_requests[i];
                    if (secrets_rids.indexOf(sent_friend_request.rid) >= 0) {
                        friendsObj[sent_friend_request.rid] = sent_friend_request;
                    }
                }

                for (i=0; i < this.graph.friend_requests.length; i++) {
                    var friend_request = this.graph.friend_requests[i];
                    if (secrets_rids.indexOf(friend_request.rid) >= 0) {
                        friendsObj[friend_request.rid] = friend_request;
                    }
                }

                var arr_friends = Object.keys(friendsObj);

                friends = []
                let friends_diff = new Set(arr_friends);
                if(arr_friends.length > 0) {
                    let arr_friends_keys = Array.from(friends_diff.keys())
                    for(i=0; i<arr_friends_keys.length; i++) {
                        friends.push(friendsObj[arr_friends_keys[i]])
                    }
                }

                resolve(friends);
            });
        });
    }

    parseMessages(messages, graphCounts, graphCount, rid=null, messageType=null, messageHeightType=null) {
        graphCount = 0;
        return new Promise((resolve, reject) => {
            this.getStoredSecrets().then(() => {
                this.getMessageHeights(graphCounts, messageHeightType).then(() => {
                    var chats = {};
                    dance:
                    for(var i=0; i<messages.length; i++) {
                        var message = messages[i];
                        if(!rid && chats[message.rid]) continue;
                        if(rid && message.rid !== rid) continue;
                        if (!message.rid) continue;
                        if (!this.stored_secrets_by_rid[message.rid]) continue;
                        if (message.dh_public_key) continue;
                        //hopefully we've prepared the stored_secrets option before getting here 
                        //by calling getSentFriendRequests and getFriendRequests
                        for(var j=0; j<this.stored_secrets_by_rid[message.rid].length; j++) {
                            var shared_secret = this.stored_secrets_by_rid[message.rid][j];
                            try {
                                var decrypted = this.shared_decrypt(shared_secret.shared_secret, message.relationship);
                            } 
                            catch(error) {
                                continue
                            }
                            if(decrypted.indexOf('{') === 0) {
                                var messageJson = JSON.parse(decrypted);
                                if(messageJson[messageType]) {
                                    message.relationship = messageJson;
                                    message.shared_secret = shared_secret.shared_secret
                                    message.dh_public_key = shared_secret.dh_public_key
                                    message.dh_private_key = shared_secret.dh_private_key
                                    messages[message.rid] = message;
                                    if (!chats[message.rid]) {
                                        chats[message.rid] = [];
                                    }
                                    chats[message.rid].push(message);
                                    if(graphCounts[message.rid]) {
                                        if(message.height > graphCounts[message.rid]) {
                                            graphCount++;
                                            if(!graphCounts[message.rid]) {
                                                graphCounts[message.rid] = 0;
                                            }
                                            graphCounts[message.rid]++;
                                        }
                                    } else {
                                        graphCounts[message.rid] = 1;
                                        graphCount++;
                                    }
                                }
                                continue dance;
                            }
                        }
                    }
                    resolve(chats);
                });
            });
        });
    }

    parseNewMessages(messages, graphCounts, graphCount, heightType) {
        graphCount = 0;
        graphCounts = {}
        var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
        return new Promise((resolve, reject) => {
            return this.getMessageHeights()
            .then(() => {
                var new_messages = [];
                for(var i=0; i<messages.length; i++) {
                    if (messages[i].public_key != my_public_key) {
                        var message = messages[i];
                        if(graphCounts[message.rid]) {
                            if(message.height > graphCounts[message.rid]) {
                                graphCounts[message.rid] = message.height;
                                graphCount++;
                            }
                        } else {
                            graphCounts[message.rid] = message.height;
                            graphCount++;
                        }
                    }
                    new_messages.push(message);
                }
                resolve(new_messages);
            });
        });
    }

    parsePosts(posts) {
        return posts;
    }

    storeSharedSecrets() {
        return new Promise((resolve, reject) => {
            this.getStoredSecrets()
            .then(() => {
                for(let i in this.keys) {
                    for(var j=0; j < this.keys[i].dh_private_keys.length; j++) {
                        var dh_private_key = this.keys[i].dh_private_keys[j];
                        if (!dh_private_key) continue;
                        for(var k=0; k < this.keys[i].dh_public_keys.length; k++) {
                            var dh_public_key = this.keys[i].dh_public_keys[j];
                            if (!dh_public_key) continue;
                            var key = 'shared_secret-' + i + '|' + dh_public_key.slice(0, 26) + dh_private_key.slice(0, 26);
                            if (this.stored_secrets[key]) {
                                var shared_secret = this.stored_secrets[key];
                            } else {
                                var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
                                  return parseInt(h, 16)
                                }));
                                var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
                                  return parseInt(h, 16)
                                }));
                                shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
                                this.storage.set(
                                    key,
                                    JSON.stringify({
                                        shared_secret: shared_secret,
                                        dh_public_key: dh_public_key,
                                        dh_private_key: dh_private_key,
                                        rid: i
                                    })
                                );
                                if(!this.stored_secrets[key]) {
                                    this.stored_secrets[key] = [];
                                }
                                this.stored_secrets[key].push({
                                    shared_secret: shared_secret,
                                    dh_public_key: dh_public_key,
                                    dh_private_key: dh_private_key,
                                    rid: i
                                });
                            }
                        }
                    }
                }
                resolve();
            });
        });
    }

    getStoredSecrets() {
        this.stored_secrets_by_rid = {};
        return new Promise((resolve, reject) => {
            this.storage.forEach((value, key) => {
                if (key.indexOf('shared_secret') === 0 && key.indexOf('|') >= 0 && value.indexOf('{') === 0) {
                    
                    var secret_json = JSON.parse(value);
                    this.stored_secrets[key] = secret_json.shared_secret;

                    var rid = key.slice('shared_secret-'.length, key.indexOf('|'));
                    if(!this.stored_secrets_by_rid[rid]) {
                        this.stored_secrets_by_rid[rid] = [];
                    }
                    this.stored_secrets_by_rid[rid].push(secret_json);
                }
            })
            .then(() => {
                resolve();
            });
        });
    }

    getMessageHeights(graphCounts, heightType) {
        graphCounts = {};
        return new Promise((resolve, reject) => {
            this.storage.forEach((value, key) => {
                if (key.indexOf(heightType) === 0) {
                    var rid = key.slice(heightType + '-'.length);
                    graphCounts[rid] = parseInt(value);
                }
            })
            .then(() => {
                resolve();
            });
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
        return Base64.decode(decipher.output.data);
    }

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }

    toHex(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }
}