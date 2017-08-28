import { Filter } from 'arlas-api';
    /**
    * - A filter object from ARLAS API.
    * - A boolean to know if the filter of the collaboration is enabled.
    */
export interface Collaboration {
  filter: Filter;
  enabled: boolean;
}
