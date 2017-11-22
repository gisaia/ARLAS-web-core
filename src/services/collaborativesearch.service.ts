import { Expression, Sort } from 'arlas-api';
import { AggregationResponse, Hits, Size } from 'arlas-api';
import { Observable, Subject } from 'rxjs/Rx';
import { ExploreApi } from 'arlas-api';
import { Collaboration, CollaborationEvent, OperationEnum } from '../models/collaboration';
import { AggregationsRequest } from 'arlas-api';
import { Aggregation } from 'arlas-api';
import { Filter } from 'arlas-api';
import { FeatureCollection } from 'arlas-api';
import { Count } from 'arlas-api';
import { Search } from 'arlas-api';
import { ConfigService } from './config.service';
import { Contributor } from '../models/contributor';
import { projType, GeohashAggregation, TiledSearch } from '../models/projections';


export class CollaborativesearchService {
    /**
    * Bus of CollaborationEvent.
    */
    public collaborationBus: Subject<CollaborationEvent> = new Subject<CollaborationEvent>();

    /**
    * Bus of CollaborationEvent.
    */
    public contribFilterBus: Subject<Contributor> = new Subject<Contributor>();
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
    * ARLAS SERVER max age cache used by the collaborativesearchService.
    */
    public max_age = 60;
    /**
    * Number of entity return by the collaborativesearchService at any time
    */
    public countAll: Observable<number>;
    /**
    * Bus number of ongoing subscribe to the collaborativesearchService
    */
    public ongoingSubscribe: Subject<number> = new Subject<number>();
    /**
    * Bus number of ongoing subscribe to the collaborativesearchService
    */
    public totalSubscribe = 0;
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
        /**
        * Subscribe ongoingSubscribe bus to know how many subscribe are on going.
        */
        this.ongoingSubscribe.subscribe(value => {
            this.totalSubscribe = this.totalSubscribe + value;
        });
        /**
        * Subscribe collaborationBus bus to set countAll and remove collaboration.
        */
        this.collaborationBus.subscribe(collaborationEvent => {
            this.setCountAll();
            if (collaborationEvent.operation === OperationEnum.remove) {
                if (collaborationEvent.all) {
                    this.collaborations.clear();
                } else {
                    this.collaborations.delete(collaborationEvent.id);
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
        collaboration.enabled = true;
        this.collaborations.set(contributorId, collaboration);
        const collaborationEvent: CollaborationEvent = {
            id: contributorId,
            operation: OperationEnum.add,
            all: false
        };
        this.collaborationBus.next(collaborationEvent);
    }
    /**
    * Remove Filter from the registry of collaboration , notify the collaborationBus of a removing changement.
    * @param contributorId  Sting identifier of contributor.
    * @param collaboration  Collaboration added by the contributor.
    */
    public removeFilter(contributorId: string) {
        this.collaborations.delete(contributorId);
        const collaborationEvent: CollaborationEvent = {
            id: contributorId,
            operation: OperationEnum.remove,
            all: false
        };
        this.collaborationBus.next(collaborationEvent);
    }
    /**
    * Remove all the collaborations filters,  notify the collaborationBus of a all removing changement.
    */
    public removeAll() {
        this.collaborations.clear();
        const collaborationEvent: CollaborationEvent = {
            id: 'all',
            operation: OperationEnum.remove,
            all: true
        };
        this.collaborationBus.next(collaborationEvent);
    }

    public dataModelBuilder(filter: string): Object {
        const dataModel = JSON.parse(filter);
        return dataModel;
    }

    public urlBuilder(): string {
        const dataModel = {};
        Array.from(this.collaborations.keys()).forEach(identifier => {
            dataModel[identifier] = this.collaborations.get(identifier);
        });
        const url = 'filter=' + JSON.stringify(dataModel);
        return url;
    }

    /**
    * Initialize all the contributor in the state of dataModel.
    * @param dataModel
    */
    public setCollaborations(dataModel: Object) {
        this.collaborations.clear();
        Array.from(this.registry.keys()).forEach(identifier => {
            if (dataModel[identifier] !== undefined) {
                const collaboration: Collaboration = dataModel[identifier];
                this.collaborations.set(identifier, collaboration);
            }
        });
        const collaborationEvent: CollaborationEvent = {
            id: 'url',
            operation: OperationEnum.add,
            all: true
        };
        this.collaborationBus.next(collaborationEvent);
    }

    /**
    * Retrieve the collaboration from a contributor identifier.
    * @param contributorId  Identifier of a contributor.
    * @returns Collaboration.
    */
    public getCollaboration(contributorId: string): Collaboration {
        if (this.collaborations.get(contributorId)) {
            return this.collaborations.get(contributorId);
        } else {
            return null;
        }
    }
    /**
    * Resolve an ARLAS Server Search or Count request with all the collaborations enabled in the collaboration registry
    expect for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Search or Count.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveButNotHits(projection:
        [projType.search, Search]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<Hits> {
        return this.resolveButNot(projection, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Search or Count  request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Search or Count .
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveHits(projection:
        [projType.search, Search]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<Hits> {
        return this.resolve(projection, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Geosearch or Geoaggregate request with all the collaborations enabled in the collaboration registry
    expect for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Geosearch or Geoaggregate.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveButNotFeatureCollection(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>],
        contributorId?: string, filter?: Filter
    ): Observable<FeatureCollection> {
        return this.resolveButNot(projection, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Geosearch or Geoaggregate  request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Geosearch or Geoaggregate.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveFeatureCollection(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>],
        contributorId?: string, filter?: Filter
    ): Observable<FeatureCollection> {
        return this.resolve(projection, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Aggregation request with all the collaborations enabled in the collaboration registry
    expect for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Aggregation.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveButNotAggregation(projection:
        [projType.aggregate, Array<Aggregation>],
        contributorId?: string, filter?: Filter
    ): Observable<AggregationResponse> {
        return this.resolveButNot(projection, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Aggregation request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Aggregation.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveAggregation(projection:
        [projType.aggregate, Array<Aggregation>],
        contributorId?: string, filter?: Filter
    ): Observable<AggregationResponse> {
        return this.resolve(projection, contributorId, filter);
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
        const result: Observable<Hits> = this.resolveButNot([projType.count, {}]);
        this.countAll = result.map(c => c.totalnb);
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
        const collaborationEvent: CollaborationEvent = {
            id: 'all',
            operation: OperationEnum.add,
            all: true
        };
        this.collaborationBus.next(collaborationEvent);
    }
    /**
    * Resolve an ARLAS Server request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    private resolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<any> {
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
    private resolveButNot(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count],
        contributorId?: string, filter?: Filter
    ): Observable<any> {
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
    * Build an ARLAS Server request from an Array of Filter
    * @param projection  Type of projection of ARLAS Server request.
    * @param filters   ARLAS API filters list to resolve the request.
    * @returns ARLAS Server observable.
    */
    private computeResolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count], filters: Array<Filter>
    ): Observable<any> {
        const finalFilter: Filter = {};
        const f: Array<Expression> = new Array<Expression>();
        let q = '';
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

        let aggregationRequest: AggregationsRequest;
        let aggregationsForGet: string[];
        let search: Search;
        let includes: string[] = [];
        let excludes: string[] = [];
        let result;
        const fForGet = this.buildFilterFieldGetParam('f', finalFilter);
        const qForGet = this.buildFilterFieldGetParam('q', finalFilter);
        const pwithinForGet = [this.buildFilterFieldGetParam('pwithin', finalFilter)];
        const gwithinForGet = [this.buildFilterFieldGetParam('gwithin', finalFilter)];
        const gintersectForGet = [this.buildFilterFieldGetParam('gintersect', finalFilter)];
        const notpwithinForGet = [this.buildFilterFieldGetParam('notpwithin', finalFilter)];
        const notgwithinForGet = [this.buildFilterFieldGetParam('notgwithin', finalFilter)];
        const notgintersectForGet = [this.buildFilterFieldGetParam('notgintersect', finalFilter)];
        switch (projection[0]) {
            case projType.aggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<AggregationResponse>>this.exploreApi.aggregate(this.collection, aggregationsForGet,
                    fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, this.max_age, null);
                break;
            case projType.geoaggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<FeatureCollection>>this.exploreApi.geoaggregate(this.collection, aggregationsForGet,
                    fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, this.max_age, null);
                break;
            case projType.geohashgeoaggregate.valueOf():
                const aggregations: Array<Aggregation> = (<GeohashAggregation>projection[1]).aggregations;
                const geohash = (<GeohashAggregation>projection[1]).geohash;
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: aggregations
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<FeatureCollection>>this.exploreApi.geohashgeoaggregate(this.collection, geohash, aggregationsForGet,
                    fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, this.max_age, null);
                break;
            case projType.count.valueOf():
                result = <Observable<Hits>>this.exploreApi.count(this.collection, fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, this.max_age, null);
                break;
            case projType.search.valueOf():
                search = <Search>projection[1];
                includes = [];
                excludes = [];
                if (search.projection !== undefined) {
                    if (search.projection.excludes !== undefined) {
                        excludes.push(search.projection.excludes);
                    } if (search.projection.includes !== undefined) {
                        includes.push(search.projection.includes);
                    }
                }
                let sort: string;
                if (search.sort === undefined) {
                    sort = null;
                } else {
                    if (search.sort.sort === undefined) {
                        sort = null;
                    } else {
                        sort = search.sort.sort;
                    }
                }
                result = <Observable<Hits>>this.exploreApi.search(this.collection, fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, includes, excludes, search.size.size,
                    search.size.from, sort, this.max_age);
                break;
            case projType.geosearch.valueOf():
                search = <Search>projection[1];
                includes = [];
                excludes = [];
                if (search.projection !== undefined) {
                    if (search.projection.excludes !== undefined) {
                        excludes.push(search.projection.excludes);
                    } if (search.projection.includes !== undefined) {
                        includes.push(search.projection.includes);
                    }
                }
                result = <Observable<FeatureCollection>>this.exploreApi.geosearch(this.collection, fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, includes, excludes, search.size.size,
                    search.size.from, null, this.max_age);
                break;
            case projType.tiledgeosearch.valueOf():
                search = (<TiledSearch>projection[1]).search;
                const x = (<TiledSearch>projection[1]).x;
                const y = (<TiledSearch>projection[1]).y;
                const z = (<TiledSearch>projection[1]).z;
                includes = [];
                excludes = [];
                if (search.projection !== undefined) {
                    if (search.projection.excludes !== undefined) {
                        excludes.push(search.projection.excludes);
                    } if (search.projection.includes !== undefined) {
                        includes.push(search.projection.includes);
                    }
                }
                result = <Observable<FeatureCollection>>this.exploreApi.tiledgeosearch(this.collection, x, y, z
                    , fForGet, qForGet
                    , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                    , notgwithinForGet, notgintersectForGet, false, includes, excludes,
                    search.size.size, search.size.from, null, this.max_age);
                break;
        }
        return result;
    }

    /**
    * Build an AggregationsRequest String[] for get mode request
    * @param aggregationRequest  AggregationsRequest arlas object use in post request.
    * @returns aggregations as string[].
    */
    private buildAggGetParam(aggregationRequest: AggregationsRequest): string[] {
        const aggregations: string[] = [];
        aggregationRequest.aggregations.forEach(agg => {
            let aggregation = agg.type + ':' + agg.field;
            if (agg.interval !== undefined) {
                if (agg.interval.value !== undefined) {
                    aggregation = aggregation + ':interval-' + agg.interval.value;
                }
                if (agg.interval.unit !== undefined) {
                    aggregation = aggregation + agg.interval.unit;
                }
            }
            if (agg.format !== undefined) {
                aggregation = aggregation + ':format-' + agg.format;
            }
            if (agg.collectField !== undefined) {
                aggregation = aggregation + ':collect_field-' + agg.collectField;
            }
            if (agg.collectFct !== undefined) {
                aggregation = aggregation + ':collect_fct-' + agg.collectFct;
            }
            if (agg.order !== undefined) {
                aggregation = aggregation + ':order-' + agg.order;
            }
            if (agg.size !== undefined) {
                aggregation = aggregation + ':size-' + agg.size;
            }
            if (agg.withGeoCentroid !== undefined) {
                aggregation = aggregation + ':withGeoCentroid-' + agg.withGeoCentroid;
            }
            if (agg.include !== undefined) {
                aggregation = aggregation + ':include-' + agg.include;
            }
            aggregations.push(aggregation);
        });
        return aggregations;
    }

    /**
    * Build an filter String[] or string for get mode request
    * @param field
    * @param filter
    * @returns aggregations as string[].
    */
    private buildFilterFieldGetParam(field: string, filter: Filter): any {
        if (field === 'f') {
            const f: string[] = [];
            if (filter.f !== undefined) {
                filter.f.forEach(e => {
                    f.push(e.field + ':' + e.op + ':' + e.value);
                });
            }
            return f;
        } else {
            return filter[field];
        }
    }
}
