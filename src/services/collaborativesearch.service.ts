import { CollaborativeSearch } from '../models/collaborativesearch';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreService } from 'arlas-api/services/explore.service';
import { AggregationModel } from "arlas-api/model/aggregationModel";
import { CollaborationEvent, eventType } from '../models/collaborationEvent';
import { AggregationRequest } from "arlas-api/model/aggregationRequest";
import { Aggregations } from "arlas-api/model/aggregations";
import { ArlasAggregation } from "arlas-api/model/arlasAggregation";
import { Filter } from 'arlas-api/model/filter';
import { FeatureCollection } from "arlas-api/model/featureCollection";
import { ArlasHits } from "arlas-api/model/arlasHits";
import { Count } from "arlas-api/model/count";
import { Search } from "arlas-api/model/search";
import { ConfigService } from './config.service';
import { Contributor } from "services/contributor";
import { getObject } from './utils';


export class CollaborativesearchService implements CollaborativeSearch {
    collaborationBus: Subject<CollaborationEvent> = new Subject<CollaborationEvent>();
    collaborationsEvents = new Map<string, CollaborationEvent>();
    apiservice: ExploreService
    configService: ConfigService
    collection: string
    constructor(private api: ExploreService, private config: ConfigService) {
        this.apiservice = api
        this.configService = config
    }
    public setFilter(collaborationEvent: CollaborationEvent) {
        this.collaborationsEvents.set(collaborationEvent.contributorId, collaborationEvent)
        this.collaborationBus.next(collaborationEvent)
    }
    public removeFilter(collaborationEvent: CollaborationEvent) {
        this.collaborationsEvents.delete(collaborationEvent.contributorId)
    }
    public removeAll() {
        this.collaborationsEvents.clear();
    }
    public resolveButNot(projection: [eventType.aggregate, Aggregations]
        | [eventType.search, Search]
        | [eventType.geoaggregate, Aggregations]
        | [eventType.geosearch, Search]
        | [eventType.count, Count],
        contributorId?: string
      ): Observable<any> {
        let filters: Array<Filter> = new Array<Filter>()
        let aggregationsModels: Array<AggregationModel> = new Array<AggregationModel>()
        if (contributorId) {
            this.collaborationsEvents.forEach((k, v) => {
                if (v != contributorId) {
                    this.feedParams(k, filters)
                } else {
                    return
                }
            })
        } else {
            this.collaborationsEvents.forEach((k, v) => {
                this.feedParams(k, filters)
            })
        }
        let filter: Filter = {};
        let f: Array<string> = new Array<string>()
        let q: string = "";
        let before: number = 0;
        let after: number = 0;
        filters.forEach(filter => {
            if (filter) {
                if (filter.f) {
                    filter.f.forEach(filt => {
                        if (f.indexOf(filt) < 0) {
                            f.push(filt)
                        }
                    }
                    )
                }
                if (filter.q) { q = q + filter.q + " " }
                if (filter.before) {
                    if (before == 0) {
                        before = filter.before
                    } else if (filter.before <= before) {
                        before = filter.before
                    }
                }
                if (filter.after) {
                    if (after == 0) {
                        after = filter.after
                    } else if (filter.after >= after) {
                        after = filter.after
                    }
                }
            }
        })
        if (f.length > 0) {
            filter.f = f;
        }
        if (q != "") {
            filter.q = q;
        }
        if (before != 0) {
            filter.before = before;
        }
        if (after != 0) {
            filter.after = after;
        }
        let aggregationRequest: AggregationRequest;
        let search: Search;
        let result;
        switch (projection[0]) {
            case eventType.aggregate.valueOf():
                aggregationRequest = <AggregationRequest>{
                    filter: filter,
                    aggregations: projection[1]
                }
                result = <Observable<ArlasAggregation>>this.apiservice.aggregatePost(this.collection, aggregationRequest);
                break;
            case eventType.geoaggregate.valueOf():
                aggregationRequest;
                aggregationRequest = <AggregationRequest>{
                    filter: filter,
                    aggregations: projection[1]
                }
                result = <Observable<FeatureCollection>>this.apiservice.geoaggregatePost(this.collection, aggregationRequest)
                break;

            case eventType.count.valueOf():
                let count = projection[1]
                count["filter"] = filter
                result = this.apiservice.countPost(this.collection, count)
                break;

            case eventType.search.valueOf():
                search = projection[1]
                search["filter"] = filter
                result = <Observable<ArlasHits>>this.apiservice.searchPost(this.collection, search)
                break;

            case eventType.geosearch.valueOf():
                search = projection[1]
                search["filter"] = filter
                result = <Observable<FeatureCollection>>this.apiservice.geosearchPost(this.collection, search)
                break;

        }
        return result
    }
    feedParams(k, filters) {
        if (k.detail) { filters.push(k.detail) }
    }
}
