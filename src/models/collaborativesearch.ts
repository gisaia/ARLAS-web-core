import { AggregationsRequest } from 'arlas-api';
import { Subject, Observable } from 'rxjs/Rx';
import { Collaboration } from './collaboration';
import { Search } from 'arlas-api';
import { Aggregation } from 'arlas-api';
import { Contributor } from '../services/contributor';
import { Count } from 'arlas-api';
export enum projType {
  aggregate,
  geoaggregate,
  count,
  search,
  geosearch
}
export interface CollaborativeSearch {
  collaborations: Map<string, Collaboration>;
  registry: Map<string, Contributor>;
  setFilter(contributor: string, collaborationEvent: Collaboration);
  register(identifier: string, contributor: Contributor);
  removeFilter(contributorId: string);
  removeAll();
  resolveButNot(projection: [projType.aggregate, Array<Aggregation>] |
    [projType.search, Search] |
    [projType.geoaggregate, Array<Aggregation>] |
    [projType.geosearch, Search] |
    [projType.count, Count],
    contributorId?: string): Observable<any>;
}
