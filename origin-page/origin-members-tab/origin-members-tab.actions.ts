import { BuilderApiClient } from "../../../BuilderApiClient";
import { fetchOriginInvitations } from "../../origin.actions";

export const POPULATE_ORIGIN_MEMBERS = "POPULATE_ORIGIN_MEMBERS";
export const SET_ORIGIN_USER_INVITE_ERROR_MESSAGE =
"SET_ORIGIN_USER_INVITE_ERROR_MESSAGE";

export function fetchOriginMembers(originName: string, token: string) {
  return dispatch => {
      new BuilderApiClient(token).getOriginMembers(originName).
          then(response => {
              dispatch(populateOriginMembers(response));
          }).catch(error => {
              dispatch(populateOriginMembers(undefined, error));
          });
  };
}

export function inviteUserToOrigin(username: string, origin: string, token: string) {
  return dispatch => {
      new BuilderApiClient(token).inviteUserToOrigin(username, origin).
          then(response => {
              dispatch(setOriginUserInviteErrorMessage(undefined));
              dispatch(fetchOriginInvitations(origin, token));
          }).catch(error => {
              dispatch(setOriginUserInviteErrorMessage(error.message));
          });
  };
}

function populateOriginMembers(payload, error = undefined) {
  return {
      type: POPULATE_ORIGIN_MEMBERS,
      payload,
      error,
  };
}

function setOriginUserInviteErrorMessage(payload: string) {
  return {
      type: SET_ORIGIN_USER_INVITE_ERROR_MESSAGE,
      payload,
  };
}
