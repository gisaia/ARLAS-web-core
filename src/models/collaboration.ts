import { Filter } from 'arlas-api';

export enum eventType {
  add,
  remove,
  update

}

export interface Collaboration {
  filter: Filter;
  enabled: boolean;

}
