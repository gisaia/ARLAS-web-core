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

import { of } from 'rxjs';
import { Collaboration } from '../models/collaboration';
import { Contributor } from '../models/contributor';

export const TEST_CONTRIBUTOR_ID = 'test-contributor';
export const TEST_COLLECTION = 'myCollection';

export const OTHER_CONTRIBUTOR_ID = 'other-contributor';
export const OTHER_COLLECTION = 'otherCollection';

export class TestContributor extends Contributor {
  public getPackageName(): string {
    return 'test';
  }
  public isUpdateEnabledOnOwnCollaboration(): boolean {
    return true;
  }
  public getFilterDisplayName(): string {
    return 'test';
  }
  public fetchData() {
    return of(null);
  }
  public computeData(data: null) {
    return data;
  }
  public setData(data: null): void {
    // noop
  }
  public setSelection(data: null | undefined, c: Collaboration): void {
    // noop
  }
}
