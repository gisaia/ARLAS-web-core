export interface ApiService {

  buildquery(filters: Array<Object>):Object,
  executequery(query :Object):Object

}