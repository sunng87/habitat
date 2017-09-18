import { BuilderApiClient } from "../../BuilderApiClient";
import { fetchMyOrigins, setCurrentOrigin } from "../origin.actions";
import { requestRoute } from "../../actions/router";
import { addNotification, SUCCESS, DANGER } from "../../actions/notifications";


export const SET_CURRENT_ORIGIN_CREATING_FLAG =
"SET_CURRENT_ORIGIN_CREATING_FLAG";

export function createOrigin(origin, token, isFirstOrigin = false) {
  return dispatch => {
      dispatch(setCurrentOriginCreatingFlag(true));

      new BuilderApiClient(token).createOrigin(origin).then(origin => {
          if (isFirstOrigin || origin["default"]) {
              dispatch(setCurrentOrigin(origin));
          }

          dispatch(fetchMyOrigins(token));
          dispatch(setCurrentOriginCreatingFlag(false));
          dispatch(requestRoute(["/origins"]));
          dispatch(addNotification({
              title: "Origin Created",
              body: origin["default"] ?
                  `'${origin["name"]}' is now the default origin` : "",
              type: SUCCESS,
          }));
      }).catch(error => {
          dispatch(setCurrentOriginCreatingFlag(false));
          dispatch(addNotification({
              title: "Failed to Create Origin",
              body: error.message,
              type: DANGER,
          }));
      });
  };
}

function setCurrentOriginCreatingFlag(payload) {
  return {
      type: SET_CURRENT_ORIGIN_CREATING_FLAG,
      payload,
  };
}
