import { Subject, Observable } from 'rxjs/Rx';
import { CollaborationEvent, eventType } from './collaborationEvent';
import { Aggregations } from 'arlas-api/model/aggregations';
import { Count } from 'arlas-api/model/count';
import { Search } from 'arlas-api/model/search';
export interface CollaborativeSearch {
  collaborationsEvents: Map<string, CollaborationEvent>
  setFilter(collaborationEvent: CollaborationEvent)
  removeFilter(collaborationEvent: CollaborationEvent)
  removeAll(),
  resolveButNot(projection: [eventType.aggregate, Aggregations] | [eventType.search, Search] | [eventType.geoaggregate, Aggregations] | [eventType.geosearch, Search] | [eventType.count, Count], contributorId?: string): Observable<any>
}