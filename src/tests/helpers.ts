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

import { CollaborativesearchService } from '../services/collaborativesearch.service';
import { ConfigService } from '../services/config.service';
import { TEST_COLLECTION, TEST_CONTRIBUTOR_ID, TestContributor } from './mock.contributor';

export function createContributor(collaborativeSearchService: CollaborativesearchService, configService: ConfigService,
    identifier = TEST_CONTRIBUTOR_ID, collection = TEST_COLLECTION
): TestContributor {
    const contributor = new TestContributor(identifier, configService, collaborativeSearchService);
    contributor.collections = [{ collectionName: collection }];
    collaborativeSearchService.registry.set(identifier, contributor);
    return contributor;
}

export function configFor(configService: ConfigService, ...identifiers: string[]) {
    configService.setConfig({
        arlas: {
            server: { debounceCollaborationTime: 0 },
            web: {
                contributors: identifiers.map(id => ({ identifier: id, name: id })),
            },
        },
    });
}
