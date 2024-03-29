import { Injectable } from '@angular/core';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Http, RequestOptions, Headers } from '@angular/http';
import { timeout } from 'rxjs/operators';
import { Events, LoadingController } from 'ionic-angular';
import { GraphService } from './graph.service';
import { TransactionService } from './transaction.service';


declare var uuid4;
declare var X25519;

@Injectable()
export class WebSocketService {
  websocket: any;
  loadingModal: any;
  directMessageRequestResolve: any;
  reconnectInterval: any;
  constructor(
    private ahttp: Http,
    private bulletinSecretService: BulletinSecretService,
    private settingsService: SettingsService,
    private graphService: GraphService,
    private transactionService: TransactionService,
    private events: Events
  ) {}

  init() {
    if (this.websocket && this.websocket.readyState > 1) {
      this.websocket.close()
    };
    this.websocket = new WebSocket(this.settingsService.remoteSettings.websocketUrl);
    this.websocket.onopen = this.onOpen.bind(this);
    this.websocket.onmessage = this.onMessage.bind(this);
    this.websocket.onerror = (err) => {
      console.error('Socket encountered error: ', err.message, 'Closing socket');
      this.websocket.close();
    };
    this.websocket.onclose = (e) => {
      console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
      setTimeout(() => {
        this.init();
      }, 1000);
    };
  }

  onOpen(event) {
    this.connect()
    console.log(event.data);
  }

