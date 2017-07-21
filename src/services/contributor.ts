import { ConfigService } from './config.service';
export abstract class Contributor {
    constructor(public identifier:string,public configService:ConfigService){};
    setConfigService(configService: ConfigService): void {
        this.configService = configService
    };
    getConfigService(): ConfigService {
        return this.configService
    };
    abstract getPackageName():string;
    getIdentifier():string{
        return this.identifier
    };
    getConfigValue(fieldName:string):any{
        let packageName :string = this.getPackageName();
        let identifier :string = this.getIdentifier();
        let key: string = packageName +"$"+ identifier + "."+fieldName;
        return this.configService.getValue(key)
    }
}