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
import { MdDialog, MdDialogRef } from "@angular/material";
import { AppStore } from "../../../AppStore";
import { setOriginPrivacySettings, fetchIntegrations } from "../../origin.actions";
import { DockerCredentialsFormDialog } from "../docker-credentials-form/docker-credentials-form.dialog";

@Component({
    selector: "hab-origin-settings-tab",
    template: require("./origin-integrations-tab.component.html")
})

export class OriginIntegrationsTabComponent implements OnInit {

  constructor(private store: AppStore, private dialog: MdDialog) {}

  ngOnInit() {
    this.store.dispatch(fetchIntegrations(
      this.origin.name, this.gitHubAuthToken
    ));
  }

  get origin() {
    return this.store.getState().origin.current;
  }

  get originPrivacy() {
    return this.origin.privacy;
  }

  get gitHubAuthToken() {
    return this.store.getState().gitHub.authToken;
  }

  updatePrivacy(event) {
    this.store.dispatch(setOriginPrivacySettings(event.value));
  }

  get integrations() {
    console.log(this.store.getState().origin.currentIntegrations);
    return this.store.getState().origin.currentIntegrations;
  }

  openDialog(): void {
    let dialogRef = this.dialog.open(DockerCredentialsFormDialog, {
      width: "480px",
      height: "342px"
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(`The dialog was closed with: ${result}`);
    });
  }
}
