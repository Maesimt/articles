# Handle domain errors safely

In our code, we write functions that can fail. They can fail because the domain forbids it or simply because an unknown error happened, like when an http request doesn't receives a response.

## The situation

Here's the situation, we have a function to buy a drink, a customer and a bartender.

```typescript
const buyDrink = (person: Person, barTender: BarTender): Drink => {
  if (!person.isAdult()) {
    throw new IllegalPersonAction('People under 18 cannot drink alcool');
  }
  return barTender.serveClient()
};

class IllegalPersonAction extends Error {
  constructor(message) {
    super(message);
    this.name = 'IllegalPersonAction';
  }
}
```

The signature of our `buyDrink` function is :
```
buyDrink: (Person, BarTender) => Drink
```
Just by reading the type signature, you can't tell that the function might fail.
You have to go read the implementation in order to understand fully what's going on.
Another problem of this approach is that all callers are not forced to handle the possible failure.
For example, you wrote the following code.

```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const drink = buyDrink(person, barTender);
    
    person.receives(drink);
};
```

In `helpAFellowWithoutAGlass`, you don't intially see that it can fail. 
You have to go read `buyDrink` to understand that this operation can fail.
The code compiles, but <b>your function is not forced to handle the exception</b>.
It's wierd because you are probably the best person to know what to do if `buyDrink` doesn't work.

You cannot let this go unpunished, you take upon you to fix the situation. 
You know what to do when you buy a drink for someone and they lied to you. You fine them with a nice 250$.

```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender): Drink => {
  try {
    const drink = buyDrink(person, barTender);
    person.receives(drink);
  } catch (e) {
    person.getsAFine(250);
  }
};
```
#### When it starts to crumble.

A few months after the initial writing of the `buyDrink` function, one of your coworker was doing some boyscouting and accidently suppress your `try catch`.
Now the exception is not handled at all in the codebase and the Typescript compiler is totally fine with it.
You and your coworker are unaware of the issue because you trust your fellow compiler, the all mighty Typescript one.
You will encounter the exception at runtime. It's only a matter of time and your system is not prepared to handle it.
A crash is inevitable. Your monitoring system will inform you in a few week.

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
They first check that the function call didn't produce an error. If `err` is `nil` then they can safely use the `f`.

### Elm

In Elm, they took a different approach. Instead of returning a tuple. They return a value that can either be the right value or an error.
Their structure is defined like this :
```elm
type Result error value
    = Ok value
    | Err error
```
If we code our `buyDrink` function in Elm
``` elm
buyDrink : Person -> BarTender -> Result String Drink
buyDrink person barTender =
  case isAdult person of 
    True ->
      let 
        drink =
          Ok (serveClient barTender)
      in
        
    False ->
      Err "People under 18 cannot drink alcool"
};
```
* Notes : `Ok` and `Err` are type constructor for the Result type.

### FP-TS

In FP-TS they use the same concept has Elm and Haskell. 
They define an `Either` type like this :

```typescript
type Either<E, A> = Left<E> | Right<A>
```
With lots of functions to operate on the type.

### A friendly implementation

We wrote our own implementation of the Either type in Typescript. We did it to reduce the learning curve that comes with libraries like `Fp-Ts`. One of our goal was a syntax that most javascript developers would understand.

For this we defined our own `Result` like this.
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
Now if we rewrite our `buyDrink` function with this.
```typescript
import type { Result } from './Result';
import { success, failure } from './Result';

const buyDrink = (person: Person, barTender: BarTender): Result<String, Drink> => {
  if (!person.isAdult()) {
    return failure('People under 18 cannot drink alcool');
  }
  return success(barTender.serveClient());
};
```
And now the Typescript compiler won't let you access the `.value` on the result if you did not check if it is an error before hand.
```
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const result = buyDrink(person, barTender);
    
    person.receives(result.value); // Won't compile... You are protected!
};
```
To access the value you are force to code the `if` branch and define what you want to do in case of failure.
```
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const result = buyDrink(person, barTender);
    
    if (result.isError()) {
      
    }
    
    person.receives(result.value); // It compiles... The types were narrowed, result is now a guaranteed to be a success !
};
```

### More to it.

There's a bunch of function to operate on Result.
```typescript
interface IResult<A, B> {
  andThen<C>(f: (b: B) => Result<A, C>): Result<A, C>;

  map<C>(f: (b: B) => C): Result<A, C>;

  mapError<C>(f: (a: A) => C): Result<C, B>;

  orElse<C>(f: (a: A) => Result<C, B>): Result<C, B>;

  withDefault<C>(fallback: C): B | C;
}
```
This allows you to define what you want to do with the result in case it went right or wrong. 
You can transform the data, extract values with default if there are not there, etc...
```typescript
const result = fetchPersons().map(takeFirst).withDefault(MikeTyson);
```
The above example is replacing the more verbose way to do it:
```typescript
const result = fetchPersons();

if (result.isError()) {
  return MikeTyson;
}

return takeFirst(result.value);

```
