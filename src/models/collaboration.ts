/*
 * Licensed to Gisaïa under one or more contributor
 * license agreements. See the NOTICE.txt file distributed with
 * this work for additional information regarding copyright
 * ownership. Gisaïa licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Filter } from 'arlas-api';

/**
 * A Collaboration is a set of ARLAS filters applied by a contributor to filter data
 */
export interface Collaboration {
  /** A map of Filter from ARLAS API */
  filters: Map<string, Filter[]>;
  /** Whether the filter of the collaboration is enabled */
  enabled: boolean;
}

export interface FilterOnCollection extends Filter {
  collection: string;
}

/**
 * Represents the event sent when a new Collaboration is added/removed
 */
export interface CollaborationEvent {
  /** Id of the contributor */
  id: string;
  /** Operation */
  operation: OperationEnum;
  /** Whether the collaboration is for all contributors */
  all: boolean;
}

/**
* Enum of operation
*/
export enum OperationEnum {
  add, remove
}
