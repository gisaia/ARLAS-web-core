import { Filter } from 'arlas-api/model/filter';
import { Search } from 'arlas-api/model/search';
import { Count } from 'arlas-api/model/count';
import { AggregationModel } from 'arlas-api/model/aggregationModel';
import { AggregationRequest } from 'arlas-api/model/aggregationRequest';

export enum eventType {
  aggregate,
  geoaggregate,
  count,
  search,
  geosearch
}

export interface CollaborationEvent {
  contributorId: string;
  detail: Filter;
  enabled: boolean;
}
