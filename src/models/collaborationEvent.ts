import { arlasProjection } from './collaborationEvent';
import { Filter } from "api-arlas/model/filter";
import { Search } from 'api-arlas/model/search';
import { Count } from 'api-arlas/model/count';
import { AggregationModel } from 'api-arlas/model/aggregationModel';
import { AggregationRequest } from 'api-arlas/model/aggregationRequest';

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