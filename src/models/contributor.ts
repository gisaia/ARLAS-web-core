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

import { ConfigService } from '../services/config.service';
import { CollaborativesearchService } from '../services/collaborativesearch.service';
import { CollaborationEvent, Collaboration } from './collaboration';
import { Observable } from 'rxjs';
import { map, finalize, filter, debounceTime } from 'rxjs/operators';

export abstract class Contributor {

    private name: string;
    private fetchedData: any;
    private _updateData = true;
    public isDataUpdating = false;
    /**
    * @param identifier  string identifier of the contributor.
    * @param configService  configService of the contributor.
    */
    constructor(public identifier: string,
        public configService: ConfigService,
        public collaborativeSearcheService: CollaborativesearchService) {
        const configDebounceTime = this.configService.getValue('arlas.server.debounceCollaborationTime');
        const debounceDuration = configDebounceTime !== undefined ? configDebounceTime : 750;
        const configName = this.getConfigValue('name');
        this.name = configName ? configName : this.identifier;
        // Register the contributor in collaborativeSearcheService registry
        this.collaborativeSearcheService.register(this.identifier, this);
        // Subscribe a bus to update data and selection
        this.collaborativeSearcheService.collaborationBus.pipe(debounceTime(debounceDuration))
            .subscribe(collaborationEvent => {
                if (this._updateData) {
                    this.updateFromCollaboration(<CollaborationEvent>collaborationEvent);
                }
            },
                error => this.collaborativeSearcheService.collaborationErrorBus.next(error)
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
            contrib => contrib.identifier === this.identifier
        );
        if (contributor) {
            configValue = contributor[key];
        }
        return configValue;
    }

    /**
    * @returns  name of contributor set in configuration.
    */
    public getName(): string {
        return this.name;
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

    public abstract setData(data: any): any;

    public abstract setSelection(data: any, c: Collaboration): any;

    public updateFromCollaboration(collaborationEvent: CollaborationEvent) {
        this.collaborativeSearcheService.ongoingSubscribe.next(1);
        this.isDataUpdating = true;
        this.fetchData(collaborationEvent)
            .pipe(
                map(f => this.computeData(f)),
                map(f => { this.fetchedData = f; this.setData(f); }),
                finalize(() => {
                    this.setSelection(this.fetchedData, this.collaborativeSearcheService.getCollaboration(this.identifier));
                    this.collaborativeSearcheService.contribFilterBus
                        .next(this.collaborativeSearcheService.registry.get(this.identifier));
                    this.collaborativeSearcheService.ongoingSubscribe.
                        next(-1);
                    this.isDataUpdating = false;
                })
            )
            .subscribe(
                data => data,
                error => this.collaborativeSearcheService.collaborationErrorBus.next(error)
            );
    }
}
