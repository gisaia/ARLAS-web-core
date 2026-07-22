import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OperationEnum } from '../models/collaboration';
import { configFor, createContributor } from '../tests/helpers';
import { OTHER_CONTRIBUTOR_ID, TEST_CONTRIBUTOR_ID } from '../tests/mock.contributor';
import { CollaborativesearchService } from './collaborativesearch.service';
import { ConfigService } from './config.service';

describe('CollaborativeSearchService', () => {
    let collaborativeSearchService: CollaborativesearchService;
    let configService: ConfigService;

    beforeEach(() => {
        vi.useFakeTimers();
        collaborativeSearchService = new CollaborativesearchService();
        configService = new ConfigService();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Adding a filter should trigger a CollaborationEvent', () => {
        const collaborationBusSpy = vi.spyOn(collaborativeSearchService.collaborationBus, 'next');
        collaborativeSearchService.setFilter(TEST_CONTRIBUTOR_ID, { filters: new Map(), enabled: true });

        expect(collaborationBusSpy).toHaveBeenCalledTimes(1);
        expect(collaborationBusSpy).toHaveBeenCalledWith({ id: TEST_CONTRIBUTOR_ID, operation: OperationEnum.add, all: false});
        expect(collaborativeSearchService.collaborations.has(TEST_CONTRIBUTOR_ID)).to.eq(true);
    });

    it('Removing a filter should trigger a CollaborationEvent', () => {
        const collaborationBusSpy = vi.spyOn(collaborativeSearchService.collaborationBus, 'next');
        collaborativeSearchService.removeFilter(TEST_CONTRIBUTOR_ID);

        expect(collaborationBusSpy).toHaveBeenCalledTimes(1);
        expect(collaborationBusSpy).toHaveBeenCalledWith({ id: TEST_CONTRIBUTOR_ID, operation: OperationEnum.remove, all: false});
        expect(collaborativeSearchService.collaborations.has(TEST_CONTRIBUTOR_ID)).to.eq(false);
    });

    it('Adding a filter from a Contributor with a linked contributor should trigger a CollaborationEvent and register two collaborations', () => {
        configFor(configService, TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
        createContributor(collaborativeSearchService, configService, OTHER_CONTRIBUTOR_ID);
        const contributor = createContributor(collaborativeSearchService, configService);
        contributor.linkedContributorId = OTHER_CONTRIBUTOR_ID;

        const collaborationBusSpy = vi.spyOn(collaborativeSearchService.collaborationBus, 'next');
        collaborativeSearchService.setFilter(TEST_CONTRIBUTOR_ID, { filters: new Map(), enabled: true });

        expect(collaborationBusSpy).toHaveBeenCalledTimes(1);
        expect(collaborationBusSpy).toHaveBeenCalledWith({ id: TEST_CONTRIBUTOR_ID, operation: OperationEnum.add, all: false});
        expect(collaborativeSearchService.collaborations.size).to.eq(2);
        expect(collaborativeSearchService.collaborations.has(TEST_CONTRIBUTOR_ID)).to.eq(true);
        expect(collaborativeSearchService.collaborations.has(OTHER_CONTRIBUTOR_ID)).to.eq(true);
    });

    it('A CollaborationEvent set to remove all collaborations should clear the collaborations map', () => {
        collaborativeSearchService.setFilter('filter1', { filters: new Map(), enabled: true });
        collaborativeSearchService.setFilter('filter2', { filters: new Map(), enabled: true });
        collaborativeSearchService.setFilter('filter3', { filters: new Map(), enabled: true });
        expect(collaborativeSearchService.collaborations.size).to.eq(3);

        collaborativeSearchService.collaborationBus.next({ id: 'all', operation: OperationEnum.remove, all: true });
        expect(collaborativeSearchService.collaborations.size).to.eq(0);
    });
});
