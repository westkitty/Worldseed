// Historical Event Buffer, Compaction, and Milestone Indexer

import { HistoricalEvent } from '../../types/simulation';

export class HistoricalEventBuffer {
  private events: HistoricalEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents: number = 5000) {
    this.maxEvents = maxEvents;
  }

  public addEvent(event: HistoricalEvent) {
    this.events.push(event);
    // If buffer grows beyond limit, compact minor events while strictly preserving high-importance milestones
    if (this.events.length > this.maxEvents) {
      this.compact();
    }
  }

  public addEvents(events: HistoricalEvent[]) {
    for (const e of events) {
      this.addEvent(e);
    }
  }

  public getEvents(): HistoricalEvent[] {
    return this.events;
  }

  public setEvents(events: HistoricalEvent[]) {
    this.events = events;
  }

  // Preserve all importance >= 3 events; prune oldest importance 1-2 events
  private compact() {
    const criticalEvents = this.events.filter(e => e.importance >= 3);
    const minorEvents = this.events.filter(e => e.importance < 3);

    // Keep the most recent 1,500 minor events
    const keptMinor = minorEvents.slice(-1500);

    const merged = [...criticalEvents, ...keptMinor];
    merged.sort((a, b) => a.year - b.year);
    this.events = merged;
  }
}
