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

import { ActivatedRoute } from "@angular/router";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { AppStore } from "../../../AppStore";
import { getUniquePackages } from "../../../actions";
import { Subscription } from "rxjs";
import { fetchOrigin } from "../../origin.actions";

@Component({
    selector: "hab-origin-packages-tab",
    template: require("./origin-packages-tab.component.html")
})

export class OriginPackagesTabComponent implements OnInit, OnDestroy {
  loadPackages: Function;
  sub: Subscription;

  constructor(
    private store: AppStore,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.sub = this.route.parent.params.subscribe(params => {
      this.store.dispatch(fetchOrigin(params["origin"]));
      this.getPackages();
      this.loadPackages = this.getPackages.bind(this);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  getPackages() {
    this.store.dispatch(getUniquePackages(this.origin.name, 0, this.gitHubAuthToken));
  }

  routeToPackage(pkg) {
    this.router.navigate(["/pkgs", pkg.origin, pkg.name]);
  }

  get origin() {
    return this.store.getState().origins.current;
  }

  get gitHubAuthToken() {
    return this.store.getState().gitHub.authToken;
  }

  get packagesUi() {
    return this.store.getState().packages.ui.visible;
  }

  get packages() {
    return this.store.getState().packages.visible;
  }

  get totalCount() {
    return this.store.getState().packages.totalCount;
  }

  get noPackages() {
    return (!this.packagesUi.exists || this.packages.size === 0) && !this.packagesUi.loading;
  }

  fetchMorePackages() {
    this.store.dispatch(getUniquePackages(
        this.origin.name,
        this.store.getState().packages.nextRange,
        this.gitHubAuthToken
    ));
    return false;
  }

}
