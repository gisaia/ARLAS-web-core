import { ApiService } from '../models/apiservice';

export class ArlasService implements ApiService {

  constructor() { }

    public buildquery(filters: Array<Object>): Object {
        return filters;
    }

    public executequery(query: Object): Object {
        return query;
    }
}