  onMessage(event) {
    let directMessageResponseCount;
    let directMessageResponseCounts;
    const msg = JSON.parse(event.data);
    console.log(msg);
    switch (msg.method) {
      case 'connect_confirm':
        for (let i=0; i < this.graphService.graph.groups.length; i++) {
          let group = this.graphService.getIdentityFromTxn(
            this.graphService.graph.groups[i],
            this.settingsService.collections.GROUP
          )
          this.joinGroup(group)
        }
        break;
      case 'join_confirmed':
        // const members = msg.result.members;
        // for (let i=0; i < Object.keys(members).length; i++) {
        //   let requested_rid = Object.keys(members)[i];
        //   let group_members = members[requested_rid];
        //   if(!this.graphService.online[requested_rid]) this.graphService.online[requested_rid] = [];
        //   this.graphService.online[requested_rid] = this.graphService.online[requested_rid].concat(group_members)
        // }
        break;
      case 'newtxn':
        if (msg.params.transaction.public_key === this.bulletinSecretService.identity.public_key) return;
        const collection = this.graphService.getNewTxnCollection(msg.params.transaction)
        if (collection) {
          switch (collection) {
            case this.settingsService.collections.CONTACT:
              this.graphService.parseFriendRequests([msg.params.transaction])
              this.graphService.refreshFriendsAndGroups()
              .then(() => {
                return this.graphService.addNotification(msg.params.transaction, this.settingsService.collections.CONTACT);
              })
              break;
            case this.settingsService.collections.CALENDAR:
              const calendar = this.graphService.parseCalendar([msg.params.transaction])
              return this.graphService.addNotification(calendar, this.settingsService.collections.CALENDAR);
              break;
            case this.settingsService.collections.GROUP_CALENDAR:
              const group_calendar = this.graphService.parseCalendar([msg.params.transaction])
              return this.graphService.addNotification(group_calendar, this.settingsService.collections.GROUP_CALENDAR);
              break;
            case this.settingsService.collections.CHAT:
              this.graphService.parseMessages(
                [msg.params.transaction],
                'new_messages_counts',
                'new_messages_count',
                msg.params.transaction.rid,
                this.settingsService.collections.CHAT,
                'last_message_height'
              )
              .then((item) => {
                if (!this.graphService.graph.messages[msg.params.transaction.rid]) {
                  this.graphService.graph.messages[msg.params.transaction.rid] = []
                }
                this.graphService.graph.messages[msg.params.transaction.rid].push(item[0])
                this.events.publish('newchat')
                return this.graphService.addNotification(item[0], this.settingsService.collections.CHAT);
              })
              break;
            case this.settingsService.collections.CONTRACT:
              break;
            case this.settingsService.collections.CONTRACT_SIGNED:
              break;
            case this.settingsService.collections.GROUP_CHAT:
              this.graphService.parseMessages(
                [msg.params.transaction],
                'new_group_messages_counts',
                'new_group_messages_count',
                msg.params.transaction.rid,
                this.settingsService.collections.GROUP_CHAT,
                'last_group_message_height'
              )
              .then((item) => {
                if (!this.graphService.graph.messages[msg.params.transaction.requested_rid]) {
                  this.graphService.graph.messages[msg.params.transaction.requested_rid] = []
                }
                this.graphService.graph.messages[msg.params.transaction.requested_rid].push(item[0])
                this.events.publish('newchat')
                return this.graphService.addNotification(item[0], this.settingsService.collections.GROUP_CHAT);
              })
              break;
            case this.settingsService.collections.GROUP_MAIL:
              this.graphService.parseMail(
                [msg.params.transaction],
                'new_sent_mail_counts',
                'new_sent_mail_count',
                undefined,
                this.settingsService.collections.GROUP_MAIL,
                'last_sent_mail_height'
              )
              .then((item) => {
                this.events.publish('newmail')
                return this.graphService.addNotification(item, this.settingsService.collections.GROUP_MAIL);
              })
              break;
            case this.settingsService.collections.MAIL:
              let mailCount;
              let mailCounts;
              this.graphService.parseMail(
                [msg.params.transaction],
                mailCount,
                mailCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.MAIL
              )
              .then((item) => {
                this.events.publish('newmail')
                return this.graphService.addNotification(item, this.settingsService.collections.MAIL);
              })
              break;
            case this.settingsService.collections.PERMISSION_REQUEST:
              break;
            case this.settingsService.collections.SIGNATURE_REQUEST:
              let permissionRequestCount;
              let permissionRequestCounts;
              this.graphService.parseMessages(
                [msg.params.transaction],
                permissionRequestCount,
                permissionRequestCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.SIGNATURE_REQUEST
              )
              .then((item) => {
                return this.graphService.addNotification(item[msg.params.transaction.rid][0], this.settingsService.collections.SIGNATURE_REQUEST);
              })
              break;
            case this.settingsService.collections.WEB_CHALLENGE_REQUEST:
              let directMessageRequestCount;
              let directMessageRequestCounts;
              this.graphService.parseMessages(
                [msg.params.transaction],
                directMessageRequestCount,
                directMessageRequestCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.WEB_CHALLENGE_REQUEST
              )
              .then((items: any) => {
                this.directMessageResponse(
                  msg.params.transaction.rid,
                  this.settingsService.collections.WEB_CHALLENGE_RESPONSE,
                  {
                    challenge: uuid4(),
                    url: this.settingsService.remoteSettings.webSignInUrl
                  }
                )
              })
              break;
            case this.settingsService.collections.WEB_CHALLENGE_RESPONSE:
              this.graphService.parseMessages(
                [msg.params.transaction],
                directMessageResponseCount,
                directMessageResponseCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.WEB_CHALLENGE_RESPONSE
              )
              .then((items: any) => {
                return this.directMessageRequestResolve(items[msg.params.transaction.rid][0])
              })
              break;
            case this.settingsService.collections.WEB_SIGNIN_REQUEST:
              this.graphService.parseMessages(
                [msg.params.transaction],
                directMessageRequestCount,
                directMessageRequestCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.WEB_SIGNIN_REQUEST
              )
              .then((items: any) => {
                this.directMessageResponse(
                  msg.params.transaction.rid,
                  this.settingsService.collections.WEB_SIGNIN_RESPONSE,
                  items[msg.params.transaction.rid][0].relationship[this.settingsService.collections.WEB_SIGNIN_REQUEST]
                )
              })
              break;
            case this.settingsService.collections.WEB_SIGNIN_RESPONSE:
              this.graphService.parseMessages(
                [msg.params.transaction],
                directMessageResponseCount,
                directMessageResponseCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.WEB_SIGNIN_RESPONSE
              )
              .then((items: any) => {
                return this.directMessageRequestResolve(items[msg.params.transaction.rid][0])
              })
              break;
            case this.settingsService.collections.WEB_PAGE:
              const webpage = this.graphService.parseMyPages([msg.params.transaction]);
              this.graphService.addNotification(webpage, this.settingsService.collections.WEB_PAGE);
              break;
            case this.settingsService.collections.WEB_PAGE_REQUEST:
              let webRequestCount;
              let webRequestCounts;
              this.graphService.parseMessages(
                [msg.params.transaction],
                webRequestCount,
                webRequestCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.WEB_PAGE_REQUEST
              )
              .then((items: any) => {
                let myRids2 = [this.graphService.generateRid(
                  this.bulletinSecretService.identity.username_signature,
                  this.bulletinSecretService.identity.username_signature,
                  this.settingsService.collections.WEB_PAGE
                )];
                return this.graphService.getMyPages(myRids2)
              })
              .then((items: any) => {
                const request = msg.params.transaction
                const myPages = this.graphService.graph.mypages.filter(item2 => {
                  return item2.relationship[this.settingsService.collections.WEB_PAGE].resource === request.relationship[this.settingsService.collections.WEB_PAGE_REQUEST].resource
                })
                let webResponse;
                if (myPages[0]) {
                  webResponse = {
                    resource: myPages[0].relationship[this.settingsService.collections.WEB_PAGE].resource,
                    content: myPages[0].relationship[this.settingsService.collections.WEB_PAGE].content
                  }
                } else {
                  webResponse = {
                    resource: request.relationship[this.settingsService.collections.WEB_PAGE_REQUEST].resource,
                    content: 'Page not found for resource.'
                  }
                }
                this.directMessageResponse(
                  msg.params.transaction.rid,
                  this.settingsService.collections.WEB_PAGE_RESPONSE,
                  webResponse
                )
              })
              break;
            case this.settingsService.collections.WEB_PAGE_RESPONSE:
              let webResponseCount;
              let webResponseCounts;
              this.graphService.parseMessages(
                [msg.params.transaction],
                webResponseCount,
                webResponseCounts,
                msg.params.transaction.rid,
                this.settingsService.collections.WEB_PAGE_RESPONSE
              )
              .then((items: any) => {
                return this.directMessageRequestResolve(items[msg.params.transaction.rid][0])
              })
              break;
          }

        }
        break

      case 'newblock':
        const block = msg.params.payload.block
        block.height = block.index
        this.settingsService.latest_block = block;
        break
    }
  }

