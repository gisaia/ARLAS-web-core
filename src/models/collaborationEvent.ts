import { arlasProjection } from './collaborationEvent';
import { Filter } from "arlas-api/model/filter";
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

export interface arlasProjection{
  search?:Search
  filter?:Filter
  count?:Count
  aggregationRequest?:AggregationRequest
}

export interface CollaborationEvent {
  contributor:Object,
  eventType:any
  detail:arlasProjection
}