import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollaborativesearchService } from '../services/collaborativesearch.service';
import { ConfigService } from '../services/config.service';
import { Collaboration, CollaborationEvent, OperationEnum } from './collaboration';
import { Contributor } from './contributor';

class TestContributor extends Contributor<null> {
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

function eventWithId(id: string): CollaborationEvent {
  return { id, operation: OperationEnum.add, all: id === 'all' };
}

const TEST_CONTRIBUTOR_ID = 'test-contributor';
const TEST_COLLECTION = 'myCollection';

const OTHER_CONTRIBUTOR_ID = 'other-contributor';
const OTHER_COLLECTION = 'otherCollection';

describe('Contributor', () => {
    let collaborativeSearchService: CollaborativesearchService;
    let configService: ConfigService;
    let contributor: TestContributor;

    function createContributor(identifier = TEST_CONTRIBUTOR_ID, collection = TEST_COLLECTION): TestContributor {
        const contributor = new TestContributor(identifier, configService, collaborativeSearchService);
        contributor.collections = [{ collectionName: collection }];
        collaborativeSearchService.registry.set(identifier, contributor);
        return contributor;
    }

    function configFor(...identifiers: string[]) {
        configService.setConfig({
            arlas: {
                server: { debounceCollaborationTime: 0 },
                web: {
                    contributors: identifiers.map(id => ({ identifier: id, name: id })),
                },
            },
        });
    }

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
        configFor(TEST_CONTRIBUTOR_ID);
        contributor = createContributor();
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
            configFor(TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
            createContributor(OTHER_CONTRIBUTOR_ID);
            checkUpdateFromCollaboration(OTHER_CONTRIBUTOR_ID, true);
        });

        it('Collaboration from different collections', () => {
            configFor(TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
            const otherContributor = createContributor(OTHER_CONTRIBUTOR_ID, OTHER_COLLECTION);
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
            configFor(TEST_CONTRIBUTOR_ID, OTHER_CONTRIBUTOR_ID);
            createContributor(OTHER_CONTRIBUTOR_ID);
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
