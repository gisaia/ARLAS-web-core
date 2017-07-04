import { ApiService } from '../models/apiservice';
import { CollaborativeSearch } from '../models/collaborativesearch';
import { ArlasService } from './arlas.service';
import { Subject } from 'rxjs/Rx';

export class CollaborativesearchService implements CollaborativeSearch {
  collaboraticeSubject : Subject<Object>
  contributions = new Map<Object, Object>();
  apiservice:ApiService
  constructor(private api: ApiService) {
      this.apiservice=api
  }
  public setFilter(contributor: Object, filter: Object) {
    this.contributions.set(contributor, filter)
    this.collaboraticeSubject.next({contributor:contributor,filter:filter})

  }
  public removeFilter(contributor: Object, filter: Object) {
    this.contributions.delete(contributor)
  }
  public removeAll() {
      this.contributions = new Map<Object, Object>();
  }
  public searchButNot(contributor?: any) : Object {
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

    public getCollaborativeSubject(contributor:Object): Subject<Object> {
        return this.collaboraticeSubject
    }
}

