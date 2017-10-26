import { Injectable } from '@angular/core';
import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';

declare var Peer;
declare var foobar;

@Injectable()
export class PeerService {
    peer = null;
    conn = null;
    relationship = null;
    callback = null;
    constructor(private storage: Storage, private navParams: NavParams, private graphService: GraphService, private bulletinSecretService: BulletinSecretService) {
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
        this.peer.on('connection', function(connection) {
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
          connection.on('data', function(data) {
            // Append the data to body.
            console.log(data);
            var person_to_lookup = JSON.parse(data);
            var rids = [this.bulletinSecretService.bulletin_secret, person_to_lookup.bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            var testrid = foobar.bitcoin.crypto.sha256(rids[0] + rids[1]).toString('hex');

                var xhr = new XMLHttpRequest();
                xhr.open('GET', 'http://34.237.46.10/transaction?rid=' + testrid, true);
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
                                shared_secret: shared_secret
                            }));
                        }
                  }
                }
                xhr.send();
          });
        });
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://34.237.46.10/add-peer?peer_id=' + this.peer.id, true);
        xhr.send();
    }

    connect(peerId, callback) {
        this.conn = this.peer.connect(peerId);
        this.conn.on('open', callback);
    }
}