import { failure, success } from '../Result';

describe('Testing Result behavior', () => {
  describe('Smart constructors', () => {
    it('expect .success() to create a success', () => {
      const a = success(123);

      expect(a.isSuccess()).toBeTruthy();
      expect(a.isError()).toBeFalsy();
    });
    it('expect .failure() to create a failure', () => {
      const a = failure(123);

      expect(a.isSuccess()).toBeFalsy();
      expect(a.isError()).toBeTruthy();
    });
  });

  describe('Given a success', () => {
    it('expects value to be available', () => {
      const a = success(123);

      let unwrap;
      if (a.isSuccess()) {
        unwrap = a.value;
      }

      expect(unwrap).toBe(123);
    });

    it('expects isError to be false', () => {
      const a = success(123);

      expect(a.isError()).toBeFalsy();
    });

    it('expects isSuccess to be true', () => {
      const a = success(123);

      expect(a.isSuccess()).toBeTruthy();
    });

    it('expects map to apply the function on the success value', () => {
      const a = success(2);

      const result = a.map((element) => element * 2);

      let value;

      if (result.isSuccess()) {
        value = result.value;
      }

      expect(value).toBe(4);
    });

    it('expects mapError NOT to apply the function to the error', () => {
      const a = success(2);
      const someFunction = jest.fn();

      a.mapError(someFunction);

      expect(someFunction.mock.calls).toHaveLength(0);
    });

    it('expects andThen to apply the function on the success value', () => {
      const a = success(2);

      const result = a.andThen(() => success('win'));

      let value;

      if (result.isSuccess()) {
        value = result.value;
      }

      expect(value).toBe('win');
    });

    it('expects orElse NOT to apply the function on the success value', () => {
      const a = success(2);
      const someFunction = jest.fn();

      a.orElse(someFunction);

      expect(someFunction.mock.calls).toHaveLength(0);
    });

    it('expects withDefault to grab the value from the success', () => {
      const a = success(2);

      const result = a.withDefault(0);

      expect(result).toBe(2);
    });
  });

  describe('Given a failure', () => {
    it('expects error to be available', () => {
      const a = failure(404);

      let error;

      if (a.isError()) {
        error = a.error;
      }

      expect(error).toBe(404);
    });
    it('expects isError to be true', () => {
      const a = failure(404);

      expect(a.isError()).toBeTruthy();
    });
    it('expects isSuccess to be false', () => {
      const a = failure(404);

      expect(a.isSuccess()).toBeFalsy();
    });
    it('expects map NOT to apply the function on the success value', () => {
      const a = failure(404);
      const someFunction = jest.fn();

      a.map(someFunction);

      expect(someFunction.mock.calls).toHaveLength(0);
    });
    it('expects mapError to apply the function to the error', () => {
      const a = failure(404);

      const result = a.mapError((element) => element * 2);

      let error;

      if (result.isError()) {
        error = result.error;
      }

      expect(error).toBe(808);
    });

    it('expects andThen NOT to apply the function on the success value', () => {
      const a = failure(404);
      const someFunction = jest.fn();

      a.andThen(someFunction);

      expect(someFunction.mock.calls).toHaveLength(0);
    });

    it('expects orElse to apply the function on the error value.', () => {
      const a = failure(404);

      const result = a.orElse((element) => failure(element * 2));

      let error;

      if (result.isError()) {
        error = result.error;
      }
      expect(error).toBe(808);
    });

    it('expects withDefault to return the default value', () => {
      const a = failure(404);

      const error = a.withDefault('fallback');

      expect(error).toBe('fallback');
    });
  });

  describe('Complex chaining', () => {
    it('expects every operation to be chainable', () => {
      const result = success(2)
        .map((element) => element * 2)
        .mapError(() => 'A Nice error message')
        .andThen((value) => {
          if (value === 4) {
            return failure('Value was 4');
          }
          return success('Random');
        });

      let error;

      if (result.isError()) {
        error = result.error;
      }

      expect(error).toBe('Value was 4');
    });

    it('expect success value to be accessible outside of type predicate branch', () => {
      const result = success(2);

      if (result.isSuccess()) {
        // The test is beeing able to access value on result;
        result.value;
      } else {
        // The test is beeing able to access error on result;
        result.error;
      }

      expect(true).toBeTruthy();
    });
  });
});
