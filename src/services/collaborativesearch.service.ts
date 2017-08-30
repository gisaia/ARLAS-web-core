import { Expression } from 'arlas-api';
import { AggregationResponse, Hits, Size } from 'arlas-api';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreApi } from 'arlas-api';
import { Collaboration } from '../models/collaboration';
import { AggregationsRequest } from 'arlas-api';
import { Aggregation } from 'arlas-api';
import { Filter } from 'arlas-api';
import { FeatureCollection } from 'arlas-api';
import { Count } from 'arlas-api';
import { Search } from 'arlas-api';
import { ConfigService } from './config.service';
import { Contributor } from '../models/contributor';
import { projType } from '../models/projections';


export class CollaborativesearchService {
    /**
    * Bus of string contributor identifiers.
    */
    public collaborationBus: Subject<string> = new Subject<string>();
    /**
    * Registry of Collaborations, Map of contributor identifier,Collaboration.
    */
    public collaborations = new Map<string, Collaboration>();
    /**
    * Registry of Contributor, Map of contributor identifier,Contributor.
    */
    public registry = new Map<string, Contributor>();
    /**
    * ARLAS SERVER collection used by the collaborativesearchService.
    */
    public collection: string;
    /**
    * Number of entity return by the collaborativesearchService at any time
    */
    public countAll: number;
    /**
    * Bus number of ongoing subscribe to the collaborativesearchService
    */
    public ongoingSubscribe: Subject<number> = new Subject<number>();
    /**
    * Bus number of ongoing subscribe to the collaborativesearchService
    */
    public totalSubscribe: number = 0;
    /**
    * Bus of Error.
    */
    public collaborationErrorBus: Subject<Error> = new Subject<Error>();
    /**
    * ARLAS SERVER Explore Api used by the collaborativesearchService.
    */
    private exploreApi: ExploreApi;
    /**
    * Configuration Service used by the collaborativesearchService.
    */
    private configService: ConfigService;
    constructor() {
        this.ongoingSubscribe.subscribe(value => {
            this.totalSubscribe = this.totalSubscribe + value;
        });
        this.collaborationBus.subscribe(id => {
            this.setCountAll();
            if (id.split('-')[0] === 'remove') {
                if (id.split('-')[1] === 'all') {
                    this.collaborations.clear();
                } else {
                    this.collaborations.delete(id);
                }
            }
        });
    }
    /**
    * Return the ARLAS Explore API.
    * @returns ExploreApi.
    */
    public getExploreApi() {
        return this.exploreApi;
    }
    /**
    * Set the ARLAS Explore API.
    * @param api : ExploreApi.
    */
    public setExploreApi(exploreApi: ExploreApi) {
        this.exploreApi = exploreApi;
    }
    /**
    * Return the Configuraion Service.
    * @returns ConfigService.
    */
    public getConfigService() {
        return this.configService;
    }
    /**
    * Set the Configuraion Service.
    * @param configService ConfigService.
    */
    public setConfigService(configService: ConfigService) {
        this.configService = configService;
    }
    /**
    *  Register contributor with its identifier in the map contributor registry.
    */
    public register(identifier: string, contributor: Contributor): void {
        this.registry.set(identifier, contributor);
    }
    /**
    * Add Filter setted by a contributor in the registry of collaboration, notify the collaborationBus of a changement.
    * @param contributorId  Sting identifier of contributor.
    * @param collaboration  Collaboration added by the contributor.
    */
    public setFilter(contributorId: string, collaboration: Collaboration) {
        this.collaborations.set(contributorId, collaboration);
        collaboration.enabled = true;
        this.collaborationBus.next(contributorId);
    }
    /**
    * Remove Filter from the registry of collaboration , notify the collaborationBus of a removing changement.
    * @param contributorId  Sting identifier of contributor.
    * @param collaboration  Collaboration added by the contributor.
    */
    public removeFilter(contributorId: string) {
        this.collaborations.delete(contributorId);
        this.collaborationBus.next('remove-' + contributorId);
    }
    /**
    * Remove all the collaborations filters,  notify the collaborationBus of a all removing changement.
    */
    public removeAll() {
        this.collaborations.clear();
        this.collaborationBus.next('remove-all');
    }

    /**
    * Retrieve the filter from a contributor identifier.
    * @param contributorId  Identifier of a contributor.
    * @returns ARLAS API Filter.
    */
    public getFilter(contributorId: string): Filter {
        if (this.collaborations.get(contributorId)) {
            return this.collaborations.get(contributorId).filter;
        } else {
            return null;
        }
    }

