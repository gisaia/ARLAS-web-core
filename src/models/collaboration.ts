import { Filter } from 'arlas-api/model/filter';

export enum eventType {
  add,
  remove,
  update

}

export interface Collaboration {
  filter: Filter;
  enabled: boolean;

}
