import { ApiService } from '../models/apiservice';

export class ArlasService implements ApiService {

  constructor() { }

    public buildquery(filters: Array<Object>): Object {
        throw new Error('Not implemented yet.');
    }

    public executequery(query: Object): Object {
        throw new Error('Not implemented yet.');
    }
}