  connect() {
    this.websocket.send(JSON.stringify({
        id: '',
        jsonrpc: 2.0,
        method: 'connect',
        params: {
            identity: this.graphService.toIdentity(this.bulletinSecretService.identity)
        }
    }))
  }

  joinGroup(identity) {
    return this.websocket.send(JSON.stringify({
        id: '',
        jsonrpc: 2.0,
        method: 'join_group',
        params: identity
    }))
  }

  newtxn(item, rids, collection, shared_secret=null, extra_data={}): Promise<void> {

    const request:any = {
        ...rids,
        relationship: {},
        ...extra_data
    }
    if (shared_secret) {
        request.shared_secret = shared_secret
    }
    request.relationship[collection] = item
    return this.transactionService.generateTransaction(request)
    .then((txn):any => {
        this.sendnewtxn();
        return txn;
    })
  }

  directMessageRequest(identity, collection, relationship, resolve) {
    this.directMessageRequestResolve = resolve
    identity.collection = collection;
    const rids = this.graphService.generateRids(identity)
    var dh_public_key = this.graphService.keys[rids.rid].dh_public_keys[0];
    var dh_private_key = this.graphService.keys[rids.rid].dh_private_keys[0];

    var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }));
    var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }));
    var shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
    let request = {
      ...rids,
      relationship: {},
      shared_secret: shared_secret
    }
    request.relationship[collection] = relationship
    this.transactionService.generateTransaction(request)
    .then(() => {
        this.sendnewtxn()
    })
  }

  directMessageResponse(rid, collection, relationship) {
    const myRids = this.graphService.generateRids(this.bulletinSecretService.identity)
    let recipient;
    if (this.graphService.friends_indexed[rid]) {
      recipient = this.graphService.getIdentityFromTxn(
        this.graphService.friends_indexed[rid],
        this.settingsService.collections.CONTACT
      )
    }

    if (myRids.rid == rid){
      recipient = this.bulletinSecretService.identity
    }

    if (!recipient) return;

    recipient.collection = collection;
    const rids = this.graphService.generateRids(recipient)
    var dh_public_key = this.graphService.keys[rids.rid].dh_public_keys[0];
    var dh_private_key = this.graphService.keys[rids.rid].dh_private_keys[0];

    var privk = new Uint8Array(dh_private_key.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }));
    var pubk = new Uint8Array(dh_public_key.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }));
    var shared_secret = this.toHex(X25519.getSharedKey(privk, pubk));
    let request = {
      ...rids,
      relationship: {},
      shared_secret
    }
    request.relationship[collection] = relationship;
    return this.transactionService.generateTransaction(request)
    .then(() => {
      this.sendnewtxn()
    })
  }

  sendnewtxn() {
    return this.websocket.send(JSON.stringify({
      id: '',
      jsonrpc: 2.0,
      method: 'newtxn',
      params: {
          transaction: this.transactionService.transaction
      }
    }))
  }

  toHex(byteArray) {
    var callback = function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }
    return Array.from(byteArray, callback).join('')
  }

}