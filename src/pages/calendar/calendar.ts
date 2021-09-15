import { Component, ViewChild, OnInit, Inject, LOCALE_ID } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { GraphService } from '../../app/graph.service';
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
    private bulletinSecretService: BulletinSecretService
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
        this.bulletinSecretService.key.toWIF() + 'event_meeting'
      )]
      let group_rids = [];
      for (let i=0; i < this.graphService.graph.groups.length; i++) {
        const group = this.graphService.graph.groups[i];
        group_rids.push(this.graphService.generateRid(
          group.relationship.username_signature,
          group.relationship.username_signature,
          'event_meeting'
        ))
      }
      let file_rids = [];
      for (let i=0; i < this.graphService.graph.files.length; i++) {
        const file = this.graphService.graph.files[i];
        file_rids.push(this.graphService.generateRid(
          file.relationship.username_signature,
          file.relationship.username_signature,
          'event_meeting'
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
      this.graphService.graph.calendar.map((event) => {
        const group = this.graphService.groups_indexed[event.requested_rid]
        const eventDate = event.relationship.envelope.event_datetime;
        const index = eventDate.getFullYear() + this.addZeros(eventDate.getMonth()) + this.addZeros(eventDate.getDate());
        if (!events[index]) {
          events[index] = []
        }
        events[index].push({
          group: group ? group.relationship : null,
          sender: event.relationship.envelope.sender,
          subject: event.relationship.envelope.subject,
          body: event.relationship.envelope.body,
          datetime: new Date(parseInt(event.time)*1000).toISOString().slice(0, 19).replace('T', ' '),
          id: event.id,
          message_type: event.relationship.envelope.message_type,
          event_datetime: event.relationship.envelope.event_datetime,
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