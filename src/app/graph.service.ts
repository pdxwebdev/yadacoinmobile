import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
import { TransactionService } from './transaction.service';
import { SettingsService } from './settings.service';
import { Badge } from '@ionic-native/badge';
import { Http, RequestOptions, Headers } from '@angular/http';
import { Events, Item, Platform } from 'ionic-angular';
import { timeout } from 'rxjs/operators';
import { Geolocation } from '@ionic-native/geolocation';
import { WalletService } from './wallet.service';
import { encrypt, decrypt, PrivateKey } from 'eciesjs'
import { identity } from 'rxjs';


declare var forge;
declare var X25519;
declare var Base64;
declare var foobar;

@Injectable()
export class GraphService {
    graph: any = {
      messages: [],
      friends: [],
      groups: [],
      files: [],
      mail: [],
      mypages: []
    };
    notifications = {};
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
    sent_friend_requests_indexed: any;
    getGraphError = false;
    getSentFriendRequestsError = false;
    getGroupsRequestsError = false;
    getFriendRequestsError = false;
    getFriendsError = false;
    getMessagesError = false;
    getMailError = false;
    getNewMessagesError = false;
    getSignInsError = false;
    getNewSignInsError = false;
    getPostsError = false;
    getReactsError = false;
    getCommentsError = false;
    getcommentReactsError = false;
    getcommentRepliesError = false;
    getCalendarError = false;
    getMyPagesError = false;
    usernames = {};
    username_signature = '';
    groups_indexed: any;
    counts: any;
    getMessagesForAllFriendsAndGroupsCalled: any;
    constructor(
        private storage: Storage,
        private bulletinSecretService: BulletinSecretService,
        private settingsService: SettingsService,
        private badge: Badge,
        private platform: Platform,
        private ahttp: Http,
        private transactionService: TransactionService,
        private geolocation: Geolocation,
        private walletService: WalletService,
        private events: Events
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
        this.friends_indexed = {};
        this.groups_indexed = {};
        this.counts = {};
        this.getMessagesForAllFriendsAndGroupsCalled = false
    }

    resetGraph() {
      this.graph = {
        messages: {},
        friends: [],
        groups: [],
        files: [],
        mail: [],
        mypages: []
      };
      this.groups_indexed = {}
      this.friends_indexed = {}
      this.notifications = {}
      this.getMessagesForAllFriendsAndGroupsCalled = false
      for (let i=0; i < Object.keys(this.settingsService.collections).length; i++) {
        let collectionKey = Object.keys(this.settingsService.collections)[i];
        if (!this.notifications[this.settingsService.collections[collectionKey]]) this.notifications[this.settingsService.collections[collectionKey]] = [];
      }
      if (!this.notifications['notifications']) this.notifications['notifications'] = [];
    }

    refreshFriendsAndGroups() {
      this.resetGraph();
      return this.getGroups()
      .then((results) => {
        return this.getGroups(null, 'file');
      })
      .then(() => {
        return this.getFriendRequests()
      })
      .then(() => {
        return this.getSharedSecrets()
      });
    }

    getMessagesForAllFriendsAndGroups() {
      if (this.getMessagesForAllFriendsAndGroupsCalled) return;
      this.getMessagesForAllFriendsAndGroupsCalled = true;
      const promises = [];
      for (let i=0; i < this.graph.friends.length; i++) {
        promises.push(this.getMessages([this.graph.friends[i].rid], this.settingsService.collections.CHAT, false))
      }
      for (let i=0; i < this.graph.groups.length; i++) {
        let group = this.getIdentityFromTxn(this.graph.groups[i]);
        let rid = this.generateRid(
          group.username_signature,
          group.username_signature,
          this.settingsService.collections.GROUP_CHAT
        )
        promises.push(this.getMessages([rid], this.settingsService.collections.GROUP_CHAT, false))
      }
      return Promise.all(promises);
    }

