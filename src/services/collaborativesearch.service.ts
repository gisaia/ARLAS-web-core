import { ApiService } from '../models/apiservice';
import { CollaborativeSearch } from '../models/collaborativesearch';
import { ArlasService } from './arlas.service';
import { Subject } from 'rxjs/Rx';
import { Contribution } from '../models/contribution';

export class CollaborativesearchService implements CollaborativeSearch {
    changeSubject: Subject<Contribution> = new Subject<Contribution>();
    contributions = new Map<Object, Object>();
    apiservice: ApiService
    constructor(private api: ApiService) {
        this.apiservice = api
    }
    public setFilter(contributor: Object, filter: Object) {
        this.contributions.set(contributor, filter)
        this.changeSubject.next(<Contribution>{ contributor: contributor, filter: filter })

    }
    public removeFilter(contributor: Object, filter: Object) {
        this.contributions.delete(contributor)
    }
    public removeAll() {
        this.contributions = new Map<Object, Object>();
    }
    public searchButNot(contributor?: any): any {
        let filters: Array<Object> = new Array<Object>()
        if (contributor) {
            // search all but not contributor in parameter
            this.contributions.forEach((k, v) => {
                if (v != contributor) {
                    // build filter for query
                    filters.push(k)
                } else {
                    return
                }
            })
        } else {
            // search all contributors result
            // build filter for query
            this.contributions.forEach((k, v) => filters.push(k))
        }
        let data = this.apiservice.executequery(this.apiservice.buildquery(filters))
        return data
    }

    public getCollaborativeChangeSubject(contributor: Object): Subject<Object> {
        return this.changeSubject
    }


}

