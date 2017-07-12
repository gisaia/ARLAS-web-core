import { CollaborativeSearch } from '../models/collaborativesearch';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreService } from 'api-arlas/services/explore.service';
import { AggregationModel } from "api-arlas/model/aggregationModel";
import { CollaborationEvent, eventType } from '../models/collaborationEvent';
import { AggregationRequest } from "api-arlas/model/aggregationRequest";
import { Aggregations } from "api-arlas/model/aggregations";
import { ArlasAggregation } from "api-arlas/model/arlasAggregation";
import { Filter } from 'api-arlas/model/filter';
import { FeatureCollection } from "api-arlas/model/featureCollection";
import { ArlasHits } from "api-arlas/model/arlasHits";
import { Count } from "api-arlas/model/count";
import { Search } from "api-arlas/model/search";


export class CollaborativesearchService implements CollaborativeSearch {
    collaborationBus: Subject<CollaborationEvent> = new Subject<CollaborationEvent>();
    contributions = new Set<CollaborationEvent>();
    apiservice: ExploreService
    constructor(private api: ExploreService, private collection: string) {
        this.apiservice = api
    }
    public setFilter(collaborationEvent: CollaborationEvent) {
        this.contributions.add(collaborationEvent)
        this.collaborationBus.next(collaborationEvent)
    }
    public removeFilter(collaborationEvent: CollaborationEvent) {
        this.contributions.delete(collaborationEvent)
    }
    public removeAll() {
        this.contributions = new Set<CollaborationEvent>();
    }
    public resolveButNot(projection: any, contributor?: Object): Observable<any> {
        let filters: Array<Filter> = new Array<Filter>()
        let aggregationsModels: Array<AggregationModel> = new Array<AggregationModel>()
        if (contributor) {
            this.contributions.forEach((k) => {
                if (k.contributor != contributor) {
                    if (k.detail.filter) { filters.push(k.detail.filter) }
                    if (k.detail.search) { filters.push(k.detail.search.filter) }
                    if (k.detail.count) { filters.push(k.detail.count.filter) }
                    if (k.detail.aggregationRequest) { filters.push(k.detail.aggregationRequest.filter) }
                    if (k.detail.aggregationRequest) {
                        if (k.detail.aggregationRequest.aggregations.aggregations) {
                            k.detail.aggregationRequest.aggregations.aggregations.forEach(agg => {
                                if (aggregationsModels.lastIndexOf(agg) < 0) {
                                    aggregationsModels.push(agg)

                                }
                            })
                        }
                    }

                } else {
                    return
                }
            })
        } else {
            this.contributions.forEach((k) => {
                if (k.detail.filter) { filters.push(k.detail.filter) }
                if (k.detail.search) { filters.push(k.detail.search.filter) }
                if (k.detail.count) { filters.push(k.detail.count.filter) }
                if (k.detail.aggregationRequest) { filters.push(k.detail.aggregationRequest.filter) }
                if (k.detail.aggregationRequest) {
                    if (k.detail.aggregationRequest.aggregations.aggregations) {
                        k.detail.aggregationRequest.aggregations.aggregations.forEach(agg => {
                            if (aggregationsModels.lastIndexOf(agg) < 0) {
                                aggregationsModels.push(agg)

                            }
                        })
                    }
                }
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

        let aggregations: Aggregations = { aggregations: aggregationsModels }
        let aggregationRequest: AggregationRequest = {
            filter: filter,
            aggregations: aggregations
        }
        let count: Count = { filter: filter }
        let search: Search = { filter: filter }
        switch (projection) {
            case eventType.aggregate:
                let aggregResult: Observable<ArlasAggregation> = this.apiservice.aggregatePost(this.collection, aggregationRequest)
                return aggregResult;
            case eventType.geoaggregate:
                let geoaggregResult: Observable<FeatureCollection> = this.apiservice.geoaggregatePost(this.collection, aggregationRequest)
                return geoaggregResult;
            case eventType.count:
                let countResult: Observable<ArlasHits> = this.apiservice.countPost(this.collection, count)
                return countResult
            case eventType.search:
                let searchResult: Observable<ArlasHits> = this.apiservice.searchPost(this.collection, search)
                return searchResult;
            case eventType.geosearch:
                let geosearchResult: Observable<FeatureCollection> = this.apiservice.geosearchPost(this.collection, search)
                return geosearchResult;

        }
    }
}

