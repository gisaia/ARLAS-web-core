import { ConfigService } from './config.service';
export abstract class Contributor {
    private name: string = this.getConfigValue('name');
    private filterDisplayName: string = this.getConfigValue('filterDisplayName');
    constructor(public identifier: string, public configService: ConfigService) { }
    public setConfigService(configService: ConfigService): void {
        this.configService = configService;
    }
    public getConfigService(): ConfigService {
        return this.configService;
    }
    public abstract getPackageName(): string;
    public getIdentifier(): string {
        return this.identifier;
    }
    public getConfigValue(fieldName: string): any {
        const packageName: string = this.getPackageName();
        const identifier: string = this.getIdentifier();
        const key: string = packageName + '$' + identifier + '.' + fieldName;
        return this.configService.getValue(key);
    }
    public getName(): string {
        return this.name;
    }
    public abstract getFilterDisplayName(): string;

}
