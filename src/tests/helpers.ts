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
