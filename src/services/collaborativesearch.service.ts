import { ARGUMENT_CLASSES } from 'tslint/lib/rules/completedDocsRule';
import { CollaborativeSearch } from '../models/collaborativesearch';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreService } from 'api-arlas/services/explore.service';
import { AggregationModel } from "api-arlas/model/aggregationModel";
import { CollaborationEvent } from '../models/collaborationEvent';
import { AggregationRequest } from "api-arlas/model/aggregationRequest";
import { Aggregations } from "api-arlas/model/aggregations";
import { ArlasAggregation } from "api-arlas/model/arlasAggregation";
import { Filter } from 'api-arlas/model/filter';

export  interface timelineOutput{
    endvalue:Date
    startvalue:Date


}
export class CollaborativesearchService implements CollaborativeSearch {
    collaborationBus: Subject<CollaborationEvent> = new Subject<CollaborationEvent>();
    contributions = new Map<Object, Object>();
    apiservice: ExploreService
    constructor(private api: ExploreService, private collection: string) {
        this.apiservice = api
    }
    public setFilter(contributor: Object, data: CollaborationEvent) {
        this.contributions.set(contributor, data.detail)
        this.collaborationBus.next(data)

    }
    public removeFilter(contributor: Object, filter: Object) {
        this.contributions.delete(contributor)
    }
    public removeAll() {
        this.contributions = new Map<Object, Object>();
    }


    public searchButNot(contributor?: CollaborationEvent): Observable<ArlasAggregation> {
        let filters: Array<timelineOutput> = new Array<timelineOutput>()
        if (contributor.contributor) {
            // search all but not contributor in parameter
            this.contributions.forEach((k, v) => {
                if (v != contributor.contributor) {
                    // build filter for query
                    filters.push(<timelineOutput>k)
                } else {
                    filters.push(<timelineOutput>k)

                    return
                }
            })
        } else {
            // search all contributors result
            // build filter for query
            this.contributions.forEach((k, v) => filters.push(<timelineOutput>k))
        }
        console.log(filters)
        let startdate = new Date(filters[0].startvalue)
        let enddate = new Date(filters[0].endvalue)

        //let data = this.apiservice.executequery(this.apiservice.buildquery(filters))
        let aggregationModel: AggregationModel = {
            type: "term",
            field: "timestamp",
            collectField: "available_bikes",
            collectFct: "sum",
            size: "100",
            order :"asc",
            on : "field"
        }
        let aggregationArray : Array<AggregationModel> = new Array<AggregationModel>()
        aggregationArray.push(aggregationModel)

        let aggregations : Aggregations = {aggregations : aggregationArray}
        let f : Filter = {
            before :enddate.valueOf()/1000,
            after :startdate.valueOf()/1000
        }
        let aggregationRequest: AggregationRequest = {
            filter : f,
            aggregations : aggregations

        }

        let data: Observable<ArlasAggregation> = this.apiservice.aggregatePost(this.collection,aggregationRequest)
        return data
    }

    public getCollaborativeChangeSubject(contributor: Object): Subject<CollaborationEvent> {
        return this.collaborationBus
    }


}

