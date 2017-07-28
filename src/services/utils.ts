/**
 * Checks through entire datalayer object tree to see if object value exists
 * sample usage: getObject(object, 'object.key1.key2.key3')
 * @param {object} datalayer - datalayer object
 * @param {string} objectKey? - optional
 * @returns {string} returns value
 */
export function getObjectValue(datalayer: object, objectKey?: string): string {
  const object = objectCheck(datalayer, objectKey);
  if (typeof object === 'string') {
    return object;
  }
  return null;
}

/**
 * Checks through entire datalayer object tree to see if object exists
 * sample usage: getObject(object.key)
 * @param {object} datalayer - datalayer object
 * @param {string} objectKey? - optional
 * @returns {any} returns object by key
 */
export function getObject(datalayer: object, objectKey?: string): any {
  return objectCheck(datalayer, objectKey);
}

/**
 * Main logic for getting object or string value from object key
 * @param {object} datalayer
 * @param {string} objectKey? - optional
 * @returns {any} current - returns either string or object
 */
const objectCheck = (datalayer: object, objectKey?: string): any => {
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
};
