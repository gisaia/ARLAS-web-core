import { Subject } from 'rxjs/Rx';
export interface CollaborativeSearch {
  contributions: Map<any, any>
  setFilter(contributor: any, filter: any),
  removeFilter(contributor: any, filter: any),
  removeAll(),
  getCollaborativeChangeSubject(contributor:Object):Subject<any>
  searchButNot(contributor?: any)

}