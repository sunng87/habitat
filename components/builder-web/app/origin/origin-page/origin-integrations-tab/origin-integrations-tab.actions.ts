import { BuilderApiClient } from "../../../BuilderApiClient";

export const POPULATE_ORIGIN_INTEGRATIONS = "POPULATE_ORIGIN_INTEGRATIONS";

export function fetchIntegrations(origin: string, token: string) {
  return dispatch => {
      new BuilderApiClient(token).getDockerHubCredentials(origin).
          then(response => {
              dispatch(populateIntegrations(response));
          }).catch(error => {
              dispatch(populateIntegrations(undefined, error.message));
          });
  };
}

function populateIntegrations(payload, error = undefined) {
  return {
      type: POPULATE_ORIGIN_INTEGRATIONS,
      payload,
      error
  };
}
