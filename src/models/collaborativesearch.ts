import { Subject } from 'rxjs/Rx';
import { CollaborationEvent } from './collaborationEvent';
export interface CollaborativeSearch {
  contributions: Set<CollaborationEvent>
  setFilter(contributor: any, filter: any),
  removeFilter(contributor: any, filter: any),
  removeAll(),
  resolveButNot(projection: any,contributor?: any)

}