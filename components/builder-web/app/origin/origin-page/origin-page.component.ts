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

import { Component, OnInit, OnDestroy } from "@angular/core";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";
import { AppStore } from "../../AppStore";
import { fetchOrigin, fetchMyOrigins } from "../origin.actions";
import { requireSignIn, packageString } from "../../util";

export enum ProjectStatus {
    Connect,
    Settings,
    Lacking
}

@Component({
    template: require("./origin-page.component.html")
})

export class OriginPageComponent implements OnInit, OnDestroy {
    projectStatus = ProjectStatus;
    sub: Subscription;

    constructor(private route: ActivatedRoute, private store: AppStore) {}

    ngOnInit() {
        requireSignIn(this);
        // This will ensure the origin is set in the state for all of our child routes
        this.sub = this.route.parent.params.subscribe(params => {
            this.store.dispatch(fetchOrigin(params["origin"]));
            this.store.dispatch(fetchMyOrigins(this.gitHubAuthToken));
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    get navLinks() {
        // TED TODO: Uncomment settings when the privacy api endpoint is implemented
        return ["packages", "keys", "members", "integrations"/*, "settings"*/];
    }

    get gitHubAuthToken() {
        return this.store.getState().gitHub.authToken;
    }

    get ui() {
        return this.store.getState().origins.ui.current;
    }

    get myOrigins() {
        return this.store.getState().origins.mine;
    }
}
