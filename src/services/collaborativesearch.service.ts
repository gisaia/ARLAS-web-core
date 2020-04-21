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
    FeatureCollection, Filter, Hits, Search, RangeRequest, RangeResponse, Metric, Page, Form, ComputationRequest, ComputationResponse
} from 'arlas-api';
import { Observable, Subject, from } from 'rxjs';
import { map } from 'rxjs/operators';
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
    * Configuration Service used by the collaborativesearchService.
    */
    private configService: ConfigService;
    /**
    * Configuration object of fetch call. By default all credentials are included.
    */
    private fetchOptions: {
        credentials: string,
        signal?: any
    } = {
        credentials: 'include',
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
    except for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Search or Count.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveButNotHits(projection:
        [projType.search, Search]
        | [projType.count, Count], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age
    ): Observable<Hits> {
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat, max_age);
    }
    /**
    * Resolve an ARLAS Server Search or Count  request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Search or Count .
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveHits(projection:
        [projType.search, Search]
        | [projType.count, Count], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age
    ): Observable<Hits> {
        return this.resolve(projection, collaborations, contributorId, filter, isFlat, max_age);
    }

    /**
    * Resolve an ARLAS Server Search or Count  request for an array of filter.
    * @param projection  Type of projection of ARLAS Server request :Search or Count .
    * @param filters  ARLAS API filters to resolve the request with compute
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveComputeHits(projection:
        [projType.search, Search]
        | [projType.count, Count],
        filters: Array<Filter>, isFlat?: boolean, max_age = this.max_age
    ): Observable<Hits> {
        return this.computeResolve(projection, filters, isFlat, max_age);
    }

    /**
    * Resolve an ARLAS Server Geosearch or Geoaggregate request with all the collaborations enabled in the collaboration registry
    except for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Geosearch or Geoaggregate.
    * @param isFlat  Boolean option to isFlat output geojson properties.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveButNotFeatureCollection(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>, isFlat = true,
        contributorId?: string, filter?: Filter, max_age = this.max_age
    ): Observable<FeatureCollection> {
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat, max_age);
    }

    public resolveButNotFeatureCollectionWithAbort(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>, isFlat = true, abortableSignal,
        contributorId?: string, filter?: Filter, max_age = this.max_age,
    ): Observable<FeatureCollection> {
        const fetchOptions = Object.assign({}, this.fetchOptions);
        fetchOptions.signal = abortableSignal;
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat, max_age, fetchOptions);
    }
    /**
    * Resolve an ARLAS Server Geosearch or Geoaggregate  request for an optional
    contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Geosearch or Geoaggregate.
    * @param isFlat  Boolean option to flat output geojson properties.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveFeatureCollection(projection:
        [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geoaggregate, Array<Aggregation>], isFlat = true, collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, max_age = this.max_age
    ): Observable<FeatureCollection> {
        return this.resolve(projection, collaborations, contributorId, filter, isFlat, max_age);
    }
    /**
    * Resolve an ARLAS Server Aggregation request with all the collaborations enabled in the collaboration registry
    except for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Aggregation.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveButNotAggregation(projection:
        [projType.aggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age
    ): Observable<AggregationResponse> {
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat, max_age);
    }
    /**
    * Resolve an ARLAS Server Aggregation request for an optional contributor and optional filters.
    * @param projection  Type of projection of ARLAS Server request :Aggregation.
    * @param contributorId  Identifier contributor to resolve the request with the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveAggregation(projection:
        [projType.aggregate, Array<Aggregation>], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age
    ): Observable<AggregationResponse> {
        return this.resolve(projection, collaborations, contributorId, filter, isFlat, max_age);
    }
    /**
    * Resolve an ARLAS Server Computation request with all the collaborations enabled in the collaboration registry
    except for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request : ComputationRequest.
    * @param collaborations  Map<contributorId, itsCollboration>
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveButNotComputation(projection:
        [projType.compute, ComputationRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age
    ): Observable<ComputationResponse> {
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat, max_age);
    }
    /**
    * Resolve an ARLAS Server Range request with all the collaborations enabled in the collaboration registry
    except for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request:Aggregation.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Whether flatten json.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    public resolveButNotFieldRange(projection:
        [projType.range, RangeRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age
    ): Observable<RangeResponse> {
        return this.resolveButNot(projection, collaborations, contributorId, filter, isFlat, max_age);
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
        this.countAll = result.pipe(map(c => c.totalnb));
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
        filters: Array<Filter>, max_age = this.max_age): string {

        const finalFilter = this.getFinalFilter(filters);
        let aggregationRequest: AggregationsRequest;
        let aggregationsForGet: string[];

        const fForGet = this.buildFilterFieldGetParam('f', finalFilter);
        const qForGet = this.buildFilterFieldGetParam('q', finalFilter);

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
        queryParameters.set('pretty', 'false');
        if (max_age !== undefined) {
            queryParameters.set('max-age-cache', max_age.toString());
        }
        if (finalFilter.dateformat !== undefined) {
            queryParameters.set('dateformat', finalFilter.dateformat.toString());

        }
        return queryParameters.toString();
    }

    public getFinalFilter(filters: Array<Filter>): Filter {
        const finalFilter: Filter = {};
        const f: Array<Array<Expression>> = new Array<Array<Expression>>();
        const q: Array<Array<string>> = new Array<Array<string>>();
        const p: Array<Array<string>> = new Array<Array<string>>();
        const gi: Array<Array<string>> = new Array<Array<string>>();

        const dateformats = new Set(filters.map(filter => filter.dateformat));
        if (dateformats.size > 1) {
            this.collaborationErrorBus.next((<Error>new Error('Dateformats must be equals for each filters')));
        } else if (dateformats.size === 1) {
            finalFilter.dateformat = dateformats[0];
        }
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

            }
        });
        if (f.length > 0) {
            finalFilter.f = f;
        }
        if (q.length > 0) {
            finalFilter.q = q;
        }
        return finalFilter;
    }

    /**
     * Describe the structure and the content of the given collection.
     * @param collection collection name
     * @param pretty Whether pretty print or not
     * @param max_age  Duration of browser cache.s
     */
    public describe(collection: string, pretty?: boolean, max_age = this.max_age): Observable<CollectionReferenceDescription> {
        const result = <Observable<CollectionReferenceDescription>>from(
            this.exploreApi.describe(collection, pretty, max_age, this.fetchOptions)
        );
        return result;
    }

    /**
     * Lists the collections configured in ARLAS.
     * @param pretty Whether pretty print or not
     */
    public list(pretty = false): Observable<Array<CollectionReferenceDescription>> {
      const result = <Observable<Array<CollectionReferenceDescription>>>from(
          this.exploreApi.list(pretty, this.max_age, this.fetchOptions)
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
        | [projType.range, RangeRequest]
        | [projType.compute, ComputationRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age, fetchOptions = this.fetchOptions
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
            return this.computeResolve(projection, filters, isFlat, max_age, fetchOptions);
        } catch (ex) {
            this.collaborationErrorBus.next((<Error>ex));
        }
    }
    /**
    * Resolve an ARLAS Server request with all the collaborations enabled in the collaboration registry
    except for the contributor given in second optionnal parameter.
    * @param projection  Type of projection of ARLAS Server request.
    * @param contributorId  Identifier contributor to resolve the request without the collaboration of this contributor.
    * @param filter  ARLAS API filter to resolve the request with this filter in addition.
    * @param isFlat  Boolean option to flat output geojson properties.
    * @param max_age  Duration of browser cache.
    * @returns ARLAS Server observable.
    */
    private resolveButNot(projection: [projType.aggregate, Array<Aggregation>]
        | [projType.search, Search]
        | [projType.geoaggregate, Array<Aggregation>]
        | [projType.geohashgeoaggregate, GeohashAggregation]
        | [projType.geosearch, Search]
        | [projType.tiledgeosearch, TiledSearch]
        | [projType.count, Count]
        | [projType.range, RangeRequest]
        | [projType.compute, ComputationRequest], collaborations: Map<string, Collaboration>,
        contributorId?: string, filter?: Filter, isFlat?: boolean, max_age = this.max_age, fetchOptions = this.fetchOptions
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
            return this.computeResolve(projection, filters, isFlat, max_age, fetchOptions);
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
        | [projType.range, RangeRequest]
        | [projType.compute, ComputationRequest], filters: Array<Filter>, isFlat?: boolean, max_age = this.max_age,
         fetchOptions = this.fetchOptions
    ): Observable<any> {
        const finalFilter = this.getFinalFilter(filters);
        const dateformat = finalFilter.dateformat;
        let aggregationRequest: AggregationsRequest;
        let aggregationsForGet: string[];
        let includes: string[] = [];
        let excludes: string[] = [];
        let returned_geometries: string;
        let result;
        const fForGet = this.buildFilterFieldGetParam('f', finalFilter);
        const qForGet = this.buildFilterFieldGetParam('q', finalFilter);
        let search: Search;
        let pretty = false;
        let flat = false;
        let pageAfter;
        let pageBefore;
        let pageFrom;
        let pageSize;
        let pageSort;
        if (projection[0] === projType.search.valueOf() || projection[0] === projType.geosearch.valueOf() ||
            projection[0] === projType.tiledgeosearch.valueOf()) {
            search = projection[0] === projType.tiledgeosearch.valueOf() ? (<TiledSearch>projection[1]).search : (<Search>projection[1]);
            includes = [];
            excludes = [];
            if (search.projection !== undefined) {
                if (search.projection.excludes !== undefined) {
                    excludes.push(search.projection.excludes);
                }
                if (search.projection.includes !== undefined) {
                    includes.push(search.projection.includes);
                }
            }
            if (search.returned_geometries !== undefined) {
                returned_geometries = search.returned_geometries;
            }
            const form: Form = search.form;
            const page: Page = search.page;
            if (form !== undefined) {
                if (form.flat !== undefined) {
                    flat = form.flat;
                }
                if (form.pretty !== undefined) {
                    pretty = form.pretty;
                }
            }
            if (page !== undefined) {
                if (page.after !== undefined) {
                    pageAfter = page.after;
                }
                if (page.before !== undefined) {
                    pageBefore = page.before;
                }
                if (page.from !== undefined) {
                    pageFrom = page.from;
                }
                if (page.size !== undefined) {
                    pageSize = page.size;
                }
                if (page.sort !== undefined) {
                    pageSort = page.sort;
                }
            }
        }
        switch (projection[0]) {
            case projType.aggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<AggregationResponse>>from(
                    this.exploreApi.aggregate(this.collection, aggregationsForGet,
                        fForGet, qForGet, dateformat, false, isFlat, max_age, fetchOptions)
                );
                break;
            case projType.geoaggregate.valueOf():
                aggregationRequest = <AggregationsRequest>{
                    filter: finalFilter,
                    aggregations: projection[1]
                };
                aggregationsForGet = this.buildAggGetParam(aggregationRequest);
                result = <Observable<FeatureCollection>>from(
                    this.exploreApi.geoaggregate(this.collection, aggregationsForGet,
                        fForGet, qForGet, dateformat, false, isFlat, max_age, fetchOptions)
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
                result = <Observable<FeatureCollection>>from(
                    this.exploreApi.geohashgeoaggregate(this.collection, geohash, aggregationsForGet,
                        fForGet, qForGet, dateformat, false, isFlat, max_age, fetchOptions)
                );
                break;
            case projType.count.valueOf():
                result = <Observable<Hits>>from(
                    this.exploreApi.count(this.collection, fForGet, qForGet, dateformat, false, max_age, fetchOptions));
                break;
            case projType.search.valueOf():
                result = <Observable<Hits>>from(
                    this.exploreApi.search(this.collection, fForGet, qForGet
                        , dateformat, false, flat, includes, excludes, returned_geometries, pageSize,
                        pageFrom, pageSort, pageAfter, pageBefore, max_age, fetchOptions)
                );
                break;
            case projType.geosearch.valueOf():
                result = <Observable<FeatureCollection>>from(
                    this.exploreApi.geosearch(this.collection, fForGet, qForGet
                        , dateformat, false, flat, includes, excludes, returned_geometries, pageSize,
                        pageFrom, pageSort, pageAfter, pageBefore, max_age, fetchOptions)
                );
                break;
            case projType.tiledgeosearch.valueOf():
                const x = (<TiledSearch>projection[1]).x;
                const y = (<TiledSearch>projection[1]).y;
                const z = (<TiledSearch>projection[1]).z;
                result = <Observable<FeatureCollection>>from(
                    this.exploreApi.tiledgeosearch(this.collection, x, y, z
                        , fForGet, qForGet
                        , dateformat, false, flat, includes, excludes, returned_geometries,
                        pageSize, pageFrom, pageSort, pageAfter, pageBefore, max_age, fetchOptions)
                );
                break;
            case projType.range.valueOf():
                const rangeRequest: RangeRequest = <RangeRequest>{
                    filter: finalFilter,
                    field: (<RangeRequest>projection[1]).field
                };
                result = <Observable<RangeResponse>>from(
                    this.exploreApi.range(this.collection, rangeRequest.field
                        , fForGet, qForGet
                        , dateformat, false, max_age, fetchOptions)
                );
                break;
            case projType.compute.valueOf():
                const field = (<ComputationRequest>projection[1]).field;
                const metric = (<ComputationRequest>projection[1]).metric;
                result = <Observable<ComputationResponse>>from(
                    this.exploreApi.compute(this.collection, field, metric.toString().toLowerCase(), fForGet,
                        qForGet, dateformat, false, max_age, fetchOptions)
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
                agg.metrics.filter((m: Metric) => (m.collect_field && m.collect_fct)).forEach(m => {
                    aggregation = aggregation + ':collect_field-' + m.collect_field + ':collect_fct-' + m.collect_fct;
                });
            }
            if (agg.order !== undefined) {
                aggregation = aggregation + ':order-' + agg.order;
            }
            if (agg.on !== undefined) {
                aggregation = aggregation + ':on-' + agg.on;
            }
            if (agg.size !== undefined) {
                aggregation = aggregation + ':size-' + agg.size;
            }
            if (agg.aggregated_geometries) {
                aggregation += ':aggregated_geometries-' + agg.aggregated_geometries.map(ag => ag.toString().toLowerCase()).join(',');
            }
            if (agg.raw_geometries !== undefined) {
                aggregation += ':raw_geometries-' + agg.raw_geometries.map(rg => {if (rg.sort) {
                    return rg.geometry + '(' + rg.sort + ')';
                } else {
                    return rg.geometry;
                }} ).join(';');
            }
            if (agg.fetch_hits !== undefined) {
                aggregation = aggregation + ':fetch_hits';
                if (agg.fetch_hits.size !== undefined) {
                    aggregation = aggregation + '-' + agg.fetch_hits.size;
                }
                if (agg.fetch_hits.include !== undefined) {
                    aggregation = aggregation + '(' + agg.fetch_hits.include.join(',') + ')';
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
