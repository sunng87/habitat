import "rxjs/add/operator/map";
import { Injectable } from "@angular/core";
import { Http } from "@angular/http";
import { Observable } from "rxjs/Observable";
import { Origin } from "./origin.model";
import config from "../config";

@Injectable()
export class OriginService {
  private API_PATH: string =  config["habitat_api_url"];
  
  constructor(private http: Http) {}

  getMyOrigins(): Observable<Origin[]> {
    return this.http.get(`${this.API_PATH}/user/origins`);
  }
  
  searchBooks(queryTitle: string): Observable<Origin[]> {
    return this.http
      .get(`${this.API_PATH}?q=${queryTitle}`)
      .map(res => res.json().items || []);
  }

  retrieveBook(volumeId: string): Observable<Origin> {
    return this.http.get(`${this.API_PATH}/${volumeId}`).map(res => res.json());
  }
}
