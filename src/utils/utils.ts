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

/**
 * Get object or String value of an object from key
 * sample usage: getObject(object,key1.key2)
 * @param {object} datalayer - datalayer object
 * @param {string} objectKey? - optional
 * @returns {any} returns object by key or string value
 */

export function getObject(datalayer: object, objectKey?: string): any {
    // if datalayer doesn't exists, just return
  if (!datalayer) {
    return null;
  }
  // default return datalayer
  let current = datalayer;
  // check every layer
  if (typeof objectKey === 'string') {
    const numberOfObjectHierarchy = objectKey.match(/\./g).length;
    for (let i = 1; i <= numberOfObjectHierarchy; i++) {
      const currentKey = objectKey.split(/\./)[i];
      if (typeof current[currentKey] === 'undefined') {
        return null;
      }
      current = current[currentKey];
    }
  }

  return current;
}

/** This interface will be used to get on which field to aggregate for a collection */
export interface CollectionAggField {
  field?: string;
  collectionName: string;
}

/** checks if there is a common string in the given arrays */
export function hasAtLeastOneCommon(collections1: string[], collections2: string[]): boolean {
  const cSet1 = new Set(collections1);
  if (!!cSet1 && collections2) {
    return collections2.filter(c => cSet1.has(c)).length > 0;
  }
  return false;
}

export function fromEntries<T = any>(map: Map<string, T>): { [k: string]: T; } {

  const object = {};
  if (!!map) {
    map.forEach((v, k) => {
      object[k] = v;
    });
  }
  return object;
}

export interface CollectionCount {
  count: number;
  collection: string;
}

