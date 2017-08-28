import { Subject } from 'rxjs/Rx';
import { getObject } from '../utils/utils';
export class ConfigService {
    /**
    * Bus of configuration error.
    */
    public confErrorBus = new Subject<string>();
    /**
    * Object which contains the configuration.
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
    * Retrieve configuration object.
    * @returns configuration Object
    */
    public getConfig(): Object {
        return this.config;
    }
    /**
    * Set configuration object in configuation service.
    * @param config Object
    */
    public setConfig(config: Object) {
        this.config = config;
    }
}
