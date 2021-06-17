/* eslint-disable @typescript-eslint/no-unused-vars */
export const success = <A, B>(value: B): Result<A, B> => new Success(value);

export const failure = <A, B>(error: A): Result<A, B> => new Failure(error);

interface IResult<A, B> {
  andThen<C>(f: (b: B) => Result<A, C>): Result<A, C>;

  map<C>(f: (b: B) => C): Result<A, C>;

  mapError<C>(f: (a: A) => C): Result<C, B>;

  orElse<C>(f: (a: A) => Result<C, B>): Result<C, B>;

  withDefault<C>(fallback: C): B | C;
}

export type Result<A, B> = Success<A, B> | Failure<A, B>;

class Success<A, B> implements IResult<A, B> {
  public readonly tag: 'Success';
  public readonly value: B;

  constructor(value: B) {
    this.tag = 'Success';
    this.value = value;
  }

  isError = (): this is Failure<A, B> => false;

  isSuccess = (): this is Success<A, B> => true;

  map<C>(f: (b: B) => C): Result<A, C> {
    return success(f(this.value));
  }

  mapError<C>(_f: (a: A) => C): Result<C, B> {
    return success(this.value);
  }

  andThen<C>(f: (a: B) => Result<A, C>): Result<A, C> {
    return f(this.value);
  }

  orElse<C>(_f: (a: A) => Result<C, B>): Result<C, B> {
    return success(this.value);
  }

  withDefault<C>(_fallback: C): B | C {
    return this.value;
  }
}

class Failure<A, B> implements IResult<A, B> {
  public readonly tag: 'Failure';
  public readonly error: A;

  constructor(error: A) {
    this.tag = 'Failure';
    this.error = error;
  }

  isError = (): this is Failure<A, B> => true;

  isSuccess = (): this is Success<A, B> => false;

  map<C>(_f: (b: B) => C): Result<A, C> {
    return failure(this.error);
  }

  mapError<C>(f: (b: A) => C): Result<C, B> {
    return failure(f(this.error));
  }

  andThen<C>(_f: (b: B) => Result<A, C>): Result<A, C> {
    return failure(this.error);
  }

  orElse<C>(f: (a: A) => Result<C, B>): Result<C, B> {
    return f(this.error);
  }

  withDefault<C>(fallback: C): B | C {
    return fallback;
  }
}

export const isSuccess = <A, B>(result: Result<A, B>): result is Success<A, B> => result.tag === 'Success';
export const isFailure = <A, B>(result: Result<A, B>): result is Failure<A, B> => result.tag === 'Failure';
