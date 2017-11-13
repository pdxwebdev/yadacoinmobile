import { Injectable } from '@angular/core';
import { Component } from '@angular/core';
import { Storage } from '@ionic/storage';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';

declare var Peer;
declare var foobar;
declare var forge;

@Injectable()
export class PeerService {
    peer = null;
    conn = null;
    relationship = null;
    callback = null;
    rid = null;
    key = null;
    baseAddress = null;
    constructor(private storage: Storage, private graphService: GraphService, private bulletinSecretService: BulletinSecretService) {
      this.storage.get('key').then((key) => {
          if(key && typeof key == 'string') {
              this.key = foobar.bitcoin.ECPair.fromWIF(key);
          } else {
              this.key = foobar.bitcoin.ECPair.makeRandom();
              this.storage.set('key', this.key.toWIF());
          }
      });
      this.storage.get('baseAddress').then((baseAddress) => {
          this.baseAddress = baseAddress;
      });
    }

    init() {
      if (!this.peer || !this.peer.id) {
        this.graphService.getGraph().then(() => {
          this.peer = new Peer({
            config: {'iceServers': [
              { url: 'turn:34.237.46.10:3478', credential: 'root', username: 'user' }
            ]},
            host:'34.237.46.10',
            port: 9000,
            // Set highest debug level (log everything!).
            debug: 3,

            logFunction: function() {
              var copy = Array.prototype.slice.call(arguments).join(' ');
              console.log(copy);
            }
          });
          this.peer.on('open', (id) => {
            for(var i=0; i < this.graphService.graph.friends.length; i++) {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', this.baseAddress + '/add-peer?rid=' + this.graphService.graph.friends[i].rid + '&peer_id=' + id, true);
              xhr.send();
            }
          });
          this.peer.on('connection', (connection) => {
            // This `connection` is a DataConnection object with which we can send
            // data.
            // The `open` event firing means that the connection is now ready to
            // transmit data.onnection.
            console.log('connected');
            connection.on('open', function() {
              // Send 'Hello' on the connection.
              console.log('opened');
            });
            // The `data` event is fired when data is received on the connection.
            //: step 2 in friend accept process
            connection.on('data', (data) => {
              // Append the data to body.
              console.log(data);
              var person_to_lookup = JSON.parse(data);
              var rids = [this.bulletinSecretService.bulletin_secret, person_to_lookup.bulletin_secret].sort(function (a, b) {
                  return a.toLowerCase().localeCompare(b.toLowerCase());
              });
              var testrid = foobar.bitcoin.crypto.sha256(rids[0] + rids[1]).toString('hex');

              var xhr = new XMLHttpRequest();
              xhr.open('GET', this.baseAddress + '/transaction?rid=' + testrid, true);
              xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                      var transactions = JSON.parse(xhr.responseText);
                      for (var i=0; i < transactions.length; i++) {
                          var encrypted_relationship = transactions[i].relationship;
                          var decrypted_relationship = this.decrypt(encrypted_relationship);
                          if (decrypted_relationship.data.indexOf('shared_secret') > 0) {
                              var shared_secret = JSON.parse(decrypted_relationship.data).shared_secret;
                              break;
                          }
                      }
                      if(typeof shared_secret != 'undefined') {
                          connection.send(JSON.stringify({
                              bulletin_secret: this.bulletinSecretService.bulletin_secret,
                              shared_secret: shared_secret,
                              to: this.key.getAddress()
                          }));
                      }
                }
              }
              xhr.send();
            });
          });
        });
      }
    }

    connect(peerId, callback) {
        this.conn = this.peer.connect(peerId);
        this.conn.on('open', callback);
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

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }
}