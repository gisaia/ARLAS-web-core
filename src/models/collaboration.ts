import { Filter } from 'arlas-api';
/**
* - A filter object from ARLAS API.
* - A boolean to know if the filter of the collaboration is enabled.
*/
export interface Collaboration {
  filter: Filter;
  enabled: boolean;
}

/**
* - An id of a contributor.
* - An operation add/remove.
* - If the operation is for all the contributors
*/
export interface CollaborationEvent {
  id: string;
  operation: OperationEnum;
  all: boolean;
}

/**
* - Enum of operation.
*/
export enum OperationEnum {
  add, remove
}
