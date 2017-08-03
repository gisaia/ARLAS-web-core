import { tryCatch } from 'rxjs/util/tryCatch';
import { Size } from 'arlas-api';
import { CollaborativeSearch } from '../models/collaborativesearch';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreService } from 'arlas-api/services/explore.service';
import { AggregationModel } from 'arlas-api/model/aggregationModel';
import { CollaborationEvent, eventType } from '../models/collaborationEvent';
import { AggregationRequest } from 'arlas-api/model/aggregationRequest';
import { Aggregations } from 'arlas-api/model/aggregations';
import { ArlasAggregation } from 'arlas-api/model/arlasAggregation';
import { Filter } from 'arlas-api/model/filter';
import { FeatureCollection } from 'arlas-api/model/featureCollection';
import { ArlasHits } from 'arlas-api/model/arlasHits';
import { Count } from 'arlas-api/model/count';
import { Search } from 'arlas-api/model/search';
import { ConfigService } from './config.service';
import { Contributor } from 'services/contributor';
import { getObject } from './utils';

export class CollaborativesearchService implements CollaborativeSearch {
    public collaborationBus: Subject<CollaborationEvent> = new Subject<CollaborationEvent>();
    public collaborationsEvents = new Map<string, CollaborationEvent>();
    public apiservice: ExploreService;
    public configService: ConfigService;
    public collection: string;
    public countAllBus: Subject<number> = new Subject<number>();
    public collaborationErrorBus: Subject<Error> = new Subject<Error>();
    constructor(private api: ExploreService, private config: ConfigService) {
        this.apiservice = api;
        this.configService = config;
    }
    public setFilter(collaborationEvent: CollaborationEvent) {
        this.collaborationsEvents.set(collaborationEvent.contributorId, collaborationEvent);
        collaborationEvent.enabled = true;
        this.collaborationBus.next(collaborationEvent);
    }
    public removeFilter(collaborationEvent: CollaborationEvent) {
        this.collaborationsEvents.delete(collaborationEvent.contributorId);
    }
    public removeAll() {
        this.collaborationsEvents.clear();
    }

    public resolve(projection: [eventType.aggregate, Aggregations]
        | [eventType.search, Search]
        | [eventType.geoaggregate, Aggregations]
        | [eventType.geosearch, Search]
        | [eventType.count, Count],
        contributorId: string
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            const collaborationEvent = this.collaborationsEvents.get(contributorId);
            if (collaborationEvent !== undefined) {
                if (collaborationEvent.enabled) {
                    this.feedParams(collaborationEvent, filters);
                }
            }
            return this.computeResolve(projection, filters);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }

    public resolveReplaceFilter(projection: [eventType.aggregate, Aggregations]
        | [eventType.search, Search]
        | [eventType.geoaggregate, Aggregations]
        | [eventType.geosearch, Search]
        | [eventType.count, Count],
        contributorId: string, filter: Filter
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            const collaborationEvent = this.collaborationsEvents.get(contributorId);
            this.collaborationsEvents.forEach((k, v) => {
                if (v !== contributorId && k.enabled) {
                    this.feedParams(k, filters);
                } else {
                    return;
                }
            });
            filters.push(filter);
            return this.computeResolve(projection, filters);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }

    public resolveButNot(projection: [eventType.aggregate, Aggregations]
        | [eventType.search, Search]
        | [eventType.geoaggregate, Aggregations]
        | [eventType.geosearch, Search]
        | [eventType.count, Count],
        contributorId?: string
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            const aggregationsModels: Array<AggregationModel> = new Array<AggregationModel>();
            if (contributorId) {
                this.collaborationsEvents.forEach((k, v) => {
                    if (v !== contributorId && k.enabled) {
                        this.feedParams(k, filters);
                    } else {
                        return;
                    }
                });
            } else {
                this.collaborationsEvents.forEach((k, v) => {
                    if (k.enabled) {
                        this.feedParams(k, filters);
                    }
                });
            }
            return this.computeResolve(projection, filters);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }


