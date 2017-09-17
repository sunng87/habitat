import "rxjs/add/operator/catch";
import "rxjs/add/operator/map";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/skip";
import "rxjs/add/operator/takeUntil";
import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Observable } from "rxjs/Observable";
import { Scheduler } from "rxjs/Scheduler";
import { async } from "rxjs/scheduler/async";
import { empty } from "rxjs/observable/empty";
import { of } from "rxjs/observable/of";

import * as origin from "./origin.actions";
import { Origin } from "./origin.model";
import { BuilderApiClient } from "../BuilderApiClient";

export const SEARCH_DEBOUNCE = new InjectionToken<number>("Search Debounce");
export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
  "Search Scheduler"
);

@Injectable()
export class BookEffects {
  @Effect()
  search$: Observable<Action> = this.actions$
    .ofType<book.Search>(book.SEARCH)
    .debounceTime(this.debounce, this.scheduler || async)
    .map(action => action.payload)
    .switchMap(query => {
      if (query === "") {
        return empty();
      }

      const nextSearch$ = this.actions$.ofType(book.SEARCH).skip(1);

      return this.googleBooks
        .searchBooks(query)
        .takeUntil(nextSearch$)
        .map((books: Book[]) => new book.SearchComplete(books))
        .catch(() => of(new book.SearchComplete([])));
    });

  constructor(
    private actions$: Actions,
    private googleBooks: GoogleBooksService,
    @Optional()
    @Inject(SEARCH_DEBOUNCE)
    private debounce: number = 300,
    /**
       * You inject an optional Scheduler that will be undefined
       * in normal application usage, but its injected here so that you can mock out
       * during testing using the RxJS TestScheduler for simulating passages of time.
       */
    @Optional()
    @Inject(SEARCH_SCHEDULER)
    private scheduler: Scheduler
  ) {}
}

export function fetchMyOrigins(token) {
  return dispatch => {
      new BuilderApiClient(token).getMyOrigins().then(origins => {
          dispatch(populateMyOrigins(origins));
          dispatch(fetchOriginsPackageCount(origins));
      }).catch(error => dispatch(populateMyOrigins(undefined, error)));
  };
}

export function fetchOrigin(originName: string) {
  return dispatch => {
      dispatch(setCurrentOriginLoading(true));
      new BuilderApiClient().getOrigin(originName).then(response => {
          dispatch(setCurrentOrigin(response));
      }).catch(error => {
          dispatch(setCurrentOrigin(undefined, error));
      });
  };
}

export function fetchOriginInvitations(originName: string, token: string) {
  return dispatch => {
      new BuilderApiClient(token).getOriginInvitations(originName).
          then(response => {
              dispatch(populateOriginInvitations(response));
          }).catch(error => {
              dispatch(populateOriginInvitations(undefined, error));
          });
  };
}

export function addDockerHubCredentials(credentials, origin: string, token: string) {
  // return dispatch => {
  //     new BuilderApiClient(token).addDockerHubCredentials(origin, credentials).
  //         then(response => {
  //             dispatch(fetchIntegrations(origin, token));
  //         }).catch(error => {
  //             dispatch(setOriginIntegrationSaveErrorMessage(error.message));
  //         });
  // };
}

function fetchOriginsPackageCount(origins) {
  return dispatch => {
      origins.forEach(origin => {
          depotApi
              .getStats(origin)
              .then(response => {
                  response["origin"] = origin;
                  dispatch(populatePackageCountForOrigin(response));
              })
              .catch(error => {
                  dispatch(populatePackageCountForOrigin(error.message));
              });
      });
  };
}
