# Safely handle domain errors in Typescript

In our code, we write functions that may fail. They could fail because the domain forbids the action or simply because an unknown error happens, e.g. when an HTTP request doesn't receive a response.

##### Keep in mind this example is more related to functional programming than object-oriented programming.

## The situation

Here's the situation: we have a function to serve a drink, which needs a person and a bartender.

```typescript
class BarTender {
  serve = (person: Person): Drink => {
    if (!person.isAdult()) {
      throw new IllegalPersonAction('People under 18 cannot drink alcool');
    }
    
    // For our example's sake, we break TDA by not doing: person.takes(new Drink('...'));
    // Just roll with it :D
    return new Drink('old fashionned'); 
  };
}

class IllegalPersonAction extends Error {
  constructor(message) {
    super(message);
    this.name = 'IllegalPersonAction';
  }
}
```

The signature of our `serve` function is :
```
serve: Person -> Drink
```
Just by reading the type signature, you can't tell that the `serve` function is prone to failing.
It says: if you give me a Person, I'll give you a drink. There is no mention of any exceptions.
You have to explore the implementation in order to fully understand what's going on.
Another inconvenience with our current approach is that none of the functions using `serve` are required to handle its possible failure.
Let's say you've written the following code.

```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const drink = bartender.serve(person);
    
    person.takes(drink);
};
```

When writing `helpAFellowWithoutAGlass`, you forgot that `serve` may fail. 
The code compiles, but <b>your function is not handling the exception</b>.

Fortunately, you understand how `serve` works and you know how best to handle the situation.
You cannot let this go unpunished, you take upon you to fix the situation. 
You know what to do when you buy a drink for someone and they lied about their age. You fine them with a nice 250$.

```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
  try {
    const drink = bartender.serve(person);
    
    person.takes(drink);
  } catch (e) {
    person.isFined(250);
  }
};
```
#### When it starts to crumble.

A few months after the initial writing of the `helpAFellowWithoutAGlass` function, one of your coworker refactors and accidentally suppresses the `try/catch`.
Now the exception is not handled at all in the codebase and the Typescript compiler is totally fine with it.
You and your coworker are unaware of the issue because you trust your fellow compiler, mighty Typescript.
The problem is that you will encounter the exception at runtime. It's only a matter of time and your system is not prepared to for it.
A crash is inevitable and you will be notified down the line that this horrible mistake happened to an important client through your monitoring system (if you've implemented one).

## Was there a way to prevent all of this ?

It would be nice if the Typescript compiler could help us with this. Let's check how the other languages are handling possible failures.

### Go
In `Go`, they express that a function can fail by returning a tuple.
```Go
f, err := repository.getSomething()
if err != nil {
    log.Fatal(err)
}
doSomething(f)
```
They first check that the function call didn't produce an error and then, if `err` is `nil`, only then can they safely use `f`.

[Documentation](https://golang.org/doc/tutorial/handle-errors)

### Elm

In Elm, they took a different approach: instead of returning a tuple, they return a value that can either be the right value or an error.
Their structure is defined like this:
```elm
type Result error value
    = Ok value
    | Err error
```
If we code our `serve` function in Elm, it could look like:
``` elm
serve : Person -> Result String Drink
serve person =
  case isAdult person of 
    True ->
      Ok (Drink "old fashionned")
        
    False ->
      Err "People under 18 cannot drink alcool"
```
* Notes : `Ok` and `Err` are type constructors of the Result type.

[Documentation](https://package.elm-lang.org/packages/elm/core/latest/Result)

### fp-ts

In fp-ts they use the same concept as Elm and Haskell. 
They define an `Either` type like this.

```typescript
type Either<E, A> = Left<E> | Right<A>
```
With lots of further features to operate on the type.

[Documentation](https://gcanti.github.io/fp-ts/modules/Either.ts.html)

### A friendly implementation

We wrote our own implementation of the `Either` type in Typescript. We did it to reduce the learning curve that comes with libraries like `fp-ts` etc. One of our goals was a syntax that most `javascript` developers would quickly understand.

With this goald in mind, we defined our own `Result`:
```typescript
type Result<A, B> = Success<A, B> | Failure<A, B>;

class Success<A, B> implements IResult<A, B> {
  public readonly tag: 'Success';
  public readonly value: B;
  // ...
}

class Failure<A, B> implements IResult<A, B> {
  public readonly tag: 'Failure';
  public readonly error: A;
  // ...
}
```
Now, if we refacotr our `serve` function using our new `Result`,
```typescript
import type { Result } from './Result';
import { success, failure } from './Result';

class BarTender {
  serve = (person: Person): Result<String, Drink> => {
    if (!person.isAdult()) {
       return failure('People under 18 cannot drink alcool');
    }
    return success(new Drink("old fashionned"); 
  };
}
```
Voilà! now the Typescript compiler won't let you access the `.value` on the result if you haven't checked if it carried an error beforehand.
```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const result = barTender.serve(person);
    
    person.receives(result.value); // Won't compile... You are protected!
};
```
To access the value you are forced to code the `if` branch and define what you want to do in case of a failure.
```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const result = barTender.serve(person);
    
    if (result.isError()) {
      person.getsAFine(250);
    }
    
    person.receives(result.value); // It compiles... The types were narrowed, result is now guaranteed to be a success !
};
```
With this approach, you and your coworker are forced to handle the domain error. The compiler will help you remember every possible case. If you don't handle it right now. The `Result` type will bubble up in the signature and you'll be forced to handle it in the next caller until someone does handle it. You encode your domain errors in the type system and you cannot skip the handling like you could with exceptions in `javascript`. It definitely is a safer way to program robust systems.

### More to it.
There's a bunch of function to operate on `Result`.
```typescript
interface IResult<A, B> {
  andThen<C>(f: (b: B) => Result<A, C>): Result<A, C>;

  map<C>(f: (b: B) => C): Result<A, C>;

  mapError<C>(f: (a: A) => C): Result<C, B>;

  orElse<C>(f: (a: A) => Result<C, B>): Result<C, B>;

  withDefault<C>(fallback: C): B | C;
}
```
It allows you to define what you want to do with the result in case it went right or wrong. 
You can manipulate the data, extract values and define default fallbacks in case something is missing, etc...
```typescript
const result = fetchPersons().map(takeFirst).withDefault(MikeTyson);
```
The above example is replacing this more verbose way to do the equivalent.
```typescript
const result = fetchPersons();

if (result.isError()) {
  return MikeTyson;
}

return takeFirst(result.value);

```
To understand the endless possibilities this implementation provides, check out the source!
- [Source](https://github.com/Maesimt/articles/blob/main/Result.ts)
- [Tests](https://github.com/Maesimt/articles/blob/main/Result.test.ts)


#### Special thanks to

- [Olivier gamache](https://www.linkedin.com/in/olivier-gamache-1337420/) for clarifying my examples and helping with my grammar.
- [Benjamin Matte-Jean](https://www.linkedin.com/in/benjamin-matte-jean-696a241a1/) for revising this.
- [Nexapp](https://nexapp.ca/) for beeing supportive.