    public enable(contributorId: string) {
        this.setEnable(true, contributorId);
    }

    public disable(contributorId: string) {
        this.setEnable(false, contributorId);
    }

    public getAllContributors(): Array<string> {
        return Array.from(this.collaborationsEvents.keys());
    }

    public getEnableContributors(): Array<string> {
        return Array.from(this.collaborationsEvents.keys()).filter(x => this.collaborationsEvents.get(x).enabled);

    }
    public getDisableContributors(): Array<string> {
        return Array.from(this.collaborationsEvents.keys()).filter(x => !this.collaborationsEvents.get(x).enabled);
    }

    public isEnable(contributorId: string): boolean {
        return this.collaborationsEvents.get(contributorId).enabled;
    }

    private setEnable(enabled: boolean, contributorId: string) {
        const collaborationEvent = this.collaborationsEvents.get(contributorId);
        if (collaborationEvent) {
            collaborationEvent.enabled = enabled;
        }
    }

    private feedParams(k, filters) {
        if (k.detail) { filters.push(k.detail); }
    }

    private nextCountAll() {
        const result: Observable<ArlasHits> = this.resolveButNot([eventType.count, {}]);
        result.subscribe(
            data => this.countAllBus.next(data.totalnb),
            error => {
                this.collaborationErrorBus.next((<Error>error));
            }
        );
    }

    private computeResolve(projection: [eventType.aggregate, Aggregations]
        | [eventType.search, Search]
        | [eventType.geoaggregate, Aggregations]
        | [eventType.geosearch, Search]
        | [eventType.count, Count], filters: Array<Filter>
    ): Observable<any> {

        const finalFilter: Filter = {};
        const f: Array<string> = new Array<string>();
        let q = '';
        let before = 0;
        let after = 0;
        filters.forEach(filter => {
            if (filter) {
                if (filter.f) {
                    filter.f.forEach(filt => {
                        if (f.indexOf(filt) < 0) {
                            f.push(filt);
                        }
                    });
                }
                if (filter.q) {
                    q = q + filter.q + ' ';
                }
                if (filter.before) {
                    if (before === 0) {
                        before = filter.before;
                    } else if (filter.before <= before) {
                        before = filter.before;
                    }
                }
                if (filter.after) {
                    if (after === 0) {
                        after = filter.after;
                    } else if (filter.after >= after) {
                        after = filter.after;
                    }
                }
            }
        });
        if (f.length > 0) {
            finalFilter.f = f;
        }
        if (q !== '') {
            finalFilter.q = q;
        }
        if (before !== 0) {
            finalFilter.before = before;
        }
        if (after !== 0) {
            finalFilter.after = after;
        }
        let aggregationRequest: AggregationRequest;
        let search: Search;
        let result;
        switch (projection[0]) {
            case eventType.aggregate.valueOf():
                aggregationRequest = <AggregationRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                result = <Observable<ArlasAggregation>>this.apiservice.aggregatePost(this.collection, aggregationRequest);
                this.nextCountAll();
                break;
            case eventType.geoaggregate.valueOf():
                aggregationRequest = <AggregationRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                result = <Observable<FeatureCollection>>this.apiservice.geoaggregatePost(this.collection, aggregationRequest);
                this.nextCountAll();
                break;
            case eventType.count.valueOf():
                const count = projection[1];
                count['filter'] = finalFilter;
                result = <Observable<ArlasHits>>this.apiservice.countPost(this.collection, count);
                break;
            case eventType.search.valueOf():
                search = projection[1];
                search['filter'] = finalFilter;
                result = <Observable<ArlasHits>>this.apiservice.searchPost(this.collection, search);
                this.nextCountAll();
                break;
            case eventType.geosearch.valueOf():
                search = projection[1];
                search['filter'] = finalFilter;
                result = <Observable<FeatureCollection>>this.apiservice.geosearchPost(this.collection, search);
                this.nextCountAll();
                break;
        }
        return result;
    }
}
