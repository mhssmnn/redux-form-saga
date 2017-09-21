import { take, takeEvery, race, put, call } from 'redux-saga/effects';

const identity = i => i;
const PROMISE = '@@redux-form-saga/PROMISE';
let status = ['REQUEST', 'SUCCESS', 'FAILURE'];

function setTypes(statusOverride) {
 status = statusOverride;
}

function createFormAction (requestAction, types, payloadCreator = identity) {
  const actionMethods = {};
  const formAction = (payload) => ({
    type: PROMISE,
    payload
  });

  // Allow a type prefix to be passed in
  if (typeof requestAction === 'string') {
    requestAction = status.map(s => {
      let a = `${requestAction}_${s}`;
      let subAction = payload => ({
        type: a,
        payload: payloadCreator(payload)
      });

      // translate specific actionType to generic actionType
      actionMethods[s] = a;
      actionMethods[s.toLowerCase()] = subAction;

      return subAction;
    })[0];

    if (types) {
      payloadCreator = types;
    }

    types = [ actionMethods[status[1]], actionMethods[status[2]] ];
  }

  if (types.length !== 2) {
    throw new Error(`Must include two action types: [ ${status[1]}, ${status[2]} ]`);
  }

  return Object.assign((data, dispatch) => {
    return new Promise((resolve, reject) => {
      dispatch(formAction({
        request: requestAction(data),
        defer: { resolve, reject },
        types
      }));
    });
  }, actionMethods);
};

function *handlePromiseSaga({ payload }) {
  const { request, defer, types } = payload;
  const { resolve, reject } = defer;
  const [ SUCCESS, FAIL ] = types;

  const [ winner ] = yield [
    race({
      success: take(SUCCESS),
      fail: take(FAIL),
    }),
    put(request),
  ];

  if (winner.success) {
    yield call(resolve, winner.success && winner.success.payload ? winner.success.payload : winner.success);
  } else {
    yield call(reject, winner.fail && winner.fail.payload ? winner.fail.payload : winner.fail);
  }
}

function *formActionSaga() {
  yield takeEvery(PROMISE, handlePromiseSaga);
}

export {
  PROMISE,
  createFormAction,
  formActionSaga,
  handlePromiseSaga,
  setTypes,
}

export default formActionSaga;
