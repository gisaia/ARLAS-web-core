import { asElementData } from '@angular/core/src/view';
import { ConfigService } from '../services/config.service';
import { CollaborativesearchService } from '../services/collaborativesearch.service';
import { OperationEnum, CollaborationEvent, Collaboration } from './collaboration';
import { Observable } from 'rxjs/Rx';
export abstract class Contributor {

    /**
    * Name of the contributor retrieve from configService.
    */
    private name: string = this.getConfigValue('name');
    private fetchedData: any;
    /**
    * @param identifier  string identifier of the contributor.
    * @param configService  configService of the contributor.
    */
    constructor(public identifier: string,
        public configService: ConfigService,
        public collaborativeSearcheService: CollaborativesearchService) {
        // Register the contributor in collaborativeSearcheService registry
        this.collaborativeSearcheService.register(this.identifier, this);
        // Subscribe a bus to update data and selection
        this.collaborativeSearcheService.collaborationBus
            .subscribe(collaborationEvent => {
                this.updateFromCollaboration(collaborationEvent);
            },
            error => this.collaborativeSearcheService.collaborationErrorBus.next(error)
            );
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

    public abstract fetchData(collaborationEvent: CollaborationEvent): Observable<any>;

    public abstract computeData(data: any): any;

    public abstract setData(data: any): any;

    public abstract setSelection(data: any, c: Collaboration): any;

    private updateFromCollaboration(collaborationEvent: CollaborationEvent) {
        this.collaborativeSearcheService.ongoingSubscribe.next(1);
        this.fetchData(collaborationEvent)
            .map(f => this.computeData(f))
            .map(f => { this.fetchedData = f; this.setData(f); })
            .finally(() => {
                this.setSelection(this.fetchedData, this.collaborativeSearcheService.getCollaboration(this.identifier));
                this.collaborativeSearcheService.contribFilterBus
                    .next(this.collaborativeSearcheService.registry.get(this.identifier));
                this.collaborativeSearcheService.ongoingSubscribe.
                    next(-1);
            })
            .subscribe(data => data,
            error => this.collaborativeSearcheService.collaborationErrorBus.next(error)
            );
    }


}
