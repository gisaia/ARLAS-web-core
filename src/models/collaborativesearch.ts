import { ApiService } from './apiservice';
import { Observer } from './observer';
export interface CollaborativeSearch {
  contributions: Map<Object, Object>
  setFilter(contributor: Object, filter: Object),
  removeFilter(contributor: Object, filter: Object),
  removeAll()
  registerObserver(observer: Observer)
  searchButNot(contributor?: Object):Object

}