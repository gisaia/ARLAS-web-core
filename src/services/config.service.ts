import { getObject } from './utils';
export class ConfigService {
    constructor(private config: Object) {
    }
    getValue(key: string): any {
        let conf = this.config;
        return getObject(conf,"conf."+key)
    }
}