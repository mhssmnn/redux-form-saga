import 'babel-polyfill';
import { PROMISE, createFormAction, formActionSaga, handlePromiseSaga } from '../lib';
import { all, take, takeEvery, race, put, call } from 'redux-saga/effects';
import { expect } from 'chai';
import { isFSA } from 'flux-standard-action';

const PREFIX = 'PREFIX';
const REQUEST = `${PREFIX}_REQUEST`;
const SUCCESS = `${PREFIX}_SUCCESS`;
const FAILURE = `${PREFIX}_FAILURE`;
class SubmissionError {
  constructor(errors) {
    this.error = errors;
  }
}

describe('redux-form-saga', () => {
  describe('createFormAction', () => {
    ['default', 'short'].forEach(function(type) {
      let formAction, action, dispatch, payload, promise, payloadCreator;
      let beforeFn = () => {
        dispatch = (a) => { action = a };
        payload = { mock: 'payload' };
        promise = formAction(payload, dispatch);
        payloadCreator = key => ({ key });
      };

      describe(`with the ${type} implementation`, function() {
        beforeEach(() => {
          if (type === 'default') {
            formAction = createFormAction(
              mockCreateLoginRequest(payloadCreator),
              [SUCCESS, FAILURE],
              payloadCreator
            );
          } else {
            formAction = createFormAction(PREFIX, payloadCreator);
          }

          beforeFn();
        });

        it('should return a promise', () => {
          expect(formAction).to.be.a('function');
          expect(formAction({}).then).to.be.a('function');
        });

        it('should dispatch an FSA compient action', () => {
          expect(isFSA(action)).to.equal(true);
        });

        it('should dispatch an action with the correct structure', () => {
          expect(action.payload).to.have.keys(['defer', 'request', 'types']);
          expect(action.payload.defer).to.have.keys(['reject', 'resolve']);
          expect(action.payload.request).to.have.keys(['payload', 'type']);
          expect(action.payload.types).to.be.an('array');
        });

        it('should dispatch an action with a defer with reject, resolve fns', () => {
          expect(action.payload.defer.reject).to.be.a('function');
          expect(action.payload.defer.resolve).to.be.a('function');
        });

        it('should dispatch an action with the correct request action', () => {
          expect(action.payload.request.payload).to.deep.equal({ key: payload });
          expect(action.payload.request.type).to.equal(REQUEST);
        });

        it('should dispatch an action with the correct types', () => {
          expect(action.payload.types[0]).to.equal(SUCCESS);
          expect(action.payload.types[1]).to.equal(FAILURE);
        });

        it('should return a promise', () => {
          expect(promise).to.be.a('promise');
        });
      });
    });
  });

  describe('formActionSaga', () => {
    let action, defer, request, types;

    beforeEach(() => {
      request = {
        type: REQUEST,
        payload: {},
      };
      defer = {
        resolve: () => {},
        reject: () => {},
      };
      types = [ SUCCESS, FAILURE ];

      action = {
        type: PROMISE,
        payload: {
          defer,
          request,
          types,
        },
      };
    });

    it('should take every PROMISE action and run the handlePromise iterator', function () {
      const iterator = formActionSaga();

      expect(iterator.next().value).to.deep.equal(
        takeEvery(PROMISE, handlePromiseSaga)
      );

      expect(iterator.next().done).to.be.true;
    });

    describe('handlePromiseSaga', () => {
      let iterator;

      beforeEach(() => {
        iterator = handlePromiseSaga(action);
      });

      it('with a successful run it should yield with a TAKE of type FAILURE', () => {
        run({ success: { payload: 'A success' } });
      });

      describe('with a failed run', () => {
        it('should yield with a TAKE of type FAILURE', () => {
          run({ fail: { payload: 'A failure!' } });
        });

        it('should call the promise reject method with a submission ' +
           'error if the failure payload is a submission error', () => {
          const winner = {
            fail: {
              type: FAILURE,
              payload: new SubmissionError({ _error: 'A failure!' })
            }
          };

          expect(iterator.next().value).to.deep.equal(all([
            race({ success: take(SUCCESS), fail: take(FAILURE) }),
            put(request),
          ]));

          expect(iterator.next([winner]).value).to.deep.equal(
            call(defer.reject, new SubmissionError({ _error: 'A failure!' }))
          );
        });
      });


      function run(winner) {
        expect(iterator.next().value).to.deep.equal(all([
          race({ success: take(SUCCESS), fail: take(FAILURE) }),
          put(request),
        ]));

        if (winner.success) {
          expect(iterator.next([winner]).value).to.deep.equal(
            call(defer.resolve, winner.success.payload)
          );
        } else {
          expect(iterator.next([winner]).value).to.deep.equal(
            call(defer.reject, winner.fail.payload)
          );
        }
      }
    });
  });
});

function mockCreateLoginRequest(creator) {
  creator = creator || (ident => ident);
  return (data) => ({
    type: REQUEST,
    payload: creator(data)
  });
}
