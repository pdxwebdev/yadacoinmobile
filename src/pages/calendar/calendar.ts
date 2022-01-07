import { Component, ViewChild, OnInit, Inject, LOCALE_ID } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
import { SettingsService } from '../../app/settings.service';
import { ComposePage } from '../mail/compose';
import { MailItemPage } from '../mail/mailitem';


@Component({
  selector: 'page-calendar',
  templateUrl: 'calendar.html'
})
export class CalendarPage {
  calendar: any;
  loading: boolean;
  constructor(
    public navCtrl: NavController,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private settingsService: SettingsService
  ) {
    this.getCalendar({});
  }

  addZeros(date) {
    return ('00' + date).substr(-2, 2)
  }

  ionViewDidEnter() {
    return new Promise((resolve, reject) => {
      this.loading = true;
      let rids = [this.graphService.generateRid(
        this.bulletinSecretService.identity.username_signature,
        this.bulletinSecretService.identity.username_signature,
        this.settingsService.collections.CALENDAR
      )]
      let group_rids = [];
      for (let i=0; i < this.graphService.graph.groups.length; i++) {
        const group = this.graphService.getIdentityFromTxn(
          this.graphService.graph.groups[i],
          this.settingsService.collections.GROUP
        );
        group_rids.push(this.graphService.generateRid(
          group.username_signature,
          group.username_signature,
          this.settingsService.collections.CALENDAR
        ))
        group_rids.push(this.graphService.generateRid(
          group.username_signature,
          group.username_signature,
          this.settingsService.collections.GROUP_CALENDAR
        ))
      }
      let file_rids = [];
      for (let i=0; i < this.graphService.graph.files.length; i++) {
        const file = this.graphService.getIdentityFromTxn(this.graphService.graph.files[i]);
        file_rids.push(this.graphService.generateRid(
          file.username_signature,
          file.username_signature,
          this.settingsService.collections.CALENDAR
        ))
        file_rids.push(this.graphService.generateRid(
          file.username_signature,
          file.username_signature,
          this.settingsService.collections.GROUP_CALENDAR
        ))
      }
      if (group_rids.length > 0) {
        rids = rids.concat(group_rids);
      }
      if (file_rids.length > 0) {
        rids = rids.concat(file_rids);
      }
      return resolve(rids);
    })
    .then((rids) => {
      return this.graphService.getCalendar(rids)
    })
    .then((data) => {

      let events = {};
      this.graphService.graph.calendar.map((txn) => {
        const group = this.graphService.getIdentityFromTxn(
          this.graphService.groups_indexed[txn.requested_rid],
          this.settingsService.collections.GROUP
        );
        const event = txn.relationship[this.settingsService.collections.CALENDAR] ||
                      txn.relationship[this.settingsService.collections.GROUP_CALENDAR];
        const eventDate = event.event_datetime;
        const index = eventDate.getFullYear() + this.addZeros(eventDate.getMonth()) + this.addZeros(eventDate.getDate());
        if (!events[index]) {
          events[index] = []
        }
        let altSender = this.graphService.getIdentityFromTxn(
          this.graphService.friends_indexed[txn.rid],
          this.settingsService.collections.CONTACT
        )
        events[index].push({
          group: group || null,
          sender: event.sender || altSender,
          subject: event.subject,
          body: event.body,
          datetime: new Date(parseInt(txn.time)*1000).toISOString().slice(0, 19).replace('T', ' '),
          id: txn.id,
          message_type: event.message_type,
          event_datetime: event.event_datetime
        });
      });
      this.getCalendar(events);
      this.loading = false;
    })
  }

  itemTapped(event, item) {
    this.navCtrl.push(MailItemPage, {
      item: item
    });
  }

  createEvent(event, item) {
    this.navCtrl.push(ComposePage, {
      item: {
        message_type: 'calendar'
      }
    });
  }

  getCalendar(events) {
    this.calendar = {
      rows: [
        {
          days: [{}]
        }
      ]
    };
    const date = new Date();
    const month = date.getMonth();
    const year = date.getFullYear();
    const fistDay = new Date(year, month);
    const day = fistDay.getDay();
    for(let i=0; i < 100; i++) {
      if (i < day) {
        if(this.calendar.rows.length === 0) {
          this.calendar.rows.push({
            days: []
          });
        }
        this.calendar.rows[0].days.push({})
        continue;
      }
      let calDate = new Date(year, month, fistDay.getDate() + i - day)
      if(calDate.getMonth() > month) break;
      if(calDate.getFullYear() > year) break;
      const index = calDate.getFullYear() + this.addZeros(calDate.getMonth()) + this.addZeros(calDate.getDate());
      if (this.calendar.rows[this.calendar.rows.length - 1].days.length >= 8) {
        this.calendar.rows.push({
          days: [{}]
        })
      }
      this.calendar.rows[this.calendar.rows.length - 1].days.push({
        date: calDate,
        events: events[index]
      })
    }
  }
}