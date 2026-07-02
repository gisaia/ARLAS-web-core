import { throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollaborativesearchService } from '../services/collaborativesearch.service';
import { ConfigService } from '../services/config.service';
import { configFor, createContributor } from '../tests/helpers';
import { OTHER_COLLECTION, OTHER_CONTRIBUTOR_ID, TEST_CONTRIBUTOR_ID, TestContributor } from '../tests/mock.contributor';
import { CollaborationEvent, OperationEnum } from './collaboration';

function eventWithId(id: string): CollaborationEvent {
  return { id, operation: OperationEnum.add, all: id === 'all' };
}

describe('Contributor', () => {
    let collaborativeSearchService: CollaborativesearchService;
    let configService: ConfigService;
    let contributor: TestContributor;

    function checkUpdateFromCollaboration(eventId: string, shouldUpdate: boolean) {
        const spy = vi.spyOn(contributor, 'updateFromCollaboration');
        const ongoingSpy = vi.spyOn(collaborativeSearchService.ongoingSubscribe, 'next');
        const event = eventWithId(eventId);

        collaborativeSearchService.collaborationBus.next(event);
        vi.runAllTimers();

        if (shouldUpdate) {
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith(event);

            expect(ongoingSpy).toHaveBeenNthCalledWith(1, 1);
            expect(ongoingSpy).toHaveBeenNthCalledWith(2, -1);
        } else {
            expect(spy).not.toHaveBeenCalled();
            expect(ongoingSpy).not.toHaveBeenCalled();
        }
    }

    beforeEach(() => {
        vi.useFakeTimers();
        collaborativeSearchService = new CollaborativesearchService();
        configService = new ConfigService();
        configFor(configService, TEST_CONTRIBUTOR_ID);
        contributor = createContributor(collaborativeSearchService, configService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Update data on CollaborationEvent', () => {
        it('Collaboration from url', () => {
            checkUpdateFromCollaboration('url', true);
        });

        it('Collaboration for all', () => {
            checkUpdateFromCollaboration('all', true);
        });

        it('Collaboration from unknown id', () => {
            checkUpdateFromCollaboration('unknown', false);
        });

        it('Collaboration from same collection', () => {
            configFor(configService, TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
            createContributor(collaborativeSearchService, configService, OTHER_CONTRIBUTOR_ID);
            checkUpdateFromCollaboration(OTHER_CONTRIBUTOR_ID, true);
        });

        it('Collaboration from different collections', () => {
            configFor(configService, TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
            const otherContributor = createContributor(collaborativeSearchService, configService, OTHER_CONTRIBUTOR_ID, OTHER_COLLECTION);
            vi.spyOn(otherContributor, 'isUpdateEnabledOnOwnCollaboration').mockReturnValue(false);

            checkUpdateFromCollaboration(OTHER_CONTRIBUTOR_ID, false);
        });

        describe('Collaboration from itself', () => {
            it('Accepts self-collaboration', () => {
                vi.spyOn(contributor, 'isUpdateEnabledOnOwnCollaboration').mockReturnValue(true);
                checkUpdateFromCollaboration(TEST_CONTRIBUTOR_ID, true);
            });

            it('Refuses self-collaboration', () => {
                vi.spyOn(contributor, 'isUpdateEnabledOnOwnCollaboration').mockReturnValue(false);
                checkUpdateFromCollaboration(TEST_CONTRIBUTOR_ID, false);
            });
        })

        it('Collaboration from linked contributor', () => {
            configFor(configService, TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
            createContributor(collaborativeSearchService, configService, OTHER_CONTRIBUTOR_ID);
            contributor.linkedContributorId = OTHER_CONTRIBUTOR_ID;

            checkUpdateFromCollaboration(OTHER_CONTRIBUTOR_ID, true);
        });

        it('Collaboration results in error fetched', () => {
            const FETCH_ERROR = 'Fetch failed';

            vi.spyOn(contributor, 'fetchData').mockReturnValue(throwError(() => new Error(FETCH_ERROR)));
            const errorBus = vi.spyOn(collaborativeSearchService.collaborationErrorBus, 'next');

            checkUpdateFromCollaboration('all', true);
            expect(errorBus).toHaveBeenCalledWith(new Error(FETCH_ERROR));
        });
    });
});
