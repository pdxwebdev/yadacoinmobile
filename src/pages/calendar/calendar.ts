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
    const rid = this.graphService.generateRid(
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.identity.username_signature,
      this.bulletinSecretService.key.toWIF() + 'calendar'
    )
    this.graphService.getCalendar(rid)
    .then((data) => {

      let events = {};
      this.graphService.graph.calendar.map((event) => {
        const eventDate = event.relationship.event_datetime;
        const index = eventDate.getFullYear() + this.addZeros(eventDate.getMonth()) + this.addZeros(eventDate.getDate());
        if (!events[index]) {
          events[index] = []
        }
        events[index].push({
          sender: event.relationship.sender,
          subject: event.relationship.subject,
          body: event.relationship.body,
          datetime: new Date(parseInt(event.time)*1000).toISOString().slice(0, 19).replace('T', ' '),
          id: event.id,
          message_type: event.relationship.message_type,
          event_datetime: event.relationship.event_datetime,
        });
      });
      this.getCalendar(events);
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
      let calDate = new Date(year, month, fistDay.getDate() + i)
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