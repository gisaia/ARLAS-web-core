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

import { Subject } from 'rxjs';
import { getObject } from '../utils/utils';

export class ConfigService {
    /**
    * Bus of configuration error.
    */
    public confErrorBus = new Subject<string>();
    /**
    * Object which contains the configuration (json format).
    */
    private config: Object;
    constructor() {
    }
    /**
    * Retrieve Value from key in configuration object.
    * @returns configuration value
    */
    public getValue(key: string): any {
        const conf = this.config;
        const value = getObject(conf, 'conf.' + key);
        if (value !== null) {
            return getObject(conf, 'conf.' + key);
        } else {
            this.errorCallBack(key);
        }
    }
    /**
    * Notify bus error.
    */
    public errorCallBack(key: string) {
        this.confErrorBus.next(key);
    }
    /**
    * Get configuration object.
    * @returns configuration Object
    */
    public getConfig(): Object {
        return this.config;
    }
    /**
    * Set configuration object.
    * @param config Object
    */
    public setConfig(config: Object) {
        this.config = config;
    }
}
