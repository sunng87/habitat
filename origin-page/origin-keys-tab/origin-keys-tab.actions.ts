import { BuilderApiClient } from "../../../BuilderApiClient";
import { addNotification, SUCCESS } from "../../../actions/notifications";
import { parseKey } from "../../../util";
import { fetchOrigin } from "../../origin.actions";

export const POPULATE_ORIGIN_PUBLIC_KEYS = "POPULATE_ORIGIN_PUBLIC_KEYS";
export const SET_ORIGIN_PRIVATE_KEY_UPLOAD_ERROR_MESSAGE =
"SET_ORIGIN_PRIVATE_KEY_UPLOAD_ERROR_MESSAGE";
export const SET_ORIGIN_PUBLIC_KEY_UPLOAD_ERROR_MESSAGE =
"SET_ORIGIN_PUBLIC_KEY_UPLOAD_ERROR_MESSAGE";

export function fetchOriginPublicKeys(originName: string, token: string) {
  return dispatch => {
      new BuilderApiClient(token).getOriginPublicKeys(originName).
          then(response => {
              dispatch(populateOriginPublicKeys(response));
          }).catch(error => {
              dispatch(populateOriginPublicKeys(undefined, error));
          });
  };
}

export function uploadOriginPrivateKey(key: string , token: string) {
  return dispatch => {
      new BuilderApiClient(token).createOriginKey(key).then(() => {
          dispatch(setOriginPrivateKeyUploadErrorMessage(undefined));
          dispatch(fetchOrigin(parseKey(key).origin));  // we need this to make the keys appear after upload
          dispatch(addNotification({
              title: "Origin Private Key Uploaded",
              body: `'${parseKey(key).name}' has been uploaded`,
              type: SUCCESS,
          }));
      }).catch(error => {
          dispatch(setOriginPrivateKeyUploadErrorMessage(error.message));
      });
  };
}

export function uploadOriginPublicKey(key: string, token: string) {
  return dispatch => {
      new BuilderApiClient(token).createOriginKey(key).then(() => {
          dispatch(setOriginPublicKeyUploadErrorMessage(undefined));
          dispatch(fetchOriginPublicKeys(parseKey(key).origin, token));
          dispatch(addNotification({
              title: "Origin Public Key Uploaded",
              body: `'${parseKey(key).name}' has been uploaded`,
              type: SUCCESS,
          }));
      }).catch(error => {
          dispatch(setOriginPublicKeyUploadErrorMessage(error.message));
      });
  };
}

function populateOriginPublicKeys(payload, error = undefined) {
  return {
      type: POPULATE_ORIGIN_PUBLIC_KEYS,
      payload,
      error,
  };
}

function setOriginPrivateKeyUploadErrorMessage(payload: string) {
  return {
      type: SET_ORIGIN_PRIVATE_KEY_UPLOAD_ERROR_MESSAGE,
      payload,
  };
}

function setOriginPublicKeyUploadErrorMessage(payload: string) {
  return {
      type: SET_ORIGIN_PUBLIC_KEY_UPLOAD_ERROR_MESSAGE,
      payload,
  };
}