    /**
    * Resolve an ARLAS Server request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geosearch, Search]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<FeatureCollection> | Observable<AggregationResponse> | Observable<Hits> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            if (contributorId) {
                const collaboration = this.collaborations.get(contributorId);
                if (collaboration !== undefined) {
                    if (collaboration.enabled) {
                        if (collaboration.filter) { filters.push(collaboration.filter); }
                    }
                }
            }
            if (filter) {
                filters.push(filter);
            }
            return this.computeResolve(projection, filters);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }
    /**
    * Resolve an ARLAS Server request with all the collaborations enabled in the collaboration registry
    expect for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveButNot(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geosearch, Search]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<FeatureCollection> | Observable<AggregationResponse> | Observable<Hits> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            if (contributorId) {
                this.collaborations.forEach((k, v) => {
                    if (v !== contributorId && k.enabled) {
                        if (k.filter) { filters.push(k.filter); }
                    } else {
                        return;
                    }
                });
            } else {
                this.collaborations.forEach((k, v) => {
                    if (k.enabled) {
                        if (k.filter) { filters.push(k.filter); }
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
    /**
    * Enable a contributor collaboration from its identifier.
    */
    public enable(contributorId: string) {
        this.setEnable(true, contributorId);
    }
    /**
    * Disable a contributor collaboration from its identifier.
    */
    public disable(contributorId: string) {
        this.setEnable(false, contributorId);
    }
    /**
    * Retrieve all the contributor identifiers.
    * @returns List of contributor idenfiers.
    */
    public getAllContributors(): Array<string> {
        return Array.from(this.collaborations.keys());
    }
    /**
    * Retrieve the contributor identifiers for which the collaboration is enabled.
    * @returns List of contributor idenfiers.
    */
    public getEnableContributors(): Array<string> {
        return Array.from(this.collaborations.keys()).filter(x => this.collaborations.get(x).enabled);
    }
    /**
    * Retrieve the contributor identifiers for which the collaboration is disabled.
    * @returns List of contributor idenfiers.
    */
    public getDisableContributors(): Array<string> {
        return Array.from(this.collaborations.keys()).filter(x => !this.collaborations.get(x).enabled);
    }
    /**
    * Retrieve enabled parameter of collaboration from a contributor identifier.
    * @returns Contributor collaboration enabled properties.
    */
    public isEnable(contributorId: string): boolean {
        return this.collaborations.get(contributorId).enabled;
    }
    /**
    * Update countAll property.
    */
    public setCountAll() {
        this.ongoingSubscribe.next(1);
        const result: Observable<any> = this.resolveButNot([projType.count, {}]);
        if (result) {
            result.subscribe(
                data => this.countAll = data.totalnb,
                error => {
                    this.collaborationErrorBus.next((<Error>error));
                },
                () => { this.ongoingSubscribe.next(-1); }

            );
        }

    }
    /**
    * Set enabled value of a collaboration from a contributor identifier.
    * @param enabled  Enabled collaboration value.
    * @param contributorId  Contributor identifier.
    */
    private setEnable(enabled: boolean, contributorId: string) {
        const collaboration = this.collaborations.get(contributorId);
        if (collaboration) {
            collaboration.enabled = enabled;
        }
        this.collaborations.set(contributorId, collaboration);
        this.collaborationBus.next('"all"');
    }

    /**
    * Build an ARLAS Server request from an Array of Filter
    * @param projection  Type of projection of ARLAS Server request.
    * @param filters   ARLAS API filters list to resolve the request.
    * @returns ARLAS Server observable.
    */
    private computeResolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geosearch, Search]
        | [projType.count, Count], filters: Array<Filter>
    ): Observable<FeatureCollection> | Observable<AggregationResponse> | Observable<Hits> {

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
                if (filter.pwithin) {
                    finalFilter.pwithin = filter.pwithin;

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
                result = <Observable<AggregationResponse>>this.exploreApi.aggregatePost(this.collection, aggregationRequest, 60);
                break;
            case projType.geoaggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                result = <Observable<FeatureCollection>>this.exploreApi.geoaggregatePost(this.collection, aggregationRequest, 60);
                break;
            case projType.count.valueOf():
                const count = projection[1];
                count['filter'] = finalFilter;
                result = <Observable<Hits>>this.exploreApi.countPost(this.collection, count);
                break;
            case projType.search.valueOf():
                search = projection[1];
                search['filter'] = finalFilter;
                result = <Observable<Hits>>this.exploreApi.searchPost(this.collection, search, 60);
                break;
            case projType.geosearch.valueOf():
                search = projection[1];
                search['filter'] = finalFilter;
                result = <Observable<FeatureCollection>>this.exploreApi.geosearchPost(this.collection, search);
                break;
        }
        return result;
    }
}