    endpointRequest(endpoint, ids=null, rids=null, post_data=null, updateLastCollectionTime=false) {
        return new Promise((resolve, reject) => {
            if (endpoint.substr(0, 1) !== '/') {
                endpoint = '/' + endpoint
            }
            let headers = new Headers();
            headers.append('Authorization', 'Bearer ' + this.settingsService.tokens[this.bulletinSecretService.keyname]);
            let options = new RequestOptions({ headers: headers, withCredentials: true });
            var promise = null;
            if (ids) {
                promise = this.ahttp.post(
                    this.settingsService.remoteSettings['graphUrl'] + endpoint + '?origin=' + encodeURIComponent(window.location.origin) + '&username_signature=' + encodeURIComponent(this.bulletinSecretService.username_signature),
                    {ids: ids, update_last_collection_time: updateLastCollectionTime},
                    options
                );
            } else if (rids) {
                promise = this.ahttp.post(
                    this.settingsService.remoteSettings['graphUrl'] + endpoint + '?origin=' + encodeURIComponent(window.location.origin) + '&username_signature=' + encodeURIComponent(this.bulletinSecretService.username_signature),
                    {rids: rids, update_last_collection_time: updateLastCollectionTime},
                    options
                );
            } else if (post_data) {
                promise = this.ahttp.post(
                    this.settingsService.remoteSettings['graphUrl'] + endpoint + '?origin=' + encodeURIComponent(window.location.origin) + '&username_signature=' + encodeURIComponent(this.bulletinSecretService.username_signature),
                    post_data,
                    options
                )
            } else {
                promise = this.ahttp.get(
                    this.settingsService.remoteSettings['graphUrl'] + endpoint + '?origin=' + encodeURIComponent(window.location.origin) + '&username_signature=' + encodeURIComponent(this.bulletinSecretService.username_signature),
                    options
                )
            }

            promise
            .pipe(timeout(30000))
            .subscribe((data) => {
                try {
                    var info = data.json();
                    this.graph.rid = info.rid;
                    this.graph.username_signature = info.username_signature;
                    this.graph.registered = info.registered;
                    this.graph.pending_registration = info.pending_registration;
                    return resolve(info);
                } catch(err) {
                  console.log(err)
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
                return resolve(data);
            }).catch((err) => {
                this.getGraphError = true;
                reject(null);
            });
        })
    }

    addNotification(item, collection) {
      if (!this.notifications[collection]) this.notifications[collection] = [];
      if (Array.isArray(item)) {
        this.notifications[collection] = this.notifications[collection].concat(item)
      } else {
        this.notifications[collection].push(item)
      }
      if (!this.notifications['notifications']) this.notifications['notifications'] = [];
      if (Array.isArray(item)) {
        this.notifications['notifications'] = this.notifications['notifications'].concat(item)
      } else {
        this.notifications['notifications'].push(item)
      }
      this.events.publish('notification');
    }

    getNotifications() {
      return this.notifications;
    }

    getSentFriendRequests() {
        return new Promise((resolve, reject) => {
            this.endpointRequest(
              'get-graph-sent-friend-requests',
              null,
              [this.generateRid(
                this.bulletinSecretService.identity.username_signature,
                this.bulletinSecretService.identity.username_signature
              )]
            )
            .then((data: any) => {
                this.graph.sent_friend_requests = this.parseSentFriendRequests(data.sent_friend_requests);
                this.getSentFriendRequestsError = false;
                return resolve();
            }).catch((err) => {
                this.getSentFriendRequestsError = true;
                reject(null);
            });
        });
    }

    getFriendRequests() {
        return new Promise((resolve, reject) => {
            this.endpointRequest(
              'get-graph-collection',
              null,
              [this.generateRid(
                this.bulletinSecretService.identity.username_signature,
                this.bulletinSecretService.identity.username_signature,
                this.settingsService.collections.CONTACT
              )]
            )
            .then((data: any) => {
                this.parseFriendRequests(data.collection);
                this.getFriendRequestsError = false;
                return resolve();
            }).catch((err) => {
                this.getFriendRequestsError = true;
                reject(err);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    getFriends(ignoreCache = false): Promise<null | void> {
        if (this.graph.friends && this.graph.friends.length > 0 && !ignoreCache) {
          return new Promise((resolve, reject) => {return resolve(null)});
        }
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
            this.sortAlpha(friends, 'username')
            this.graph.friends = friends;
        });
    }

    getGroups(rid = null, collectionName = 'group', ignoreCache = false): Promise<null | void> {
        const root = !rid;
        rid = rid || this.generateRid(
          this.bulletinSecretService.identity.username_signature,
          this.bulletinSecretService.identity.username_signature,
          collectionName
        );
        if (this.graph[collectionName + 's'] && this.graph[collectionName + 's'].length > 0 && !ignoreCache) {
          return new Promise((resolve, reject) => {return resolve(null)});
        }
        return this.endpointRequest('get-graph-collection', null, rid)
        .then((data: any) => {
            return this.parseGroups(data.collection, root, collectionName + 's');
        }).then((groups):any => {
            this.getGroupsRequestsError = false;
            return groups;
        });
    }

    getMail(rid, collection=this.settingsService.collections.MAIL) {
        //get messages for a specific friend
        return new Promise((resolve, reject) => {
          this.endpointRequest('get-graph-collection', null, rid)
          .then((data: any) => {
              return this.parseMail(data.collection, 'new_mail_counts', 'new_mail_count', undefined, collection, 'last_mail_height')
          })
          .then((mail: any) => {
              this.graph.mail = this.graph.mail.concat(mail);
              this.graph.mail = this.toDistinct(this.graph.mail, 'id')
              this.sortInt(this.graph.mail, 'time')
              this.getMailError = false;
              return resolve(mail);
          }).catch((err) => {
              this.getMailError = true;
              reject(err);
          });
      });
    }

    getSentMail(rid) {
        //get messages for a specific friend
        return new Promise((resolve, reject) => {
          this.endpointRequest('get-graph-collection', null, [rid])
          .then((data: any) => {
              return this.parseMail(data.collection, 'new_sent_mail_counts', 'new_sent_mail_count', undefined, this.settingsService.collections.MAIL, 'last_sent_mail_height')
          })
          .then((mail: any) => {
              this.graph.mail = mail;
              this.sortInt(this.graph.mail, 'time')
              this.getMailError = false;
              return resolve(mail);
          }).catch((err) => {
              this.getMailError = true;
              reject(err);
          });
      });
    }

    prepareMailItems(label) {
      return this.graph.mail.filter((item) => {
        if (label === 'Sent' && item.public_key === this.bulletinSecretService.identity.public_key) return true;
        if (label === 'Inbox' && item.public_key !== this.bulletinSecretService.identity.public_key) return true;
      }).map((item) => {
        return this.prepareMailItem(item, label)
      })
    }

    prepareMailItem(item, label) {
      const group = this.getIdentityFromTxn(
        this.groups_indexed[item.requested_rid],
        this.settingsService.collections.GROUP
      );
      const friend = this.getIdentityFromTxn(
        this.friends_indexed[item.rid],
        this.settingsService.collections.CONTACT
      );
      const identity = group || friend;
      const collection = group ? this.settingsService.collections.GROUP_MAIL : this.settingsService.collections.MAIL
      let sender;
      if (item.relationship[collection].sender) {
        sender = item.relationship[collection].sender;
      } else if (item.public_key === this.bulletinSecretService.identity.public_key && label === 'Inbox') {
        sender = this.bulletinSecretService.identity;
      } else {
        sender = {
          username: identity.username,
          username_signature: identity.username_signature,
          public_key: identity.public_key
        }
      }
      const datetime = new Date(parseInt(item.time)*1000);
      return {
        sender: sender,
        group: group || null,
        subject: item.relationship[collection].subject,
        body: item.relationship[collection].body,
        datetime: datetime.toLocaleDateString() + ' ' + datetime.toLocaleTimeString(),
        id: item.id,
        thread: item.relationship.thread,
        message_type: item.relationship[collection].message_type,
        event_datetime: item.relationship[collection].event_datetime,
        skylink: item.relationship[collection].skylink,
        filename: item.relationship[collection].filename,
        rid: item.rid
      }
    }

    getMessages(rid, collection=this.settingsService.collections.CHAT, updateLastCollectionTime=false) {
        if(typeof rid === 'string') rid = [rid];
        //get messages for a specific friend

        return this.endpointRequest('get-graph-collection', null, rid, null, updateLastCollectionTime)
        .then((data: any) => {
            return this.parseMessages(data.collection, data.new_count, 'new_messages_count', rid, collection, 'last_message_height')
        })
        .then((chats: any) => {
            return new Promise((resolve, reject) => {
                this.graph.messages[rid] = chats;
                this.getMessagesError = false;
                return resolve(chats);
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
                return resolve(newChats);
            }).catch((err) => {
                this.getNewMessagesError = true;
                reject(err);
            });
        });
    }

    getSentMessages() {
        //get sent messages
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-sent-messages', null, [])
            .then((data: any) => {
                return this.parseMessages(data.messages, 'sent_messages_counts', 'sent_messages_count', null, this.settingsService.collections.CHAT, 'last_message_height')
            })
            .then((chats: any) => {
                // if (!this.graph.messages) {
                //     this.graph.messages = {};
                // }
                // if (chats[rid]){
                //     this.graph.messages[rid] = chats[rid];
                //     this.graph.messages[rid].sort(function (a, b) {
                //         if (parseInt(a.time) > parseInt(b.time))
                //         return 1
                //         if ( parseInt(a.time) < parseInt(b.time))
                //         return -1
                //         return 0
                //     });
                // }
                // this.getMessagesError = false;
                // return resolve(chats[rid]);
            }).catch((err) => {
                this.getMessagesError = true;
                reject(err);
            });
        });
    }

    getGroupMessages(key, requested_rid, rid) {
        //get messages for a specific friend
        var choice_rid = requested_rid || rid;
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-collection', null, [choice_rid])
            .then((data: any) => {
                return this.parseGroupMessages(key, data.messages, 'new_group_messages_counts', 'new_group_messages_count', rid, [this.settingsService.collections.GROUP_CHAT, this.settingsService.collections.GROUP_CHAT_FILE_NAME], 'last_group_message_height')
            })
            .then((chats: any) => {
                if (!this.graph.messages) {
                    this.graph.messages = {};
                }
                if (choice_rid && chats[choice_rid]){
                    this.graph.messages[choice_rid] = chats[choice_rid];
                    this.sortInt(this.graph.messages[choice_rid], 'time', true)
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
                return resolve(newChats);
            }).catch((err) => {
                this.getNewMessagesError = true;
                reject(err);
            });
        });
    }

    getSignIns(rids) {
      return this.endpointRequest('get-graph-collection', undefined, rids)
      .then((data: any) => {
          this.graph.signins = this.parseMessages(
            data.collection,
            'new_sign_ins_counts',
            'new_sign_ins_count',
            rids,
            this.settingsService.collections.WEB_CHALLENGE_RESPONSE,
            'last_sign_in_height'
          );
          this.getSignInsError = false;
      });
    }

    getNewSignIns() {
        //get the latest sign ins for a specific friend
        return new Promise((resolve, reject) => {
            this.endpointRequest('get-graph-new-messages')
            .then((data: any) => {
                return this.parseNewMessages(
                  data.new_messages,
                  'new_sign_ins_counts',
                  'new_sign_ins_count',
                  'last_sign_in_height'
                );
            })
            .then((newSignIns: any) => {
                this.graph.newSignIns = newSignIns;
                this.getNewSignInsError = false;
                return resolve(newSignIns);
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
                this.graph.reacts = this.parseMessages(
                  data.reacts,
                  'new_reacts_counts',
                  'new_reacts_count',
                  rid,
                  this.settingsService.collections.CHAT,
                  'last_react_height'
                );
                this.getReactsError = false;
                return resolve(data.reacts);
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
                this.graph.comments = this.parseMessages(data.reacts, 'new_comments_counts', 'new_comments_count', rid, this.settingsService.collections.CHAT, 'last_comment_height');
                this.getCommentsError = false;
                return resolve(data.comments);
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
                this.graph.commentReacts = this.parseMessages(data.reacts, 'new_comment_reacts_counts', 'new_comment_reacts_count', rid, this.settingsService.collections.CHAT, 'last_comment_react_height');
                this.getcommentReactsError = false;
                return resolve(data.comment_reacts);
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
                this.graph.commentReplies = this.parseMessages(data.reacts, 'new_comment_comments_counts', 'new_comment_comments_count', rid, this.settingsService.collections.CHAT, 'last_comment_comment_height');
                this.getcommentRepliesError = false;
                return resolve(data.comments);
            }).catch(() => {
                this.getcommentRepliesError = true;
                reject(null);
            });
        });
    }

    getCalendar(rids) {
        return this.endpointRequest('get-graph-collection', undefined, rids)
        .then((data: any) => {
            this.graph.calendar = this.parseCalendar(data.collection);
            this.getCalendarError = false;
        });
    }

    getMyPages(rids) {
        return this.endpointRequest('get-graph-collection', undefined, rids)
        .then((data: any) => {
            this.graph.mypages = this.parseMyPages(data.collection);
            this.getMyPagesError = false;
        });
    }

    parseSentFriendRequests(sent_friend_requests) {
        var sent_friend_requestsObj = {};
        let sent_friend_request: any;
        if (!this.graph.friends) this.graph.friends = [];
        for(var i=0; i < sent_friend_requests.length; i++) {
            sent_friend_request = sent_friend_requests[i];
            if (!this.keys[sent_friend_request.rid]) {
                this.keys[sent_friend_request.rid] = {
                    dh_private_keys: [],
                    dh_public_keys: []
                };
            }
            try {
                var decrypted = this.publicDecrypt(sent_friend_request['relationship']);
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
                delete sent_friend_requestsObj[sent_friend_request.rid]
                if (this.keys[sent_friend_request.rid].dh_public_keys.indexOf(sent_friend_request.dh_public_key) === -1 && sent_friend_request.dh_public_key) {
                    this.keys[sent_friend_request.rid].dh_public_keys.push(sent_friend_request.dh_public_key);
                }
            }
        }
        for(var j=0; j < sent_friend_requests.length; j++) {
            sent_friend_request = sent_friend_requests[j];
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
        let friend_requestsObj = {};
        var sent_friend_requestsObj = {};
        if (!this.graph.friends) this.graph.friends = [];
        for(var i=0; i<friend_requests.length; i++) {
            var friend_request = friend_requests[i];
            if (!this.keys[friend_request.rid]) {
                this.keys[friend_request.rid] = {
                    dh_private_keys: [],
                    dh_public_keys: []
                };
            }
            try {
                var decrypted = this.publicDecrypt(friend_request.relationship);
                var relationship = JSON.parse(decrypted);
                if (!relationship[this.settingsService.collections.CONTACT]) continue;
                friend_request.relationship = relationship;
                if (sent_friend_requestsObj[friend_request.rid]) {
                  delete friend_requestsObj[friend_request.rid]
                  delete sent_friend_requestsObj[friend_request.rid]
                  this.graph.friends.push(friend_request);
                  this.friends_indexed[friend_request.rid] = friend_request;
                } else {
                  friend_requestsObj[friend_request.rid] = friend_request;
                }
                if (this.keys[friend_request.rid].dh_private_keys.indexOf(relationship.dh_private_key) === -1 && relationship.dh_private_key) {
                    this.keys[friend_request.rid].dh_private_keys.push(relationship.dh_private_key);
                }
            } catch(err) {
                if (friend_requestsObj[friend_request.rid]) {
                  this.graph.friends.push(friend_requestsObj[friend_request.rid]);
                  this.friends_indexed[friend_request.rid] = friend_requestsObj[friend_request.rid];
                  delete friend_requestsObj[friend_request.rid]
                  delete sent_friend_requestsObj[friend_request.rid]
                } else {
                  sent_friend_requestsObj[friend_request.rid] = friend_request;
                }
                if (this.keys[friend_request.rid].dh_public_keys.indexOf(friend_request.dh_public_key) === -1 && friend_request.dh_public_key) {
                    this.keys[friend_request.rid].dh_public_keys.push(friend_request.dh_public_key);
                }
            }
        }

        var arr_sent_friend_requests = [];
        for(let i in sent_friend_requestsObj) {
            arr_sent_friend_requests.push(sent_friend_requestsObj[i].rid);
        }

        this.sent_friend_requests_indexed = {};
        const sent_friend_requests = [];
        let sent_friend_requests_diff = new Set(arr_sent_friend_requests);
        if(arr_sent_friend_requests.length > 0) {
            let arr_sent_friend_request_keys = Array.from(sent_friend_requests_diff.keys());
            for(i=0; i<arr_sent_friend_request_keys.length; i++) {
                sent_friend_requests.push(sent_friend_requestsObj[arr_sent_friend_request_keys[i]]);
                this.sent_friend_requests_indexed[arr_sent_friend_request_keys[i]] = sent_friend_requestsObj[arr_sent_friend_request_keys[i]];
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

        this.graph.friend_requests = friend_requests;
        this.graph.sent_friend_requests = sent_friend_requests;
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
                    bypassDecrypt = true;
                } else {
                    decrypted = this.decrypt(friend.relationship);
                }
                try {
                    var relationship;
                    if (!bypassDecrypt) {
                        relationship = JSON.parse(decrypted);
                        friend['relationship'] = relationship;
                    }
                    friendsObj[friend.rid] = {friend: friend};
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
                delete friendsObj[sent_friend_request.rid];
                if (secrets_rids.indexOf(sent_friend_request.rid) >= 0) {
                    if (!friendsObj[sent_friend_request.rid]) friendsObj[sent_friend_request.rid] = {};
                    friendsObj[sent_friend_request.rid].sent_friend_request = sent_friend_request;
                }
            }

            for (i=0; i < this.graph.friend_requests.length; i++) {
                var friend_request = this.graph.friend_requests[i];
                delete friendsObj[friend_request.rid];
                if (secrets_rids.indexOf(friend_request.rid) >= 0) {
                    if (!friendsObj[friend_request.rid]) friendsObj[friend_request.rid] = {};
                    friendsObj[friend_request.rid] = friend_request;
                }
            }

            var arr_friends = Object.keys(friendsObj);

            friends = []
            let friends_diff = new Set(arr_friends);
            if(arr_friends.length > 0) {
                let arr_friends_keys = Array.from(friends_diff.keys())
                for(i=0; i<arr_friends_keys.length; i++) {
                    friends.push(friendsObj[arr_friends_keys[i]].friend_request || friendsObj[arr_friends_keys[i]].friend);
                }
            }

            return resolve(friends);
        });
    }

    parseGroups(groups, root=true, collectionName = 'group') {
        // we must call getSentFriendRequests and getFriendRequests before getting here
        // because we need this.keys to be populated with the dh_public_keys and dh_private_keys from the requests
        // though friends really should be cached
        // should be key: shared-secret_rid|pub_key[:26]priv_key[:26], value: {shared_secret: <shared_secret>, friend: [transaction.dh_public_key, transaction.dh_private_key]}
        return new Promise((resolve, reject) => {
            //start "just do dedup yada server because yada server adds itself to the friends array automatically straight from the api"
            let promises = [];
            for(var i=0; i < groups.length; i++) {
                var group = groups[i];
                if (!this.keys[group.rid]) {
                    this.keys[group.rid] = {
                        dh_private_keys: [],
                        dh_public_keys: []
                    };
                }
                var decrypted;
                var bypassDecrypt = false;
                let failed = false;
                try {
                    if (typeof group.relationship == 'object') {
                        bypassDecrypt = true;
                    } else {
                        decrypted = this.decrypt(group.relationship);
                    }
                    var relationship;
                    if (!bypassDecrypt) {
                        relationship = JSON.parse(decrypted);
                        if (!relationship[this.settingsService.collections.GROUP]) continue;
                        if (relationship[this.settingsService.collections.GROUP].collection !== this.settingsService.collections.GROUP) continue;
                        group['relationship'] = relationship;
                    }
                } catch(err) {
                    console.log(err);
                    failed = true
                }
                if (failed && this.groups_indexed[group.requester_rid]) {
                    try {
                        let parentGroup = this.getIdentityFromTxn(
                          this.groups_indexed[group.requester_rid],
                          this.settingsService.collections.GROUP
                        )
                        if (parentGroup.public_key !== group.public_key) continue;
                        if (typeof group.relationship == 'object') {
                            bypassDecrypt = true;
                        } else {
                            decrypted = this.shared_decrypt(
                              parentGroup.username_signature,
                              group.relationship
                            );
                        }
                        var relationship;
                        if (!bypassDecrypt) {
                            relationship = JSON.parse(decrypted);
                            if (!relationship[this.settingsService.collections.GROUP]) continue;
                            if (!relationship[this.settingsService.collections.GROUP].parent) continue
                            if (relationship[this.settingsService.collections.GROUP].collection !== this.settingsService.collections.GROUP) continue;
                            group['relationship'] = relationship;
                        }
                    } catch(err) {
                        console.log(err);
                        continue
                    }
                } else if (failed && !this.groups_indexed[group.requester_rid]) {
                    continue
                }

                if(!this.groups_indexed[group.requested_rid]) {
                    this.graph[collectionName].push(group);
                }

                this.groups_indexed[group.requested_rid] = group;
                let group_username_signature = relationship[this.settingsService.collections.GROUP].username_signature
                this.groups_indexed[this.generateRid(
                    group_username_signature,
                    group_username_signature,
                    this.settingsService.collections.GROUP_CHAT
                )] = group;

                this.groups_indexed[this.generateRid(
                    group_username_signature,
                    group_username_signature,
                    this.settingsService.collections.GROUP_MAIL
                )] = group;

                this.groups_indexed[this.generateRid(
                    group_username_signature,
                    group_username_signature,
                    this.settingsService.collections.CALENDAR
                )] = group;

                this.groups_indexed[this.generateRid(
                    group_username_signature,
                    group_username_signature,
                    this.settingsService.collections.GROUP_CALENDAR
                )] = group;

                this.groups_indexed[this.generateRid(
                    group_username_signature,
                    group_username_signature,
                    group_username_signature
                )] = group;

                try {
                    if (!relationship.parent) {
                        promises.push(this.getGroups(
                            this.generateRid(
                                group_username_signature,
                                group_username_signature,
                                group_username_signature,
                            ),
                            'group',
                            true
                        ))
                    }
                } catch(err) {
                    console.log(err);
                }

            }

            var arr_friends = Object.keys(this.groups_indexed);
            groups = []
            let friends_diff = new Set(arr_friends);
            if(arr_friends.length > 0) {
              let used_username_signatures = [];
                let arr_friends_keys = Array.from(friends_diff.keys())
                for(i=0; i<arr_friends_keys.length; i++) {
                    if(used_username_signatures.indexOf(this.groups_indexed[arr_friends_keys[i]].relationship[this.settingsService.collections.GROUP].username_signature) > -1) {
                      continue;
                    } else {
                      groups.push(this.groups_indexed[arr_friends_keys[i]]);
                      used_username_signatures.push(this.groups_indexed[arr_friends_keys[i]].relationship[this.settingsService.collections.GROUP].username_signature);
                    }
                }
            }

            return Promise.all(promises)
            .then((results) => {
              return resolve(groups);
            });
        });
    }

    parseMail(messages, graphCounts, graphCount, rid=null, messageType=null, messageHeightType=null) {
        this[graphCount] = 0;
        return new Promise((resolve, reject) => {
            var chats = [];
            dance:
            for(var i=0; i<messages.length; i++) {
                var message = messages[i];
                if(!rid && chats[message.rid]) continue;
                if (!message.rid) continue;
                if (message.dh_public_key) continue;
                //hopefully we've prepared the stored_secrets option before getting here
                //by calling getSentFriendRequests and getFriendRequests
                if (this.groups_indexed[message.requested_rid]) {

                  try {
                      let identity = this.getIdentityFromTxn(this.groups_indexed[message.requested_rid], this.settingsService.collections.GROUP);
                      var decrypted = this.shared_decrypt(identity.username_signature, message.relationship);
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
                      messages[message.requested_rid] = message;
                      try {
                          message.relationship[messageType] = JSON.parse(Base64.decode(messageJson[messageType]));
                          message.relationship.isInvite = true;
                      }
                      catch(err) {
                          //not an invite, do nothing
                      }
                      chats.push(message);
                  }
                  continue dance;
                } else {
                  if (!this.stored_secrets[message.rid]) continue;
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
                          messages[message.rid] = message;
                          try {
                              message.relationship[messageType] = JSON.parse(Base64.decode(messageJson[messageType]));
                              message.relationship.isInvite = true;
                          }
                          catch(err) {
                              //not an invite, do nothing
                          }
                          chats.push(message);
                      }
                      continue dance;
                  }
                }
            }
            return resolve(chats);
        });
    }

    parseMessages(messages, newCount, graphCount, rid=null, messageType=null, messageHeightType=null) {
        this[graphCount] = 0;
        return new Promise((resolve, reject) => {
            var chats = [];
            dance:
            for(var i=0; i<messages.length; i++) {
                var message = messages[i];
                if(rid && message.rid !== rid && rid.indexOf(message.rid) === -1 && rid.indexOf(message.requested_rid) === -1) continue;
                if (!message.rid && !message.requested_rid) continue;
                if (message.dh_public_key) continue;
                if (this.groups_indexed[message.requested_rid]) {
                  let group = this.getIdentityFromTxn(
                    this.groups_indexed[message.requested_rid],
                    this.settingsService.collections.GROUP
                  );
                  if (i === 0) this.counts[group.username_signature] = newCount;
                  try {
                      this.counts[group.username_signature] = typeof this.counts[group.username_signature] === 'number' && this.counts[group.username_signature] > 0 ? this.counts[group.username_signature] : newCount;
                      var decrypted = this.shared_decrypt(group.username_signature, message.relationship);
                  }
                  catch(error) {
                      this.counts[group.username_signature]--;
                      continue
                  }
                  try {
                      var messageJson = JSON.parse(decrypted);
                  } catch(err) {
                      this.counts[group.username_signature]--;
                      continue;
                  }
                  if(messageJson[messageType]) {
                      message.relationship = messageJson;
                      messages[message.requested_rid] = message;
                      try {
                          message.relationship[messageType] = JSON.parse(Base64.decode(messageJson[messageType]));
                          message.relationship.isInvite = true;
                      }
                      catch(err) {
                          //not an invite, do nothing
                      }
                      chats.push(message);
                  }
                  continue dance;

                } else {

                  const friend = this.getIdentityFromMessageTransaction(message);
                  if (i === 0) this.counts[friend.username_signature] = newCount;
                  if (!this.stored_secrets[message.rid]) continue;
                  var shared_secret = this.stored_secrets[message.rid][j];
                  //hopefully we've prepared the stored_secrets option before getting here
                  //by calling getSentFriendRequests and getFriendRequests
                  for(var j=0; j<this.stored_secrets[message.rid].length; j++) {
                      var shared_secret = this.stored_secrets[message.rid][j];
                      try {
                          this.counts[friend.username_signature] = typeof this.counts[friend.username_signature] === 'number' && this.counts[friend.username_signature] > 0 ? this.counts[friend.username_signature] : newCount;
                          var decrypted = this.shared_decrypt(shared_secret.shared_secret, message.relationship);
                      }
                      catch(error) {
                          friend && this.counts[friend.username_signature]--;
                          continue
                      }
                      try {
                          var messageJson = JSON.parse(decrypted);
                      } catch(err) {
                          friend && this.counts[friend.username_signature]--;
                          continue;
                      }
                      if(messageJson[messageType]) {
                          message.relationship = messageJson;
                          message.shared_secret = shared_secret.shared_secret
                          message.dh_public_key = shared_secret.dh_public_key
                          message.dh_private_key = shared_secret.dh_private_key
                          messages[message.rid] = message;
                          try {
                              message.relationship[messageType] = JSON.parse(Base64.decode(messageJson[messageType]));
                              message.relationship.isInvite = true;
                          }
                          catch(err) {
                              //not an invite, do nothing
                          }
                          chats.push(message);
                      }
                      continue dance;
                  }
                }
            }
            return resolve(chats);
        });
    }

    parseNewMessages(messages, graphCounts, graphCount, heightType) {
        this[graphCount] = 0;
        this[graphCounts] = {}
        var public_key = this.bulletinSecretService.key.getPublicKeyBuffer().toString('hex');
        return new Promise((resolve, reject) => {
            var new_messages = [];
            for(var i=0; i<messages.length; i++) {
                var message = messages[i];
                if (message.public_key != public_key) {
                    new_messages.push(message);
                }
            }
            return resolve(new_messages);
        });
    }

    parseGroupMessages(key, messages, graphCounts, graphCount, rid=null, messageType=null, messageHeightType=null) {
        this[graphCount] = 0;
        return new Promise((resolve, reject) => {
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
                if(messageJson[messageType[0]] || messageJson[messageType[1]]) {
                    message.relationship = messageJson;
                    messages[group_message_rid] = message;
                    if (!chats[group_message_rid]) {
                        chats[group_message_rid] = [];
                    }
                    chats[group_message_rid].push(message);
                }
            }
            return resolve(chats);
        });
    }

    parseCalendar(events) {
        let eventsOut = []
        for(var i=0; i<events.length; i++) {
            //hopefully we've prepared the stored_secrets option before getting here
            //by calling getSentFriendRequests and getFriendRequests
            const event = events[i];
            let decrypted;
            try {
                const group = this.getIdentityFromTxn(
                  this.groups_indexed[event.requested_rid],
                  this.settingsService.collections.GROUP
                );
                if(group) {
                  decrypted = this.shared_decrypt(group.username_signature, event.relationship);
                } else if (this.friends_indexed[event.rid]) {
                  if (!this.stored_secrets[event.rid]) continue;
                  var shared_secret = this.stored_secrets[event.rid][0].shared_secret;
                  decrypted = this.shared_decrypt(shared_secret, event.relationship);
                } else {
                  decrypted = this.decrypt(event.relationship);
                }
            }
            catch(error) {
                continue
            }
            try {
                var messageJson = JSON.parse(decrypted);
            } catch(err) {
                continue;
            }
            if(messageJson[this.settingsService.collections.CALENDAR]) {
                event.relationship = messageJson;
                event.relationship[this.settingsService.collections.CALENDAR].event_datetime = new Date(event.relationship[this.settingsService.collections.CALENDAR].event_datetime)
                eventsOut.push(event)
            } else if(messageJson[this.settingsService.collections.GROUP_CALENDAR]) {
                event.relationship = messageJson;
                event.relationship[this.settingsService.collections.GROUP_CALENDAR].event_datetime = new Date(event.relationship[this.settingsService.collections.GROUP_CALENDAR].event_datetime)
                eventsOut.push(event)
            } else if(messageJson.event) {
                event.relationship = messageJson;
                event.relationship.event.event_datetime = new Date(event.relationship.event.event_datetime)
                eventsOut.push(event)
            }
        }
        return eventsOut
    }

    parseMyPages(mypages) {
        let mypagesOut = []
        const myRids = this.generateRids(this.bulletinSecretService.identity)
        for(var i=0; i<mypages.length; i++) {
            //hopefully we've prepared the stored_secrets option before getting here
            //by calling getSentFriendRequests and getFriendRequests
            const mypage = mypages[i];
            let decrypted;

            try {
                decrypted = this.decrypt(mypage.relationship);
            }
            catch(error) {
                continue
            }
            try {
                var messageJson = JSON.parse(decrypted);
            } catch(err) {
                continue;
            }
            if(messageJson[this.settingsService.collections.WEB_PAGE]) {
                mypage.relationship = messageJson;
                mypagesOut.push(mypage)
            }
        }
        return mypagesOut
    }

    getSharedSecrets() {
        return new Promise((resolve, reject) => {
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
            return resolve();
        });
    }

    getSharedSecretForRid(rid) {
        return new Promise((resolve, reject) => {
            this.getSharedSecrets()
            .then(() => {
                if (this.stored_secrets[rid] && this.stored_secrets[rid].length > 0) {
                    return resolve(this.stored_secrets[rid][0]);
                } else {
                    reject('no shared secret found for rid: ' + rid);
                }
            });
        });
    }

    createGroup(groupname, parentGroup = null, extraData = {}, collectionName = 'group'): Promise<null | void> {
        const parentIdentity = this.getIdentityFromTxn(parentGroup)
        if (!groupname) return new Promise((resolve, reject) => {reject('username missing')});
        if (parentIdentity && parentIdentity.public_key !== this.bulletinSecretService.identity.public_key) return new Promise((resolve, reject) => {reject('you cannot create a subgroup unless you are the owner of the group.')});
        if (parentIdentity && parentIdentity.username === groupname) return new Promise((resolve, reject) => {reject('you cannot create a subgroup with the same name as the parent group.')});
        let username_signature = foobar.base64.fromByteArray(this.bulletinSecretService.key.sign(foobar.bitcoin.crypto.sha256(groupname)).toDER());
        let relationship: any = {
            username: groupname,
            username_signature: username_signature,
            public_key: this.bulletinSecretService.identity.public_key,
            collection: this.settingsService.collections.GROUP
        }
        let info = {...extraData};
        info[collectionName] = relationship
        if (parentIdentity) {
            relationship.parent = {
                username: parentIdentity.username,
                username_signature: parentIdentity.username_signature,
                public_key: parentIdentity.public_key,
                collection: this.settingsService.collections.GROUP
            }
        }
        return this.transactionService.generateTransaction({
            relationship: info,
            to: this.bulletinSecretService.publicKeyToAddress(this.bulletinSecretService.identity.public_key),
            requester_rid: this.generateRid(
                parentIdentity ? parentIdentity.username_signature : this.bulletinSecretService.identity.username_signature,
                parentIdentity ? parentIdentity.username_signature : this.bulletinSecretService.identity.username_signature,
                parentIdentity ? parentIdentity.username_signature : collectionName
            ),
            requested_rid: this.generateRid(
                username_signature,
                username_signature,
                parentIdentity ? parentIdentity.username_signature : collectionName
            ),
            rid: this.generateRid(
                this.bulletinSecretService.identity.username_signature,
                username_signature
            ),
            group: true
        }).then((txn) => {
            return this.transactionService.sendTransaction();
        }).then(() => {
          return this.getGroups(null, relationship.collection, true)
        }).then(() => {
          return new Promise<any>((resolve, reject) => {
            return resolve({
              username: groupname,
              username_signature: username_signature,
              public_key: this.bulletinSecretService.identity.public_key,
            })
          })
        });
    }

    checkInvite(identity) {
        return this.endpointRequest('check-invite', null, null, {'identity': identity})
    }

    getUserType(identifier) {
        return this.endpointRequest('get-user-type', null, null, {'identifier': identifier})
    }

    generateRecovery(username) {
        return new Promise((resolve, reject) => {
            return this.geolocation.getCurrentPosition().then((resp) => {
                let result = resp.coords.longitude + (resp.coords.latitude + username);
                let target = 0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
                let rid;
                let password;
                for(var i=0; i === i; i++) {
                    result = forge.sha256.create().update(result).digest().toHex();
                    if (parseInt(result, 16) < target && password) {
                        result = forge.sha256.create().update(result).digest().toHex();
                        rid = result
                        break
                    }
                    if (parseInt(result, 16) < target && !password) {
                        result = forge.sha256.create().update(result).digest().toHex();
                        password = result
                    }
                }
                return resolve([rid, password, username]);
            }).catch((error) => {
                console.log('Error getting location', error);
            });
        })
    }

    createRecovery(username) {
        this.generateRecovery(username)
        .then((args) => {
            let rid = args[0];
            let shared_secret = args[1];
            return new Promise((resolve, reject) => {
                if (!username) return reject('username missing');

                return this.storage.get(this.bulletinSecretService.keyname).then((wif) => {
                    let key = foobar.bitcoin.ECPair.fromWIF(wif);
                    let pubKey = key.getPublicKeyBuffer().toString('hex');
                    let address = key.getAddress();
                    let username_signature = foobar.base64.fromByteArray(key.sign(foobar.bitcoin.crypto.sha256(username)).toDER());
                    return resolve({
                        public_key: pubKey,
                        username_signature: username_signature,
                        username: username,
                        wif: wif,
                        rid: rid,
                        shared_key: shared_secret
                    });
                });
            })
        })
        .then((info: any) => {
            return this.transactionService.generateTransaction({
                relationship: {
                    username_signature: info.username_signature,
                    public_key: info.public_key,
                    username: info.username,
                    identity: this.bulletinSecretService.identity,
                    wif: info.wif
                },
                to: this.bulletinSecretService.publicKeyToAddress(info.public_key),
                rid: info.rid,
                shared_secret: info.shared_key
            })

        }).then((txn) => {
            return this.transactionService.sendTransaction();
        })
    }

    generateRid(username_signature1, username_signature2, extra='') {
      const username_signatures = [username_signature1, username_signature2].sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
      });
      return forge.sha256.create().update(username_signatures[0] + username_signatures[1] + extra).digest().toHex();
    }

    addFriendFromSkylink(skylink) {
      return this.identityFromSkylink(skylink)
      .then((identity: any) => {
        return this.addFriend(identity);
      })
    }

    addFriend(identity, rid='', requester_rid='', requested_rid='') {
      rid = rid || this.generateRid(
        this.bulletinSecretService.identity.username_signature,
        identity.username_signature
      );
      requester_rid = requester_rid || this.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        this.settingsService.collections.CONTACT
      );
      requested_rid = requested_rid || this.generateRid(
        identity.username_signature,
        identity.username_signature,
        this.settingsService.collections.CONTACT
      );
      if (requester_rid && requested_rid) {
          // get rid from bulletin secrets
      } else {
          requester_rid = '';
          requested_rid = '';
      }
      var raw_dh_private_key = foobar.bitcoin.crypto.sha256(this.bulletinSecretService.key.toWIF() + identity.username_signature);
      var raw_dh_public_key = X25519.getPublic(raw_dh_private_key);
      var dh_private_key = this.toHex(raw_dh_private_key);
      var dh_public_key = this.toHex(raw_dh_public_key);
      let myIdentity = this.bulletinSecretService.cloneIdentity();
      myIdentity.collection = this.settingsService.collections.CONTACT;
      let info = {
          dh_private_key: dh_private_key
      }
      info[this.settingsService.collections.CONTACT] = myIdentity;
      return this.transactionService.generateTransaction({
          relationship: info,
          dh_public_key: dh_public_key,
          requested_rid: requested_rid,
          requester_rid: requester_rid,
          rid: rid,
          to: this.bulletinSecretService.publicKeyToAddress(identity.public_key),
          recipient_identity: identity
      }).then((hash) => {
          return this.transactionService.sendTransaction();
      }).then(() => {
        return this.getFriends()
      });
    }

    addGroupFromSkylink(skylink) {
      return this.identityFromSkylink(skylink)
      .then((identity: any) => {
        return this.addGroup(identity);
      })
    }

    addGroup(identity, rid='', requester_rid='', requested_rid='', refresh=true) {
      identity.collection = identity.parent ? identity.parent.username_signature : identity.collection || this.settingsService.collections.GROUP
      rid = rid || this.generateRid(
        this.bulletinSecretService.identity.username_signature,
        identity.username_signature
      );
      requester_rid = requester_rid || this.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        identity.collection
      );
      requested_rid = requested_rid || this.generateRid(
        identity.parent ? identity.collection : identity.username_signature,
        identity.parent ? identity.collection : identity.username_signature,
        identity.collection
      );
      if (requester_rid && requested_rid) {
        // get rid from bulletin secrets
      } else {
        requester_rid = '';
        requested_rid = '';
      }
      if (this.groups_indexed[requested_rid]) {
        return new Promise((resolve, reject) => {
          return resolve(identity)
        });
      }
      let info = {};
      info[this.settingsService.collections.GROUP] = identity;
      return this.transactionService.generateTransaction({
        rid: rid,
        relationship: info,
        requested_rid: requested_rid,
        requester_rid: requester_rid,
        to: this.bulletinSecretService.publicKeyToAddress(identity.public_key)
      })
      .then((txn) => {
        return this.transactionService.sendTransaction(txn);
      }).then(() => {
        return refresh ? this.getGroups(null, identity.collection, true) : null
      }).then(() => {
        return new Promise((resolve, reject) => {
          return resolve(identity)
        })
      });
    }

    publicDecrypt(message) {
      const decrypted = decrypt(this.bulletinSecretService.key.d.toHex(), Buffer.from(this.hexToByteArray(message))).toString();
      return decrypted
    }

    generateRids(identity) {
      const rid = this.generateRid(
        identity.username_signature,
        this.bulletinSecretService.identity.username_signature
      )

      const requested_rid = this.generateRid(
        identity.username_signature,
        identity.username_signature,
        identity.collection
      )

      const requester_rid = this.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        identity.collection
      )

      return {
        rid: rid,
        requested_rid: requested_rid,
        requester_rid: requester_rid
      }
    }

    isMe(identity:any) {
      if (!identity) return false;
      return identity.username_signature === this.bulletinSecretService.identity.username_signature
    }

    isAdded(identity) {
      if (!identity) return false;
      const rids = this.generateRids(identity);
      const addedToGroups = this.isChild(identity) ?
        !!(this.groups_indexed[rids.rid] || this.groups_indexed[rids.requested_rid] || this.groups_indexed[this.generateRid(
          identity.parent ? identity.parent.username_signature : identity.username_signature,
          identity.parent ? identity.parent.username_signature : identity.username_signature,
          identity.parent.username_signature
        )])
      :
        !!(this.groups_indexed[rids.rid] || this.groups_indexed[rids.requested_rid]);


      const friend_requested_rid = this.generateRid(
        identity.username_signature,
        identity.username_signature
      );
      const friend_rid = this.generateRid(
        identity.username_signature,
        this.bulletinSecretService.identity.username_signature
      );
      const addedToFriends = !!(this.friends_indexed[friend_rid] || this.friends_indexed[friend_requested_rid]);

      return !!(addedToFriends || addedToGroups)
    }

    isRequested(identity) {
      if (!identity) return false;
      const friend_rid = this.generateRid(
        identity.username_signature,
        this.bulletinSecretService.identity.username_signature
      );
      return !!this.sent_friend_requests_indexed[friend_rid]
    }

    isGroup(identity) {
      if (!identity) return false;
      return identity.collection && identity.collection !== this.settingsService.collections.CONTACT
    }

    isChild(identity) {
      if (!identity) return false;
      return !!identity.parent
    }

    sortInt(list, key, reverse=false) {
      list.sort((a, b) => {
          if (parseInt(a[key]) > parseInt(b[key])) return reverse ? 1 : -1
          if ( parseInt(a[key]) < parseInt(b[key])) return reverse ? -1 : 1
          return 0
      });
    }

    sortAlpha(list, key, reverse=false) {
      list.sort((a, b) => {
        if (a[key] < b[key]) return reverse ? 1 : -1
        if (a[key] > b[key]) return  reverse ? -1 : 1
        return 0
      });
    }

    sortTxnsByUsername(list, reverse=false, collection=null) {
      list.sort((a, b) => {
        let ausername = this.getIdentityFromTxn(a, collection);
        let busername = this.getIdentityFromTxn(b, collection);
        if (ausername < busername) return reverse ? 1 : -1
        if (ausername > busername) return  reverse ? -1 : 1
        return 0
      });
    }

    toDistinct(list, key) {
      const hashMap = {};
      for(let i=0; i < list.length; i++) {
        hashMap[list[i][key]] = list[i];
      }
      const newList = []
      for(let i=0; i < Object.keys(hashMap).length; i++) {
        newList.push(hashMap[Object.keys(hashMap)[i]])
      }
      return newList;
    }

    toIdentity(identity) {
      if (!identity) return {};
      let iden: any = {
        username: identity.username,
        username_signature: identity.username_signature,
        public_key: identity.public_key
      }
      if (identity.parent) {
        iden.parent = identity.parent
      }
      if (identity.collection) {
        iden.collection = identity.collection
      }
      if (identity.skylink) {
        iden.skylink = identity.skylink;
      }
      return iden;
    }

    getIdentityFromMessageTransaction(item) {
      if(!item) return;
      let group = this.groups_indexed[item.requested_rid];
      if (group) {
        return this.getIdentityFromTxn(group, this.settingsService.collections.GROUP)
      }
      let friend = this.friends_indexed[item.rid];
      if (friend) {
        return this.getIdentityFromTxn(friend, this.settingsService.collections.CONTACT)
      }
    }

    getIdentityFromTxn(item, collection=null) {
      if(!item) return;
      let col = collection || this.getNewTxnCollection(item);
      return item.relationship[col]
    }

    getParentIdentityFromTxn(item, collection=null) {
      if(!item) return;
      let identity = this.getIdentityFromTxn(item, collection)
      return identity && identity.parent;
    }

    getNewTxnCollection(txn) {
      for (let i=0; i < Object.keys(this.settingsService.collections).length; i++) {
        const collection = this.settingsService.collections[Object.keys(this.settingsService.collections)[i]];
        const rid = this.generateRid(
          this.bulletinSecretService.identity.username_signature,
          this.bulletinSecretService.identity.username_signature,
          collection
        )
        if(
          txn.rid === rid ||
          txn.requester_rid === rid ||
          txn.requested_rid === rid
        ) {
          return collection;
        }
        if(txn.relationship[collection]) return collection;
      }
      const collections = [
        this.settingsService.collections.GROUP_CHAT,
        this.settingsService.collections.GROUP_MAIL,
        this.settingsService.collections.GROUP_CALENDAR
      ]
      for (let j=0; j < Object.keys(this.groups_indexed).length; j++) {
        const group = this.getIdentityFromTxn(
          this.groups_indexed[Object.keys(this.groups_indexed)[j]],
          this.settingsService.collections.GROUP
        );
        for (let i=0; i < collections.length; i++) {
          const collection = collections[i];
          const rid = this.generateRid(
            group.username_signature,
            group.username_signature,
            collection
          )
          if(
            txn.rid === rid ||
            txn.requester_rid === rid ||
            txn.requested_rid === rid
          ) {
            return collection;
          }
        }
      }
      return false;
    }

    identityToSkylink(identity) {
      return new Promise((resolve, reject) => {
        const identityJson = JSON.stringify(this.toIdentity(identity), null, 4);
        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sia-upload?filename=' + encodeURIComponent(identity.username_signature), {file: btoa(identityJson)})
        .subscribe((res) => {
            const data = res.json();
            if (!data.skylink) return reject(data);
            return resolve(data.skylink)
        })
      })
    }

    inviteToSkylink(invite) {
      return new Promise((resolve, reject) => {
        const identityJson = JSON.stringify(invite, null, 4);
        this.ahttp.post(this.settingsService.remoteSettings['baseUrl'] + '/sia-upload?filename=' + encodeURIComponent(invite.invite_signature), {file: btoa(identityJson)})
        .subscribe((res) => {
            const data = res.json();
            if (!data.skylink) return reject(data);
            return resolve(data.skylink)
        })
      })
    }

    identityFromSkylink(skylink) {
      return new Promise((resolve, reject) => {
        this.ahttp.get('https://centeridentity.com/sia-download?skylink=' + skylink)
        .subscribe((res) => {
            try {
              return resolve(JSON.parse(res.text()))
            }
            catch(err) {
              return reject(err)
            }
        })
      });
    }

    registrationStatus() {
      if (
        this.settingsService.remoteSettings.restricted &&
        !this.isAdded(this.settingsService.remoteSettings.identity) &&
        !this.isAdded(this.bulletinSecretService.identity.parent) &&
        !this.isRequested(this.settingsService.remoteSettings.identity) &&
        !this.isRequested(this.bulletinSecretService.identity.parent) &&
        this.settingsService.remoteSettings.identity.username_signature !== this.bulletinSecretService.identity.username_signature
      ) {
        return 'error';
      }

      if (
        this.settingsService.remoteSettings.restricted &&
        !this.isAdded(this.settingsService.remoteSettings.identity) &&
        !this.isAdded(this.bulletinSecretService.identity.parent) &&
        (
          this.isRequested(this.settingsService.remoteSettings.identity) ||
          this.isRequested(this.bulletinSecretService.identity.parent)
        ) &&
        this.settingsService.remoteSettings.identity.username_signature !== this.bulletinSecretService.identity.username_signature
      ) {
        return 'pending';
      }

      if (
        this.settingsService.remoteSettings.restricted &&
        (
          this.isAdded(this.settingsService.remoteSettings.identity) ||
          this.isAdded(this.bulletinSecretService.identity.parent)
        ) &&
        !this.isRequested(this.settingsService.remoteSettings.identity) &&
        !this.isRequested(this.bulletinSecretService.identity.parent) &&
        this.settingsService.remoteSettings.identity.username_signature !== this.bulletinSecretService.identity.username_signature
      ) {
        return 'complete';
      }
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