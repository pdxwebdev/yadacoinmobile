import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Badge } from '@ionic-native/badge';
import { Http, RequestOptions } from '@angular/http';
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
    new_group_messages_count: any; //total new group messages
    new_group_messages_counts: any; //new group messages by rid
    new_sign_ins_count: any; //total new sign ins
    new_sign_ins_counts: any; //new sign ins by rid
    friend_request_count: any; //total friend requests
    friends_indexed: any;
    getGraphError = false;
    getSentFriendRequestsError = false;
    getGroupsRequestsError = false;
    getFriendRequestsError = false;
    getFriendsError = false;
    getMessagesError = false;
    getNewMessagesError = false;
    getSignInsError = false;
    getNewSignInsError = false;
    getPostsError = false;
    getReactsError = false;
    getCommentsError = false;
    getcommentReactsError = false;
    getcommentRepliesError = false;
    usernames = {};
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
        this.new_group_messages_count = 0;
        this.new_group_messages_counts = {};
        this.new_sign_ins_count = this.new_sign_ins_count || 0;
        this.new_sign_ins_counts = {};
        this.friend_request_count = this.friend_request_count || 0;
        this.usernames = {};
        this.friends_indexed = {};
    }

    endpointRequest(endpoint, ids=null) {
        return new Promise((resolve, reject) => {
            let options = new RequestOptions({ withCredentials: true });
            if (ids) {
                var promise = this.ahttp.post(
                    this.settingsService.remoteSettings['graphUrl'] + '/' + endpoint + '?origin=' + encodeURIComponent(window.location.href) + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret,
                    {ids: ids},
                    options
                );
            } else {
                var promise = this.ahttp.get(
                    this.settingsService.remoteSettings['graphUrl'] + '/' + endpoint + '?origin=' + encodeURIComponent(window.location.href) + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret,
                    options
                )
            }
            
            promise
            .subscribe((data) => {
                try {
                    var info = JSON.parse(data['_body']);
                    this.graph.rid = info.rid;
                    this.graph.registered = info.registered;
                    this.graph.pending_registration = info.pending_registration;
                    resolve(info);
                } catch(err) {
                }
            },
            (err) => {
                reject(err);
            });
        });
    }

    getInfo() {
        return new Promise((resolve, reject) => {
            if (!this.settingsService.remoteSettings['walletUrl']) return resolve();
            this.endpointRequest('get-graph-info')
            .then((data: any) => {
                this.getGraphError = false;
                resolve(data);
            }).catch((err) => {
                this.getGraphError = true;
                reject(null);
            });
        })
    }

    getSentFriendRequests() {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-sent-friend-requests')
            .then((data: any) => {
                this.graph.sent_friend_requests = this.parseSentFriendRequests(data.sent_friend_requests);
                this.getSentFriendRequestsError = false;
                resolve();
            }).catch((err) => {
                this.getSentFriendRequestsError = true;
                reject(null);
            });
        });
    }

    getFriendRequests() {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-friend-requests')
            .then((data: any) => {
                this.graph.friend_requests = this.parseFriendRequests(data.friend_requests);
                this.getFriendRequestsError = false;
                resolve();
            }).catch((err) => {
                this.getFriendRequestsError = true;
                reject(null);
            }).catch(() => {
                reject();
            });
        });
    }

    getFriends() {
        return this.getSentFriendRequests()
        .then(() => {
            return this.getFriendRequests()
        })
        .then(() => {
            return this.endpointRequest('get-graph-friends')
        })
        .then((data: any) => {
            return this.parseFriends(data.friends)
        })
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
        });
    }

    getGroups() {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-sent-friend-requests')
            .then((data: any) => {
                return this.parseGroups(data.sent_friend_requests);
            }).then((groups) => {
                this.getGroupsRequestsError = false;
                this.graph.groups = groups;
                resolve();
            }).catch((err) => {
                this.getGroupsRequestsError = true;
                reject(null);
            });
        });
    }

    getMessages(rid) {
        //get messages for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-messages')
            .then((data: any) => {
                return this.parseMessages(data.messages, 'new_messages_counts', 'new_messages_count', rid, 'chatText', 'last_message_height')
            })
            .then((chats: any) => {
                if (!this.graph.messages) {
                    this.graph.messages = {};
                }
                if (chats[rid]){
                    this.graph.messages[rid] = chats[rid];
                    this.graph.messages[rid].sort(function (a, b) {
                        if (parseInt(a.time) > parseInt(b.time))
                        return 1
                        if ( parseInt(a.time) < parseInt(b.time))
                        return -1
                        return 0
                    });
                }
                this.getMessagesError = false;                
                return resolve(chats[rid]);
            }).catch((err) => {
                this.getMessagesError = true;
                reject(err);
            });
        });
    }

    getNewMessages() {
        //get the latest message for each friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-new-messages')
            .then((data: any) => {
                return this.parseNewMessages(data.new_messages, 'new_messages_counts', 'new_messages_count', 'last_message_height');
            })
            .then((newChats: any) => {
                this.graph.newMessages = newChats;
                this.getNewMessagesError = false;
                resolve(newChats);
            }).catch((err) => {
                this.getNewMessagesError = true;
                reject(err);
            });
        });
    }

    getGroupMessages(key, requested_rid, rid) {
        //get messages for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-messages')
            .then((data: any) => {
                return this.parseGroupMessages(key, data.messages, 'new_group_messages_counts', 'new_group_messages_count', rid, 'groupChatText', 'last_group_message_height')
            })
            .then((chats: any) => {
                if (!this.graph.messages) {
                    this.graph.messages = {};
                }
                var choice_rid = requested_rid || rid;
                if (choice_rid && chats[choice_rid]){
                    this.graph.messages[choice_rid] = chats[choice_rid];
                    this.graph.messages[choice_rid].sort(function (a, b) {
                        if (parseInt(a.time) > parseInt(b.time))
                        return 1
                        if ( parseInt(a.time) < parseInt(b.time))
                        return -1
                        return 0
                    });
                }
                this.getMessagesError = false;                
                return resolve(chats[choice_rid]);
            }).catch((err) => {
                this.getMessagesError = true;
                reject(err);
            });
        });
    }

    getNewGroupMessages() {
        //get the latest message for each friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-new-messages')
            .then((data: any) => {
                return this.parseNewMessages(data.new_messages, 'new_group_messages_counts', 'new_group_messages_count', 'last_group_message_height');
            })
            .then((newChats: any) => {
                this.graph.newGroupMessages = newChats;
                this.getNewMessagesError = false;
                resolve(newChats);
            }).catch((err) => {
                this.getNewMessagesError = true;
                reject(err);
            });
        });
    }

    getSignIns(rid) {
        //get sign ins for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-new-messages')
            .then((data: any) => {
                return this.parseMessages(data.new_messages, 'new_sign_ins_counts', 'new_sign_ins_count', rid, 'signIn', 'last_sign_in_height');
            })
            .then((signIns: any) => {
                signIns[rid].sort(function (a, b) {
                  if (a.height > b.height)
                    return -1
                  if ( a.height < b.height)
                    return 1
                  return 0
                });
                this.graph.signIns = signIns[rid];
                this.getSignInsError = false;
                resolve(signIns[rid]);
            }).catch((err) => {
                this.getSignInsError = true;
                reject(err);
            });
        });
    }

    getNewSignIns() {
        //get the latest sign ins for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-new-messages')
            .then((data: any) => {
                return this.parseNewMessages(data.new_messages, 'new_sign_ins_counts', 'new_sign_ins_count', 'last_sign_in_height');
            })
            .then((newSignIns: any) => {
                this.graph.newSignIns = newSignIns;
                this.getNewSignInsError = false;
                resolve(newSignIns);
            }).catch((err) => {
                this.getNewSignInsError = true;
                reject(err);
            });
        });
    }

    getReacts(ids, rid=null) {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-reacts', ids)
            .then((data: any) => {
                this.graph.reacts = this.parseMessages(data.reacts, 'new_reacts_counts', 'new_reacts_count', rid, 'chatText', 'last_react_height');
                this.getReactsError = false;
                resolve(data.reacts);
            }).catch(() => {
                this.getReactsError = true;
                reject(null);
            });
        });
    }

    getComments(ids, rid=null) {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-comments', ids)
            .then((data: any) => {
                this.graph.comments = this.parseMessages(data.reacts, 'new_comments_counts', 'new_comments_count', rid, 'chatText', 'last_comment_height');
                this.getCommentsError = false;
                resolve(data.comments);
            }).catch(() => {
                this.getCommentsError = true;
                reject(null);
            });
        });
    }

    getCommentReacts(ids, rid=null) {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-reacts', ids)
            .then((data: any) => {
                this.graph.commentReacts = this.parseMessages(data.reacts, 'new_comment_reacts_counts', 'new_comment_reacts_count', rid, 'chatText', 'last_comment_react_height');
                this.getcommentReactsError = false;
                resolve(data.comment_reacts);
            }).catch(() => {
                this.getcommentReactsError = true;
                reject(null);
            });
        });
    }

    getCommentReplies(ids, rid=null) {
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-comments', ids)
            .then((data: any) => {
                this.graph.commentReplies = this.parseMessages(data.reacts, 'new_comment_comments_counts', 'new_comment_comments_count', rid, 'chatText', 'last_comment_comment_height');
                this.getcommentRepliesError = false;
                resolve(data.comments);
            }).catch(() => {
                this.getcommentRepliesError = true;
                reject(null);
            });
        });
    }

    parseSentFriendRequests(sent_friend_requests) {
        var sent_friend_requestsObj = {};
        if (!this.graph.friends) this.graph.friends = [];
        for(var i=0; i < sent_friend_requests.length; i++) {
            var sent_friend_request = sent_friend_requests[i];
            if (!this.keys[sent_friend_request.rid]) {
                this.keys[sent_friend_request.rid] = {
                    dh_private_keys: [],
                    dh_public_keys: []
                };
            }
            var decrypted = this.decrypt(sent_friend_request['relationship']);
            try {
                var relationship = JSON.parse(decrypted);
                sent_friend_requestsObj[sent_friend_request.rid] = sent_friend_request;
                //not sure how this affects the friends list yet, since we can't return friends from here
                //friends[sent_friend_request.rid] = sent_friend_request;
                sent_friend_request['relationship'] = relationship;
                this.friends_indexed[sent_friend_request.rid] = sent_friend_request;
                if (this.keys[sent_friend_request.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1 && relationship.dh_private_key) {
                    this.keys[sent_friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                }
            } catch(err) {
                if (this.keys[sent_friend_request.rid].dh_public_keys.indexOf(sent_friend_request.dh_public_key) === -1 && sent_friend_request.dh_public_key) {
                    this.keys[sent_friend_request.rid].dh_public_keys.push(sent_friend_request.dh_public_key);
                }
            }
        }
        for(var i=0; i < sent_friend_requests.length; i++) {
            var sent_friend_request = sent_friend_requests[i];
            if(typeof(sent_friend_request['relationship']) != 'object') {
                //TODO: VERIFY THE BULLETIN SECRET!
                if(sent_friend_requestsObj[sent_friend_request.rid]) {
                    this.graph.friends.push(sent_friend_requestsObj[sent_friend_request.rid]);
                    delete sent_friend_requestsObj[sent_friend_request.rid];
                }
            }
        }

        var arr_sent_friend_requests = [];
        for(let i in sent_friend_requestsObj) {
            arr_sent_friend_requests.push(sent_friend_requestsObj[i].rid);
            if (sent_friend_requestsObj[i].relationship && sent_friend_requestsObj[i].relationship.their_username) {
                this.usernames[sent_friend_requestsObj[i].rid] = sent_friend_requestsObj[i].their_username;
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
            try {
                var relationship = JSON.parse(decrypted);
                this.graph.friends.push(friend_request);
                delete friend_requestsObj[friend_request.rid];
                friend_request['relationship'] = relationship;
                this.friends_indexed[friend_request.rid] = friend_request;
                if (this.keys[friend_request.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1 && relationship.dh_private_key) {
                    this.keys[friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                }
            } catch(err) {
                friend_requestsObj[friend_request.rid] = friend_request;
                if (this.keys[friend_request.rid].dh_public_keys.indexOf(friend_request.dh_public_key) === -1 && friend_request.dh_public_key) {
                    this.keys[friend_request.rid].dh_public_keys.push(friend_request.dh_public_key);
                }
            }
        }

        var arr_friend_requests = [];
        for(let i in friend_requestsObj) {
            arr_friend_requests.push(friend_requestsObj[i].rid);
            if (friend_requestsObj[i].relationship && friend_requestsObj[i].relationship.their_username) {
                this.usernames[friend_requestsObj[i].rid] = friend_requestsObj[i].their_username;
            }
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
                var decrypted;
                var bypassDecrypt = false;
                if (typeof friend.relationship == 'object') {
                    var bypassDecrypt = true;
                } else {
                    decrypted = this.decrypt(friend.relationship);
                }
                try {
                    var relationship;
                    if (!bypassDecrypt) {
                        relationship = JSON.parse(decrypted);
                        friend['relationship'] = relationship;
                    }
                    friendsObj[friend.rid] = friend;
                    if (this.keys[friend.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1 && relationship.dh_private_key) {
                        this.keys[friend.rid].dh_private_keys.push(relationship.dh_private_key);
                    }
                } catch(err) {
                    if (this.keys[friend.rid].dh_public_keys.indexOf(friend.dh_public_key) === -1 && friend.dh_public_key) {
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
                    if (friendsObj[arr_friends_keys[i]].relationship && friendsObj[arr_friends_keys[i]].relationship.their_username) {
                        this.usernames[friendsObj[arr_friends_keys[i]].rid] = friendsObj[arr_friends_keys[i]].their_username;
                    }
                    if (friendsObj[arr_friends_keys[i]].username) {
                        this.usernames[friendsObj[arr_friends_keys[i]].rid] = friendsObj[arr_friends_keys[i]].username;
                    }
                }
            }

            resolve(friends);
        });
    }

    parseGroups(groups) {
        // we must call getSentFriendRequests and getFriendRequests before getting here
        // because we need this.keys to be populated with the dh_public_keys and dh_private_keys from the requests
        // though friends really should be cached
        // should be key: shared-secret_rid|pub_key[:26]priv_key[:26], value: {shared_secret: <shared_secret>, friend: [transaction.dh_public_key, transaction.dh_private_key]}
        return new Promise((resolve, reject) => {
            //start "just do dedup yada server because yada server adds itself to the friends array automatically straight from the api"
            var groupsObj = {};
            if (!this.graph.groups) this.graph.groups = [];
            for(var i=0; i<groups.length; i++) {
                var group = groups[i];
                if (!this.keys[group.rid]) {
                    this.keys[group.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                var decrypted;
                var bypassDecrypt = false;
                if (typeof group.relationship == 'object') {
                    var bypassDecrypt = true;
                } else {
                    decrypted = this.decrypt(group.relationship);
                }
                try {
                    var relationship;
                    if (!bypassDecrypt) {
                        relationship = JSON.parse(decrypted);
                        group['relationship'] = relationship;
                    }
                    if (!group.relationship.group) {
                        continue;
                    }
                    groupsObj[group.rid] = group;
                    if (this.keys[group.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1 && relationship.dh_private_key) {
                        this.keys[group.rid].dh_private_keys.push(relationship.dh_private_key);
                    }
                } catch(err) {
                    if (this.keys[group.rid].dh_public_keys.indexOf(group.dh_public_key) === -1 && group.dh_public_key) {
                        this.keys[group.rid].dh_public_keys.push(group.dh_public_key);
                    }
                }
            }

            var arr_friends = Object.keys(groupsObj);

            groups = []
            let friends_diff = new Set(arr_friends);
            if(arr_friends.length > 0) {
                let arr_friends_keys = Array.from(friends_diff.keys())
                for(i=0; i<arr_friends_keys.length; i++) {
                    groups.push(groupsObj[arr_friends_keys[i]])
                    if (groupsObj[arr_friends_keys[i]].relationship && groupsObj[arr_friends_keys[i]].relationship.their_username) {
                        this.usernames[groupsObj[arr_friends_keys[i]].rid] = groupsObj[arr_friends_keys[i]].relationship.their_username;
                    }
                    if (groupsObj[arr_friends_keys[i]].username) {
                        this.usernames[groupsObj[arr_friends_keys[i]].rid] = groupsObj[arr_friends_keys[i]].username;
                    }
                }
            }

            resolve(groups);
            return groups;
        });
    }

    parseMessages(messages, graphCounts, graphCount, rid=null, messageType=null, messageHeightType=null) {
        this[graphCount] = 0;
        return new Promise((resolve, reject) => {
            this.getSharedSecrets().then(() => {
                return this.getMessageHeights(graphCounts, messageHeightType);
            })
            .then(() => {
                var chats = {};
                dance:
                for(var i=0; i<messages.length; i++) {
                    var message = messages[i];
                    if(!rid && chats[message.rid]) continue;
                    if(rid && message.rid !== rid) continue;
                    if (!message.rid) continue;
                    if (!this.stored_secrets[message.rid]) continue;
                    if (message.dh_public_key) continue;
                    //hopefully we've prepared the stored_secrets option before getting here 
                    //by calling getSentFriendRequests and getFriendRequests
                    for(var j=0; j<this.stored_secrets[message.rid].length; j++) {
                        var shared_secret = this.stored_secrets[message.rid][j];
                        try {
                            var decrypted = this.shared_decrypt(shared_secret.shared_secret, message.relationship);
                        } 
                        catch(error) {
                            continue
                        }
                        try {
                            var messageJson = JSON.parse(decrypted);
                        } catch(err) {
                            continue;
                        }
                        if(messageJson[messageType]) {
                            message.relationship = messageJson;
                            message.shared_secret = shared_secret.shared_secret
                            message.dh_public_key = shared_secret.dh_public_key
                            message.dh_private_key = shared_secret.dh_private_key
                            message.username = this.usernames[message.rid];
                            messages[message.rid] = message;
                            if (!chats[message.rid]) {
                                chats[message.rid] = [];
                            }
                            chats[message.rid].push(message);
                            if(this[graphCounts][message.rid]) {
                                if(message.height > this[graphCounts][message.rid]) {
                                    this[graphCount]++;
                                    if(!this[graphCounts][message.rid]) {
                                        this[graphCounts][message.rid] = 0;
                                    }
                                    this[graphCounts][message.rid]++;
                                }
                            } else {
                                this[graphCounts][message.rid] = 1;
                                this[graphCount]++;
                            }
                        }
                        continue dance;
                    }
                }
                resolve(chats);
            });
        });
    }

    parseNewMessages(messages, graphCounts, graphCount, heightType) {
        this[graphCount] = 0;
        this[graphCounts] = {}
        var my_public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
        return new Promise((resolve, reject) => {
            return this.getMessageHeights(graphCounts, heightType)
            .then(() => {
                var new_messages = [];
                for(var i=0; i<messages.length; i++) {
                    var message = messages[i];
                    message.username = this.usernames[message.rid];
                    if (message.public_key != my_public_key) {
                        if(this[graphCounts][message.rid]) {
                            if(parseInt(message.time) > this[graphCounts][message.rid]) {
                                this[graphCounts][message.rid] = message.time;
                                this[graphCount]++;
                            }
                        } else {
                            this[graphCounts][message.rid] = parseInt(message.time);
                            this[graphCount]++;
                        }
                        new_messages.push(message);
                    }
                }
                return resolve(new_messages);
            });
        });
    }

    parseGroupMessages(key, messages, graphCounts, graphCount, rid=null, messageType=null, messageHeightType=null) {
        this[graphCount] = 0;
        return new Promise((resolve, reject) => {
            this.getGroupMessageHeights(graphCounts, messageHeightType)
            .then(() => {
                var chats = {};
                for(var i=0; i<messages.length; i++) {
                    var message = messages[i];
                    //hopefully we've prepared the stored_secrets option before getting here 
                    //by calling getSentFriendRequests and getFriendRequests
                    try {
                        var decrypted = this.shared_decrypt(key, message.relationship);
                        console.log(decrypted);
                    } 
                    catch(error) {
                        continue
                    }
                    try {
                        var messageJson = JSON.parse(decrypted);
                    } catch(err) {
                        continue;
                    }

                    var group_message_rid = message.requested_rid || message.rid;
                    if(messageJson[messageType]) {
                        message.relationship = messageJson;
                        message.username = this.usernames[group_message_rid];
                        messages[group_message_rid] = message;
                        if (!chats[group_message_rid]) {
                            chats[group_message_rid] = [];
                        }
                        chats[group_message_rid].push(message);
                        if(this[graphCounts][group_message_rid]) {
                            if(message.height > this[graphCounts][group_message_rid]) {
                                this[graphCount]++;
                                if(!this[graphCounts][group_message_rid]) {
                                    this[graphCounts][group_message_rid] = 0;
                                }
                                this[graphCounts][group_message_rid]++;
                            }
                        } else {
                            this[graphCounts][group_message_rid] = 1;
                            this[graphCount]++;
                        }
                    }
                }
                resolve(chats);
            });
        });
    }

    getSharedSecrets() {
        return new Promise((resolve, reject) => {
            this.getFriends()
            .then(() => {
                for(let i in this.keys) {
                    if(!this.stored_secrets[i]) {
                        this.stored_secrets[i] = [];
                    }
                    var stored_secrets_by_dh_public_key = {}
                    for(var ss=0; ss < this.stored_secrets[i].length; ss++) {
                        stored_secrets_by_dh_public_key[this.stored_secrets[i][ss].dh_public_key + this.stored_secrets[i][ss].dh_private_key] = this.stored_secrets[i][ss]
                    }
                    for(var j=0; j < this.keys[i].dh_private_keys.length; j++) {
                        var dh_private_key = this.keys[i].dh_private_keys[j];
                        if (!dh_private_key) continue;
                        for(var k=0; k < this.keys[i].dh_public_keys.length; k++) {
                            var dh_public_key = this.keys[i].dh_public_keys[k];
                            if (!dh_public_key) continue;
                            if (stored_secrets_by_dh_public_key[dh_public_key + dh_private_key]) {
                                continue;
                            }
                            var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
                                return parseInt(h, 16)
                            }));
                            var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
                                return parseInt(h, 16)
                            }));
                            var shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
                            this.stored_secrets[i].push({
                                shared_secret: shared_secret,
                                dh_public_key: dh_public_key,
                                dh_private_key: dh_private_key,
                                rid: i
                            });
                        }
                    }
                }
                resolve();
            });
        });
    }

    getSharedSecretForRid(rid) {
        return new Promise((resolve, reject) => {
            this.getSharedSecrets()
            .then(() => {
                if (this.stored_secrets[rid] && this.stored_secrets[rid].length > 0) {
                    resolve(this.stored_secrets[rid][0]);
                } else {
                    reject('no shared secret found for rid: ' + rid);         
                }
            });
        });
    }

    getMessageHeights(graphCounts, heightType) {
        this[graphCounts] = {};
        return new Promise((resolve, reject) => {
            this.storage.forEach((value, key) => {
                if (key.indexOf(heightType) === 0) {
                    var rid = key.slice(heightType + '-'.length);
                    this[graphCounts][rid] = parseInt(value);
                }
            })
            .then(() => {
                resolve();
            });
        });
    }

    getGroupMessageHeights(graphCounts, heightType) {
        this[graphCounts] = {};
        return new Promise((resolve, reject) => {
            this.storage.forEach((value, key) => {
                if (key.indexOf(heightType) === 0) {
                    var rid = key.slice(heightType + '-'.length);
                    this[graphCounts][rid] = parseInt(value);
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