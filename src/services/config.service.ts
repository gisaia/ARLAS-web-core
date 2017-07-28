import { getObject } from './utils';
export class ConfigService {
    constructor(private config: Object) {
    }
    getValue(key: string): any {
        const conf = this.config;
        return getObject(conf, 'conf.' + key);
    }
}
