import { Filter, Search, Aggregation } from 'arlas-api';
    /**
    * Enum  ARLAS SERVER type of request.
    */
export enum projType {
  aggregate,
  geoaggregate,
  geohashgeoaggregate,
  count,
  search,
  geosearch,
  tiledgeosearch

}

export interface TiledSearch{
  search:Search,
  x:number,
  y:number,
  z:number
}

export interface GeohashAggregation{
  geohash:string,
  aggregations:Array<Aggregation>
}
