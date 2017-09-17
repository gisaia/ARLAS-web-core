import { ConfigService } from '../services/config.service';
export abstract class Contributor {

    /**
    * Name of the contributor retrieve from configService.
    */
    private name: string = this.getConfigValue('name');
    /**
    * @param identifier  string identifier of the contributor.
    * @param configService  configService of the contributor.
    */
    constructor(public identifier: string, public configService: ConfigService) {
    }

    /**
    * @returns package name of contributor used in configuration.
    */
    public abstract getPackageName(): string;

    /**
    * @param fieldName  string fieldName find in configuration.
    * @returns value of fieldName in configuration.
    */
    public getConfigValue(fieldName: string): any {
        const packageName: string = this.getPackageName();
        const identifier: string = this.identifier;
        const key: string = packageName + '$' + identifier + '.' + fieldName;
        return this.configService.getValue(key);
    }
    /**
    * @returns  name of contributor set in configuration.
    */
    public getName(): string {
        return this.name;
    }
    /**
    * @returns  name and live informations about filter contributor.
    */
    public abstract getFilterDisplayName(): string;

}
