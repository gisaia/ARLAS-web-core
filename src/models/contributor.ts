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

import { Observable, Subject } from 'rxjs';
import { debounceTime, finalize, map } from 'rxjs/operators';
import { CollaborativesearchService } from '../services/collaborativesearch.service';
import { ConfigService } from '../services/config.service';
import { CollectionAggField, hasAtLeastOneCommon } from '../utils/utils';
import { Collaboration, CollaborationEvent } from './collaboration';


export abstract class Contributor {

    private name: string;
    private fetchedData?: any;
    private _updateData = true;

    public isDataUpdating = false;
    public collection: string;
    public collections: CollectionAggField[] = [];
    public endCollaborationEvent = new Subject<CollaborationEvent>();

    public linkedContributorId: string;

    protected cacheDuration: number;

    /**
    * @param identifier identifier of the contributor.
    * @param configService Service to fetch the configuration of the contributor
    * @param collaborativeSearcheService Service managing the collaborations between contributors
    * @param collection Name of the collection of the contributor
    */
    public constructor(
        public identifier: string,
        public configService: ConfigService,
        public collaborativeSearcheService: CollaborativesearchService,
        collection?: string
    ) {
        this.collection = collection || this.collaborativeSearcheService.defaultCollection;
        const configDebounceTime = this.configService.getValue('arlas.server.debounceCollaborationTime');
        const debounceDuration = configDebounceTime === undefined ? 750 : configDebounceTime;
        const configName = this.getConfigValue('name');
        const configCacheDuration = this.getConfigValue('cache_duration');
        this.cacheDuration = configCacheDuration ? configCacheDuration : this.collaborativeSearcheService.max_age;
        this.linkedContributorId = this.getConfigValue('linked_contributor_id');
        this.name = configName || this.identifier;
        // Register the contributor in collaborativeSearcheService registry
        this.collaborativeSearcheService.register(this.identifier, this);
        // Subscribe a bus to update data and selection
        this.collaborativeSearcheService.collaborationBus.pipe(debounceTime(debounceDuration))
            .subscribe({
                next: (collaborationEvent) => {
                    // Update only contributor of same collection that the current collaboration or on the init whit the url
                    let collaborationCollections: CollectionAggField[] = [];
                    const collaboration = this.collaborativeSearcheService.registry.get(collaborationEvent.id);
                    if (collaboration) {
                        collaborationCollections = collaboration.collections;
                    }
                    const cs1 = this.collections.map(c => c.collectionName);
                    const cs2 = collaborationCollections.map(c => c.collectionName);
                    const update =
                        collaborationEvent.id === 'url' ||
                        collaborationEvent.id === 'all' ||
                        (this.isUpdateEnabledOnOwnCollaboration() && hasAtLeastOneCommon(cs1, cs2)) ||
                        (!this.isMyOwnCollaboration(collaborationEvent) && !this.isMyLinkedContributorCollaboration(collaborationEvent) &&
                            hasAtLeastOneCommon(cs1, cs2)
                        );
                    if (this._updateData && update) {
                        this.updateFromCollaboration(collaborationEvent);
                    }
                    if (!update && this.isMyLinkedContributorCollaboration(collaborationEvent)) {
                        const myLinkedContribCollaboration = this.collaborativeSearcheService.getCollaboration(this.linkedContributorId);
                        if (myLinkedContribCollaboration) {
                            this.setSelection(this.fetchedData, myLinkedContribCollaboration);
                        }
                    }
                    if (!update && this.isMyOwnCollaboration(collaborationEvent)) {
                        const myOwnCollaboration = this.collaborativeSearcheService.getCollaboration(this.identifier);
                        if (myOwnCollaboration) {
                            this.setSelection(this.fetchedData, myOwnCollaboration);
                        }
                    }
                },
                error: (error) => this.collaborativeSearcheService.collaborationErrorBus.next(error)}
            );
    }
    /**
    * @returns package name of contributor used in configuration.
    */
    public abstract getPackageName(): string;

    /**
    * @param key  a `key` defined in configuration.
    * @returns value of the `key` in configuration.
    */
    public getConfigValue(key: string): any {
        let configValue = null;
        const contributor = this.configService.getValue('arlas.web.contributors').find(
            (contrib: any) => contrib.identifier === this.identifier
        );
        if (contributor) {
            configValue = contributor[key];
        }
        return configValue;
    }

    public abstract isUpdateEnabledOnOwnCollaboration(): boolean;

    public isMyOwnCollaboration(collaborationEvent: CollaborationEvent): boolean {
        return collaborationEvent.id === this.identifier;
    }

    public isMyLinkedContributorCollaboration(collaborationEvent: CollaborationEvent): boolean {
        return collaborationEvent.id === this.linkedContributorId;
    }

    /**
    * @returns  name of contributor set in configuration.
    */
    public getName(): string {
        return this.name;
    }

    /**
    * @returns  set the name of the contributor
    */
    public setName(name: string): void {
        this.name = name;
    }

    /**
    * @returns  whether the data of contributor should be updated.
    */
    public get updateData(): boolean {
        return this._updateData;
    }

    /**
    * @param  value set if the data of contributor should be updated or not.
    */
    public set updateData(value) {
        this._updateData = value;
    }


    /**
    * @returns  name and live informations about filter contributor.
    */
    public abstract getFilterDisplayName(): string;

    public abstract fetchData(collaborationEvent: CollaborationEvent): Observable<any>;

    public abstract computeData(data: any): any;

    public abstract setData(data: any): void;

    public abstract setSelection(data: any, c: Collaboration | undefined): void;

    public updateFromCollaboration(collaborationEvent: CollaborationEvent) {
        this.collaborativeSearcheService.ongoingSubscribe.next(1);
        this.isDataUpdating = true;
        this.fetchData(collaborationEvent)
            .pipe(
                map(f => this.computeData(f)),
                map(f => {
                    this.fetchedData = f;
                    this.setData(f);
                }),
                finalize(() => {
                    const collaboration = this.collaborativeSearcheService.getCollaboration(this.identifier);
                    this.setSelection(this.fetchedData, collaboration);

                    const contributor = this.collaborativeSearcheService.registry.get(this.identifier);
                    if (contributor) {
                        this.collaborativeSearcheService.contribFilterBus.next(contributor);
                    }

                    this.collaborativeSearcheService.ongoingSubscribe.
                        next(-1);
                    this.isDataUpdating = false;
                    this.endCollaborationEvent.next(collaborationEvent);
                })
            )
            .subscribe({
                next: (data) => data,
                error: (error) => this.collaborativeSearcheService.collaborationErrorBus.next(error)
            });

    }
}
