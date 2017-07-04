import { Subject } from 'rxjs/Rx';
import { ApiService } from './apiservice';
export interface CollaborativeSearch {
  contributions: Map<any, any>
  setFilter(contributor: any, filter: any),
  removeFilter(contributor: any, filter: any),
  removeAll(),
  getCollaborativeSubject(contributor:Object):Subject<any>
  searchButNot(contributor?: any):any

}