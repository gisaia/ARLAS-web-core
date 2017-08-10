import { Expression } from 'arlas-api/model/Expression';
import { AggregationResponse, Hits, Size } from 'arlas-api';
import { CollaborativeSearch, projType } from '../models/collaborativesearch';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreApi } from 'arlas-api/api/exploreapi';
import { Collaboration } from '../models/collaboration';
import { AggregationsRequest } from 'arlas-api/model/aggregationsRequest';
import { Aggregation } from 'arlas-api/model/aggregation';
import { Filter } from 'arlas-api/model/filter';
import { FeatureCollection } from 'arlas-api/model/featureCollection';
import { Count } from 'arlas-api/model/count';
import { Search } from 'arlas-api/model/search';
import { ConfigService } from './config.service';
import { Contributor } from './contributor';
import { getObject } from './utils';

export class CollaborativesearchService implements CollaborativeSearch {
    public collaborationBus: Subject<string> = new Subject<string>();
    public collaborations = new Map<string, Collaboration>();
    public registry = new Map<string, Contributor>();
    public apiservice: ExploreApi;
    public configService: ConfigService;
    public collection: string;
    public countAllBus: Subject<number> = new Subject<number>();
    public collaborationErrorBus: Subject<Error> = new Subject<Error>();
    constructor(private api: ExploreApi, private config: ConfigService) {
        this.apiservice = api;
        this.configService = config;
    }

    public register(identifier:string,contributor:Contributor):void{
        this.registry.set(identifier,contributor);
    }
    public setFilter(contributorId: string, collaboration: Collaboration) {
        this.collaborations.set(contributorId, collaboration);
        collaboration.enabled = true;
        this.collaborationBus.next(contributorId);
    }
    public removeFilter(contributorId: string) {
        this.collaborations.delete(contributorId);
        this.collaborationBus.next('all');
    }
    public removeAll() {
        this.collaborations.clear();
        this.collaborationBus.next('all');
    }

    public getFilter(contributorId): Filter {
        if (this.collaborations.get(contributorId)) {
            return this.collaborations.get(contributorId).filter;
        } else {
            return null;
        }
    }

    public resolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geosearch, Search]
        | [projType.count, Count],
        contributorId: string
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            const collaboration = this.collaborations.get(contributorId);
            if (collaboration !== undefined) {
                if (collaboration.enabled) {
                    this.feedParams(collaboration, filters);
                }
            }
            return this.computeResolve(projection, filters);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }

    public resolveButNot(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geosearch, Search]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            if (contributorId) {
                this.collaborations.forEach((k, v) => {
                    if (v !== contributorId && k.enabled) {
                        this.feedParams(k, filters);
                    } else {
                        return;
                    }
                });
            } else {
                this.collaborations.forEach((k, v) => {
                    if (k.enabled) {
                        this.feedParams(k, filters);
                    }
                });
            }

            if (filter) {
                filters.push(filter);
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
        return Array.from(this.collaborations.keys());
    }

    public getEnableContributors(): Array<string> {
        return Array.from(this.collaborations.keys()).filter(x => this.collaborations.get(x).enabled);

    }
    public getDisableContributors(): Array<string> {
        return Array.from(this.collaborations.keys()).filter(x => !this.collaborations.get(x).enabled);
    }

    public isEnable(contributorId: string): boolean {
        return this.collaborations.get(contributorId).enabled;
    }

    private setEnable(enabled: boolean, contributorId: string) {
        const collaboration = this.collaborations.get(contributorId);
        if (collaboration) {
            collaboration.enabled = enabled;
        }
        this.collaborations.set(contributorId, collaboration);
        this.collaborationBus.next('"all"');

    }

    private feedParams(k: Collaboration, filters) {
        if (k.filter) { filters.push(k.filter); }
    }

    private nextCountAll() {
        const result: Observable<Hits> = this.resolveButNot([projType.count, {}]);
        result.subscribe(
            data => this.countAllBus.next(data.totalnb),
            error => {
                this.collaborationErrorBus.next((<Error>error));
            }
        );
    }

    private computeResolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geosearch, Search]
        | [projType.count, Count], filters: Array<Filter>
    ): Observable<any> {

        const finalFilter: Filter = {};
        const f: Array<Expression> = new Array<Expression>();
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
        let aggregationRequest: AggregationsRequest;
        let search: Search;
        let result;
        switch (projection[0]) {
            case projType.aggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                result = <Observable<AggregationResponse>>this.apiservice.aggregatePost(this.collection, aggregationRequest);
                this.nextCountAll();
                break;
            case projType.geoaggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                result = <Observable<FeatureCollection>>this.apiservice.geoaggregatePost(this.collection, aggregationRequest);
                this.nextCountAll();
                break;
            case projType.count.valueOf():
                const count = projection[1];
                count['filter'] = finalFilter;
                result = <Observable<Hits>>this.apiservice.countPost(this.collection, count);
                break;
            case projType.search.valueOf():
                search = projection[1];
                search['filter'] = finalFilter;
                result = <Observable<Hits>>this.apiservice.searchPost(this.collection, search);
                this.nextCountAll();
                break;
            case projType.geosearch.valueOf():
                search = projection[1];
                search['filter'] = finalFilter;
                result = <Observable<FeatureCollection>>this.apiservice.geosearchPost(this.collection, search);
                this.nextCountAll();
                break;
        }
        return result;
    }
}
