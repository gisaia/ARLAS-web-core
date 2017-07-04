import { ApiService } from '../models/apiservice';
import { CollaborativeSearch } from '../models/collaborativesearch';
import { Observer } from '../models/observer';
import { ArlasService } from './arlas.service';

export class CollaborativesearchService implements CollaborativeSearch {
  contributions = new Map<Object, Object>();
  registredObserver = new Array<Observer>();
  apiservice:ApiService
  constructor(private api: ApiService) {
      this.apiservice=api
  }
  public setFilter(contributor: Object, filter: Object) {
    this.contributions.set(contributor, filter)
    this.registredObserver.forEach(o => o.notify(contributor))
  }
  public removeFilter(contributor: Object, filter: Object) {
    this.contributions.delete(contributor)
  }
  public removeAll() {
      this.contributions = new Map<Object, Object>();
  }
  public registerObserver(observer: Observer) {
    this.registredObserver.push(observer)
  }
  public searchButNot(contributor?: Object) : Object {
    let filters : Array<Object> = new Array<Object>()
    if(contributor){
        // search all but not contributor in parameter
        this.contributions.forEach((k,v)=>{
            if(v!=contributor){
              // build filter for query
              filters.push(k)  
            }else{
              return
            }
        })
    }else{
        // search all contributors result
        // build filter for query
        this.contributions.forEach((k,v)=> filters.push(k) )
    }
    return this.apiservice.executequery(this.apiservice.buildquery(filters))
  }

 
}

