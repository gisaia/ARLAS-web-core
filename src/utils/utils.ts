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

