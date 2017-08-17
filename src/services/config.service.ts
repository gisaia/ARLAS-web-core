import { getObject } from './utils';
import { Subject } from 'rxjs/Rx';
export class ConfigService {
    public confErrorBus = new Subject<string>();
    private config: Object;
    constructor() {
    }
    public getValue(key: string): any {
        const conf = this.config;
        const value = getObject(conf, 'conf.' + key);
        if (value !== null) {
            return getObject(conf, 'conf.' + key);
        } else {
            this.errorCallBack(key);
        }
    }

    public errorCallBack(key: string) {
        this.confErrorBus.next(key);
    }

    public getConfig(): Object {
        return this.config;
    }

    public setConfig(config: Object) {
        this.config = config;
    }
}
