// Copyright (c) 2017 Chef Software Inc. and/or applicable contributors
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

use serde_json::{self, Value as JsonValue};

use error::{Error, Result};
use runner::docker::DockerExporterSpec;
use runner::workspace::Workspace;

// TODO fn: Here's a sure sign you want more data integrity throughout the system. Most of this
// validation should happen way, way upstream, but that's future refactoring work. Also, if the
// payloads are known structures then serde derive and structs will make better work of things.
// For the moment though, this is validation by hand. Welcome to our cave of shame, folks.

/// Validate integration data in job.
pub fn validate_integrations(workspace: &Workspace) -> Result<()> {
    // Validate project integration
    {
        let prj_integrations = workspace.job.get_project_integrations();
        if prj_integrations.is_empty() {
            // No project integrations, that's cool, we're done!
            return Ok(());
        }

        let prj_integration = prj_integrations.first().unwrap();
        if prj_integration.get_integration() != "docker" {
            return Err(Error::InvalidIntegrations(format!(
                "integration '{}' not supported",
                prj_integration.get_integration()
            )));
        }
        if prj_integration.get_integration_name() != "default" {
            return Err(Error::InvalidIntegrations(format!(
                "integration name '{}' not supported",
                prj_integration.get_integration_name()
            )));
        }
        // TODO fn: use a struct and serde to do heavy lifting
        let opts: JsonValue = match serde_json::from_str(prj_integration.get_body()) {
            Ok(json) => json,
            Err(err) => {
                return Err(Error::InvalidIntegrations(format!(
                    "project integration body does not deserialize as JSON: {:?}",
                    err
                )))
            }
        };
        // Required keys with string values
        for str_key in vec!["docker_hub_repo_name"].iter() {
            match opts.get(str_key) {
                Some(val) => {
                    if val.is_string() {
                        if val.as_str().unwrap().is_empty() {
                            return Err(Error::InvalidIntegrations(format!(
                                "project integration {} value must be a nonempty string",
                                str_key
                            )));
                        }
                    } else {
                        return Err(Error::InvalidIntegrations(format!(
                            "project integration {} value must be a string",
                            str_key
                        )));
                    }
                }
                None => {
                    return Err(Error::InvalidIntegrations(
                        format!("project integration {} missing", str_key),
                    ));
                }
            }
        }
        // Required keys with boolean values
        for bool_key in vec!["latest_tag", "version_tag", "version_release_tag"].iter() {
            match opts.get(bool_key) {
                Some(val) => {
                    if !val.is_boolean() {
                        return Err(Error::InvalidIntegrations(format!(
                            "project integration {} value must be a bool",
                            bool_key
                        )));
                    }
                }
                None => {
                    return Err(Error::InvalidIntegrations(
                        format!("project integration {} missing", bool_key),
                    ));
                }
            }
        }
        // Optional keys with string values
        if let Some(val) = opts.get("custom_tag") {
            if !val.is_string() {
                return Err(Error::InvalidIntegrations(format!(
                    "project integration custom_tag value must be a string"
                )));
            }
        }
    }
    // Validate origin integration
    {
        let org_integrations = workspace.job.get_integrations();
        if org_integrations.is_empty() {
            return Err(Error::InvalidIntegrations(format!(
                "missing Docker credentials from origin integrations"
            )));
        }
        let org_integration = org_integrations.first().unwrap();
        if org_integration.get_integration() != "docker" {
            return Err(Error::InvalidIntegrations(format!(
                "origin integration '{}' not supported",
                org_integration.get_integration()
            )));
        }
        if org_integration.get_name() != "docker" {
            return Err(Error::InvalidIntegrations(format!(
                "origin integration name '{}' not supported",
                org_integration.get_name()
            )));
        }
        // TODO fn: use a struct and serde to do heavy lifting
        let creds: JsonValue = match serde_json::from_str(org_integration.get_body()) {
            Ok(json) => json,
            Err(err) => {
                return Err(Error::InvalidIntegrations(format!(
                    "origin integration body does not deserialize as JSON: {:?}",
                    err
                )))
            }
        };
        // Required keys with string values
        for str_key in vec!["username", "password"].iter() {
            match creds.get(str_key) {
                Some(s) => {
                    if s.is_string() {
                        if s.as_str().unwrap().is_empty() {
                            return Err(Error::InvalidIntegrations(format!(
                                "origin integration {} value must be a nonempty string",
                                str_key
                            )));
                        }
                    } else {
                        return Err(Error::InvalidIntegrations(format!(
                            "origin integration {} value must be a string",
                            str_key
                        )));
                    }
                }
                None => {
                    return Err(Error::InvalidIntegrations(
                        format!("origin integration {} missing", str_key),
                    ));
                }
            }
        }
    }
    debug!("validated integrations");
    Ok(())
}


/// Builds the Docker exporter details from the origin and project integrations.
pub fn docker_exporter_spec(workspace: &Workspace) -> DockerExporterSpec {
    // TODO fn: Using this value struct was done to keep the validation, JSON parsing, and
    // craziness in one place and out of the Docker-specific code. Oi, this is embarrassing.

    // Note: There are a lot of `.expect()` calls in this function. That is because the
    // integrations data is assumed to have been already validated via `validate_integrations()`
    // above. As a result, Any panics that occur are most likely due to programmer error and not
    // input validation.

    let creds: JsonValue = serde_json::from_str(
        workspace
            .job
            .get_integrations()
            .first()
            .expect("Origin integrations must not be empty")
            .get_body(),
    ).expect("Origin integrations body must be JSON");
    let opts: JsonValue = serde_json::from_str(
        workspace
            .job
            .get_project_integrations()
            .first()
            .expect("Project integrations must not be empty")
            .get_body(),
    ).expect("Project integrations body must be JSON");
    let custom_tag = match opts.get("custom_tag") {
        Some(val) => {
            let val = val.as_str().expect("custom_tag value is a string");
            if val.is_empty() {
                None
            } else {
                Some(val.to_string())
            }
        }
        None => None,
    };

    DockerExporterSpec {
        username: creds
            .get("username")
            .expect("username key is present")
            .as_str()
            .expect("username value is a string")
            .to_string(),
        password: creds
            .get("password")
            .expect("password key is present")
            .as_str()
            .expect("password value is a string")
            .to_string(),
        docker_hub_repo_name: opts.get("docker_hub_repo_name")
            .expect("docker_hub_repo_name key is present")
            .as_str()
            .expect("docker_hub_repo_name value is a string")
            .to_string(),
        latest_tag: opts.get("latest_tag")
            .expect("latest_tag key is present")
            .as_bool()
            .expect("latest_tag value is a bool"),
        version_tag: opts.get("version_tag")
            .expect("version_tag key is present")
            .as_bool()
            .expect("version_tag value is a bool"),
        version_release_tag: opts.get("version_release_tag")
            .expect("version_release_tag key is present")
            .as_bool()
            .expect("version_release_tag value is a bool"),
        custom_tag: custom_tag,
    }
}
