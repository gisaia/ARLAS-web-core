import { of } from 'rxjs';
import { Collaboration } from '../models/collaboration';
import { Contributor } from '../models/contributor';

export const TEST_CONTRIBUTOR_ID = 'test-contributor';
export const TEST_COLLECTION = 'myCollection';

export const OTHER_CONTRIBUTOR_ID = 'other-contributor';
export const OTHER_COLLECTION = 'otherCollection';

export class TestContributor extends Contributor<null> {
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
