# redux-form-saga
Connecting [Redux Form](https://github.com/erikras/redux-form) and [Redux Saga](https://github.com/yelouafi/redux-saga) through a saga.

[![Build Status](https://travis-ci.org/mhssmnn/redux-form-saga.svg)](https://travis-ci.org/mhssmnn/redux-form-saga) [![npm version](https://badge.fury.io/js/redux-form-saga.svg)](http://badge.fury.io/js/redux-form-saga)

```javascript
npm install --save redux-form-saga
```

## Why do I need this?

If you are using both Redux Saga and Redux Form so you need a way to handle your form submission/validation inside your sagas. `redux-form-saga` provides a way to handle your form inside your saga as easy as it can be.

## Installation

### Using npm
```javascript
npm install --save redux-form-saga
```

### Using yarn
```javascript
yarn add redux-form-saga
```

## Preparation

First of all, include `babel-polyfill` to your application (this module uses native Promises and generators).

```javascript
import 'babel-polyfill';
```

Then, you need to run provided `formActionSaga`  in your `sagaMiddleware.run()`:

```javascript
import formActionSaga from 'redux-form-saga';

const sagas = [
  yourFirstSaga,
  yourSecondSaga,
  // ...
  formActionSaga,
];
sagas.forEach((saga) => sagaMiddleware.run(saga));
```

## Usage

Let's take a look how to use the package by simple example – login form.
Let's start with creating a form action:

```javascript
// actions.js
import { createFormAction } from 'redux-form-saga';

export const login = createFormAction('LOGIN');
```

Then, let's create some form:

```javascript
// LoginForm.js

import React, { Component } from 'react'
import { reduxForm, Field } from 'redux-form';

import { login } from './actions'; // importing our action

export default class LoginForm extends Component {
  render() {
    const { handleSubmit } = this.props; // handleSubmit is provided by reduxForm
    const submit = handleSubmit(login); // creating our submit handler by passing our action
    // to handleSubmit as it stated in redux-form documentation
    // and bind our submit handler to onSubmit action:

    return (
      <form onSubmit={submit}>
        <Field component="input" name="login" type="text" placeholder="Login" />
        <Field component="input" name="password" type="password" placeholder="Password" />
        <button type="submit">Log in</button>
      </form>
    );
  }
}
```

Ok, we are almost done, it's time to create our saga to handle our form submission:

```javascript
// sagas.js
import { takeEvery, put, call } from 'redux-saga/effects';
import { SubmissionError } from 'redux-form';
import apiClient from './apiClient'; // let's imagine we have some api client
import { login } from './actions'; // importing our action

function* loginWatcherSaga() {
  yield takeEvery(login.REQUEST, handleLoginSaga); // see details what is REQUEST param below
}

function* handleLoginSaga(action) {
  const { login, password } = action.payload;

  try {
    yield call(apiClient.login, { login, password }); // calling our api method
    // it should return promise
    // promise should be resolved if login successfull
    // or rejected if login credentials is wrong

    // so if apiClient promise resolved, then we can notify our form about successful response
    yield put(login.success());
    // do something else here ...
  } catch (error) {
    // if apiClient promise rejected, then we will be here
    // we need mark form as failed and pass errors to it
    const formError = new SubmissionError({
      login: 'User with this login is not found', // specific field error
      _error: 'Login failed, please check your credentials and try again', // global form error
    });

    yield put(login.failure(formError));
  }
}

export default loginWatcherSaga;
```

## Under the hood

`createFormAction` function creates a smart function, specially designed for `redux-form` form validations.

```javascript
const someAction = createFormAction('SOME_ACTION_PREFIX');
```

`someAction` is now a function, that has a signature `(payload, dispatch) => Promise`, it takes payload (form values) and `dispatch` function as parameters (as `redux-form` do) and returns a `Promise` (as `redux-form` waiting for).

Also `someAction` has few parameters: `REQUEST`, `SUCCESS` and `FAILURE` parameters are action types, that can be used in your sagas and/or reducers:

```javascript
someAction.REQUEST === 'SOME_ACTION_PREFIX_REQUEST';
someAction.SUCCESS === 'SOME_ACTION_PREFIX_SUCCESS';
someAction.FAILURE === 'SOME_ACTION_PREFIX_FAILURE';
```

When `someAction` is called, `someAction.REQUEST` action as triggered and all form values a passed as a payload.
When `someAction.SUCCESS` action is triggered, promise given to `redux-form` (result of calling `someAction(payload, dispatch)`) is resolved, so form notified that submit was successful.
When `someAction.FAILURE` action is triggered, promise is rejected. For submit validation you have to pass an instance of `SubmissionError` as a payload for the action to send errors to the form.

For easy dispatching there are helper params (functions) `request`, `success`, `failure`:

```javascript
someAction.request(payload) === { type: 'SOME_ACTION_PREFIX_REQUEST', payload };
someAction.success(payload) === { type: 'SOME_ACTION_PREFIX_SUCCESS', payload };
someAction.failure(payload) === { type: 'SOME_ACTION_PREFIX_FAILURE', payload };
```

So, when you `put(someAction.success())` in your saga, `SOME_ACTION_PREFIX_SUCCESS` action is triggered and form promise resolves. When you `put(someAction.failure(error))`, `SOME_ACTION_PREFIX_FAILURE` action is triggered and form promise rejects with `error` passed to form (once again: for submit validation you have to pass instance of `SubmissionError`).

## Forks
[`redux-saga-actions`](https://github.com/afitiskin/redux-saga-actions) – Improved documentation, updated API

[`redux-saga-routines`](https://github.com/afitiskin/redux-saga-routines) – Reworked idea of `redux-saga-actions`

## Scripts

```
$ npm run test
```

## License

MIT
