// Copyright (c) 2016-2017 Chef Software Inc. and/or applicable contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { addNotification, SUCCESS, DANGER } from "../actions/notifications";
import { requestRoute } from "../actions/router";
import * as depotApi from "../depotApi";
import { BuilderApiClient } from "../BuilderApiClient";
import { parseKey } from "../util";
import {
    fetchIntegrations
} from "./origin-page/origin-integrations-tab/origin-integrations-tab.actions";

export const POPULATE_MY_ORIGINS = "POPULATE_MY_ORIGINS";
export const POPULATE_ORIGIN_INVITATIONS = "POPULATE_ORIGIN_INVITATIONS";
export const SET_CURRENT_ORIGIN = "SET_CURRENT_ORIGIN";
export const SET_CURRENT_ORIGIN_LOADING = "SET_CURRENT_ORIGIN_LOADING";
export const SET_CURRENT_ORIGIN_ADDING_PRIVATE_KEY =
    "SET_CURRENT_ORIGIN_ADDING_PRIVATE_KEY";
export const SET_CURRENT_ORIGIN_ADDING_PUBLIC_KEY =
    "SET_CURRENT_ORIGIN_ADDING_PUBLIC_KEY";
export const SET_ORIGIN_INTEGRATION_SAVE_ERROR_MESSAGE =
    "SET_ORIGIN_INTEGRATION_SAVE_ERROR_MESSAGE";
export const TOGGLE_ORIGIN_PICKER = "TOGGLE_ORIGIN_PICKER";
export const SET_PACKAGE_COUNT_FOR_ORIGIN = "SET_PACKAGE_COUNT_FOR_ORIGIN";
export const SET_ORIGIN_PRIVACY_SETTINGS = "SET_ORIGIN_PRIVACY_SETTINGS";

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
    return dispatch => {
        new BuilderApiClient(token).addDockerHubCredentials(origin, credentials).
            then(response => {
                dispatch(fetchIntegrations(origin, token));
            }).catch(error => {
                dispatch(setOriginIntegrationSaveErrorMessage(error.message));
            });
    };
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

export function toggleOriginPicker() {
    return {
        type: TOGGLE_ORIGIN_PICKER,
    };
}

function populatePackageCountForOrigin(payload) {
    return {
        type: SET_PACKAGE_COUNT_FOR_ORIGIN,
        payload
    };
}

function populateMyOrigins(payload, error = undefined) {
    return {
        type: POPULATE_MY_ORIGINS,
        payload,
        error
    };
}

function populateOriginInvitations(payload, error = undefined) {
    return {
        type: POPULATE_ORIGIN_INVITATIONS,
        payload,
        error,
    };
}

export function setCurrentOrigin(payload, error = undefined) {
    return {
        type: SET_CURRENT_ORIGIN,
        payload,
        error,
    };
}

function setCurrentOriginLoading(payload: boolean) {
    return {
        type: SET_CURRENT_ORIGIN_LOADING,
        payload,
    };
}

function setOriginIntegrationSaveErrorMessage(payload: string) {
    return {
        type: SET_ORIGIN_INTEGRATION_SAVE_ERROR_MESSAGE,
        payload,
    };
}
