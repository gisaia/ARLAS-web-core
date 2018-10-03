/*
 * Licensed to Gisaïa under one or more contributor
 * license agreements. See the NOTICE.txt file distributed with
 * this work for additional information regarding copyright
 * ownership. Gisaïa licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
    Aggregation, AggregationResponse, AggregationsRequest,
    CollectionReferenceDescription, Count, ExploreApi, Expression,
    FeatureCollection, Filter, Hits, Search, WriteApi, TagRequest, UpdateResponse, RangeRequest, RangeResponse, Metric
} from 'arlas-api';
import { Observable, Subject } from 'rxjs/Rx';
import { Collaboration, CollaborationEvent, OperationEnum } from '../models/collaboration';
import { Contributor } from '../models/contributor';
import { GeohashAggregation, TiledSearch, projType } from '../models/projections';
import { ConfigService } from './config.service';

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
    * ARLAS SERVER Write Api used by the collaborativesearchService.
    */
    private writeApi: WriteApi;
    /**
    * Configuration Service used by the collaborativesearchService.
    */
    private configService: ConfigService;
    /**
    * Configuration object of fetch call. By default all credentials are included.
    */
    private fetchOptions = {
        credentials: 'include'
    };
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
            this.setCountAll(this.collaborations);
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
    * Return options used to fetch call.
    * @returns Object.
    */
    public getFetchOptions() {
        return this.fetchOptions;
    }
    /**
    * Set the fetch options.
    * @param fetchOptions : Object.
    */
    public setFetchOptions(fetchOptions: any) {
        this.fetchOptions = fetchOptions;
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
    * Return the ARLAS Write API.
    * @returns WriteApi.
    */
    public getWriteApi() {
        return this.writeApi;
    }
    /**
    * Set the ARLAS Write API.
    * @param api : WriteApi.
    */
    public setWriteApi(writeApi: WriteApi) {
        this.writeApi = writeApi;
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
        | [projType.count, Count], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter
    ): Observable<Hits> {
        return this.resolveButNot(projection, collaborations, contributorId, filter);
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
        | [projType.count, Count], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter
    ): Observable<Hits> {
        return this.resolve(projection, collaborations, contributorId, filter);
    }

    /**
    * Resolve an ARLAS Server Search or Count  request for an array of filter.
    * @param projection  Type of projection of ARLAS Server request :Search or Count .
    * @param filters  ARLAS API filters to resolve the request with compute
    * @returns ARLAS Server observable.
    */
    public resolveComputeHits(projection:
        [projType.search, Search]
        | [projType.count, Count],
        filters: Array<Filter>
    ): Observable<Hits> {
        return this.computeResolve(projection, filters);
    }

    /**
    * Resolve an ARLAS Server Geosearch or Geoaggregate request with all the collaborations enabled in the collaboration registry
    expect for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Geosearch or Geoaggregate.
    * @param isFlat  Boolean option to isFlat output geojson properties.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveButNotFeatureCollection(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>, isFlat = true,
        contributorId?: string, filter?: Filter
    ): Observable<FeatureCollection> {
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat);
    }
    /**
    * Resolve an ARLAS Server Geosearch or Geoaggregate  request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Geosearch or Geoaggregate.
    * @param isFlat  Boolean option to flat output geojson properties.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveFeatureCollection(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>], isFlat = true, collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter
    ): Observable<FeatureCollection> {
        return this.resolve(projection, collaborations, contributorId, filter, isFlat);
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
        [projType.aggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter
    ): Observable<AggregationResponse> {
        return this.resolveButNot(projection, collaborations, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Aggregation request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Aggregation.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveAggregation(projection:
        [projType.aggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter
    ): Observable<AggregationResponse> {
        return this.resolve(projection, collaborations, contributorId, filter);
    }
    /**
    * Resolve an ARLAS Server Range request with all the collaborations enabled in the collaboration registry
    expect for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Aggregation.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @returns ARLAS Server observable.
    */
    public resolveButNotFieldRange(projection:
        [projType.range, RangeRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter
    ): Observable<RangeResponse> {
        return this.resolveButNot(projection, collaborations, contributorId, filter);
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
    public setCountAll(collaborations: Map<string, Collaboration>, ) {
        const result: Observable<Hits> = this.resolveButNot([projType.count, {}], collaborations);
        this.countAll = result.map(c => c.totalnb);
    }

    /**
     * Build query parameters from aggregation and filters
     * @return Url encoded string
     */
    public getUrl(
        projection: [
            projType.geoaggregate | projType.geosearch | projType.aggregate |
            projType.count | projType.geohashgeoaggregate | projType.search | projType.tiledgeosearch,
            Array<Aggregation>
        ],
        filters: Array<Filter>): string {

        const finalFilter = this.getFinalFilter(filters);
        let aggregationRequest: AggregationsRequest;
        let aggregationsForGet: string[];

        const fForGet = this.buildFilterFieldGetParam('f', finalFilter);
        const qForGet = this.buildFilterFieldGetParam('q', finalFilter);
        const pwithinForGet = this.buildFilterFieldGetParam('pwithin', finalFilter);
        const gwithinForGet = this.buildFilterFieldGetParam('gwithin', finalFilter);
        const gintersectForGet = this.buildFilterFieldGetParam('gintersect', finalFilter);
        const notpwithinForGet = this.buildFilterFieldGetParam('notpwithin', finalFilter);
        const notgwithinForGet = this.buildFilterFieldGetParam('notgwithin', finalFilter);
        const notgintersectForGet = this.buildFilterFieldGetParam('notgintersect', finalFilter);

        const queryParameters = new URLSearchParams();
        aggregationRequest = <AggregationsRequest>{
            filter: finalFilter,
            aggregations: projection[1]
        };
        aggregationsForGet = this.buildAggGetParam(aggregationRequest);

        if (aggregationsForGet
            && (projection[0] === projType.geoaggregate
                || projection[0] === projType.aggregate
                || projection[0] === projType.geohashgeoaggregate)
        ) {
            aggregationsForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('agg', element);
            });
        }
        if (fForGet) {
            fForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('f', element);
            });
        }
        if (qForGet !== undefined) {
            queryParameters.set('q', qForGet);
        }
        if (pwithinForGet) {
            pwithinForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('pwithin', element);
            });
        }
        if (gwithinForGet) {
            gwithinForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('gwithin', element);
            });
        }
        if (gintersectForGet) {
            gintersectForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('gintersect', element);
            });
        }
        if (notpwithinForGet) {
            notpwithinForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('notpwithin', element);
            });
        }
        if (notgwithinForGet) {
            notgwithinForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('notgwithin', element);
            });
        }
        if (notgintersectForGet) {
            notgintersectForGet.filter(element => element !== undefined).forEach(function (element) {
                queryParameters.append('notgintersect', element);
            });
        }
        queryParameters.set('pretty', 'false');

        if (this.max_age !== undefined) {
            queryParameters.set('max-age-cache', this.max_age.toString());
        }
        return queryParameters.toString();
    }

    public getFinalFilter(filters: Array<Filter>): Filter {
        const finalFilter: Filter = {};
        const f: Array<Array<Expression>> = new Array<Array<Expression>>();
        const q: Array<Array<string>> = new Array<Array<string>>();
        const p: Array<Array<string>> = new Array<Array<string>>();
        const gi: Array<Array<string>> = new Array<Array<string>>();
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
                    filter.q.forEach(qFilter => {
                        if (q.indexOf(qFilter) < 0) {
                            q.push(qFilter);
                        }
                    });
                }
                if (filter.pwithin) {
                    filter.pwithin.forEach(pwiFilter => {
                        if (p.indexOf(pwiFilter) < 0) {
                            p.push(pwiFilter);
                        }
                    });
                }
                if (filter.gintersect) {
                    filter.gintersect.forEach(giFilter => {
                        if (gi.indexOf(giFilter) < 0) {
                            gi.push(giFilter);
                        }
                    });
                }
            }
        });
        if (f.length > 0) {
            finalFilter.f = f;
        }
        if (q.length > 0) {
            finalFilter.q = q;
        }
        if (p.length > 0) {
            finalFilter.pwithin = p;
        }
        if (gi.length > 0) {
            finalFilter.gintersect = gi;
        }
        return finalFilter;
    }

    /**
     * Describe the structure and the content of the given collection.
     * @param collection collection name
     * @param pretty Whether pretty print or not
     */
    public describe(collection: string, pretty?: boolean): Observable<CollectionReferenceDescription> {
        const result = <Observable<CollectionReferenceDescription>>Observable.fromPromise(
            this.exploreApi.describe(collection, pretty, this.max_age, this.fetchOptions)
        );
        return result;
    }

    /**
     * Search and tag the elements found in the collection, given the filters
     * @param collection collection name
     * @param body Request body
     * @param pretty Whether pretty print or not
     */
    public tag(collection: string, body?: TagRequest, pretty?: boolean): Observable<UpdateResponse> {
        const result = <Observable<UpdateResponse>>Observable.fromPromise(
            this.writeApi.tagPost(collection, body, pretty, this.fetchOptions)
        );
        return result;
    }

    /**
     * Search and untag the elements found in the collection, given the filters
     * @param collection collection name
     * @param body Request body
     * @param pretty Whether pretty print or not
     */
    public untag(collection: string, body?: TagRequest, pretty?: boolean): Observable<UpdateResponse> {
        const result = <Observable<UpdateResponse>>Observable.fromPromise(
            this.writeApi.untagPost(collection, body, pretty, this.fetchOptions)
        );
        return result;
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
    * @param isFlat  Boolean option to flat output geojson properties.
    * @returns ARLAS Server observable.
    */
    private resolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count]
        | [projType.range, RangeRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean,
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            if (contributorId) {
                const collaboration = collaborations.get(contributorId);
                if (collaboration !== undefined) {
                    if (collaboration.enabled) {
                        if (collaboration.filter) { filters.push(collaboration.filter); }
                    }
                }
            }
            if (filter) {
                filters.push(filter);
            }
            return this.computeResolve(projection, filters, isFlat);
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
    * @param isFlat  Boolean option to flat output geojson properties.
    * @returns ARLAS Server observable.
    */
    private resolveButNot(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count]
        | [projType.range, RangeRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean,
    ): Observable<any> {
        try {
            const filters: Array<Filter> = new Array<Filter>();
            if (contributorId) {
                collaborations.forEach((k, v) => {
                    if (v !== contributorId && k.enabled) {
                        if (k.filter) { filters.push(k.filter); }
                    } else {
                        return;
                    }
                });
            } else {
                collaborations.forEach((k, v) => {
                    if (k.enabled) {
                        if (k.filter) { filters.push(k.filter); }
                    }
                });
            }
            if (filter) {
                filters.push(filter);
            }
            return this.computeResolve(projection, filters, isFlat);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }

    /**
    * Build an ARLAS Server request from an Array of Filter
    * @param projection  Type of projection of ARLAS Server request.
    * @param filters   ARLAS API filters list to resolve the request.
    * @param isFlat  Boolean option to flat output geojson properties.
    * @returns ARLAS Server observable.
    */
    private computeResolve(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count]
        | [projType.range, RangeRequest], filters: Array<Filter>, isFlat?: boolean
    ): Observable<any> {
        const finalFilter = this.getFinalFilter(filters);
        let aggregationRequest: AggregationsRequest;
        let aggregationsForGet: string[];
        let search: Search;
        let includes: string[] = [];
        let excludes: string[] = [];
        let result;
        const fForGet = this.buildFilterFieldGetParam('f', finalFilter);
        const qForGet = this.buildFilterFieldGetParam('q', finalFilter);
        const pwithinForGet = this.buildFilterFieldGetParam('pwithin', finalFilter);
        const gwithinForGet = this.buildFilterFieldGetParam('gwithin', finalFilter);
        const gintersectForGet = this.buildFilterFieldGetParam('gintersect', finalFilter);
        const notpwithinForGet = this.buildFilterFieldGetParam('notpwithin', finalFilter);
        const notgwithinForGet = this.buildFilterFieldGetParam('notgwithin', finalFilter);
        const notgintersectForGet = this.buildFilterFieldGetParam('notgintersect', finalFilter);
        switch (projection[0]) {
            case projType.aggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<AggregationResponse>>Observable.fromPromise(
                    this.exploreApi.aggregate(this.collection, aggregationsForGet,
                        fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, this.max_age, this.fetchOptions)
                );
                break;
            case projType.geoaggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<FeatureCollection>>Observable.fromPromise(
                    this.exploreApi.geoaggregate(this.collection, aggregationsForGet,
                        fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, isFlat, this.max_age, this.fetchOptions)
                );
                break;
            case projType.geohashgeoaggregate.valueOf():
                const aggregations: Array<Aggregation> = (<GeohashAggregation>projection[1]).aggregations;
                const geohash = (<GeohashAggregation>projection[1]).geohash;
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: aggregations
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<FeatureCollection>>Observable.fromPromise(
                    this.exploreApi.geohashgeoaggregate(this.collection, geohash, aggregationsForGet,
                        fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, isFlat, this.max_age, this.fetchOptions)
                );
                break;
            case projType.count.valueOf():
                result = <Observable<Hits>>Observable.fromPromise(
                    this.exploreApi.count(this.collection, fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, this.max_age, this.fetchOptions)
                );
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
                result = <Observable<Hits>>Observable.fromPromise(
                    this.exploreApi.search(this.collection, fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, includes, excludes, search.size.size,
                        search.size.from, sort, this.max_age, this.fetchOptions)
                );
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
                result = <Observable<FeatureCollection>>Observable.fromPromise(
                    this.exploreApi.geosearch(this.collection, fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, isFlat, includes, excludes, search.size.size,
                        search.size.from, null, this.max_age, this.fetchOptions)
                );
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
                result = <Observable<FeatureCollection>>Observable.fromPromise(
                    this.exploreApi.tiledgeosearch(this.collection, x, y, z
                        , fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, isFlat, includes, excludes,
                        search.size.size, search.size.from, null, this.max_age, this.fetchOptions)
                );
                break;
            case projType.range.valueOf():
                const rangeRequest: RangeRequest = <RangeRequest>{
                    filter: finalFilter,
                    field: (<RangeRequest>projection[1]).field
                };
                result = <Observable<RangeResponse>>Observable.fromPromise(
                    this.exploreApi.range(this.collection, rangeRequest.field
                        , fForGet, qForGet
                        , pwithinForGet, gwithinForGet, gintersectForGet, notpwithinForGet
                        , notgwithinForGet, notgintersectForGet, false, this.max_age, this.fetchOptions)
                );
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
            if (agg.metrics) {
                agg.metrics.filter((m: Metric) => (m.collectField && m.collectFct)).forEach(m => {
                    aggregation = aggregation + ':collect_field-' + m.collectField + ':collect_fct-' + m.collectFct;
                });
            }
            if (agg.order !== undefined) {
                aggregation = aggregation + ':order-' + agg.order;
            }
            if (agg.size !== undefined) {
                aggregation = aggregation + ':size-' + agg.size;
            }
            if (agg.fetchGeometry !== undefined) {
                aggregation = aggregation + ':fetchGeometry';
                if (agg.fetchGeometry.field !== undefined) {
                    aggregation = aggregation + '-' + agg.fetchGeometry.field;
                }
                if (agg.fetchGeometry.strategy !== undefined) {
                    aggregation = aggregation + '-' + agg.fetchGeometry.strategy.toString().toLowerCase();
                }
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
                    let union = '';
                    e.forEach(i => {
                        union = union + i.field + ':' + i.op + ':' + i.value + ';';
                    });
                    f.push(union.substring(0, union.length - 1));
                });
            }
            return f;
        } else {
            const f: string[] = [];
            if (filter[field] !== undefined) {
                filter[field].forEach(e => {
                    let union = '';
                    e.forEach(i => {
                        union = union + i + ';';
                    });
                    f.push(union.substring(0, union.length - 1));
                });
                return f;
            } else {
                return undefined;
            }
        }
    }
}
