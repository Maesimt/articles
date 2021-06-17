# Handle domain errors safely

In our code, we write functions that can fail. They can fail because the domain forbids it or simply because an unknown error happened, like when an http request doesn't receives a response.

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
A new developer have to go read the implementation in order to understand fully what's going on here.
Another problem of this approach is that a function's caller is not forced to handle the failure.
For example, the following code is valid.

```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
    const drink = buyDrink(person, barTender);
    
    person.receives(drink);
};
```

In `helpAFellowWithoutAGlass`, you don't intially see that it can fail. 
You have to go read `buyDrink` to understand that this operation can fail.
The code compiles, but <b>no function is forced to handle the exception</b> in all the code base.

You cannot let this go unpunished, you take upon you to fix the situation. 
You know what to do when you buy a drink for someone and they lied to you. You fine them with a nice 250$.

```typescript
const helpAFellowWithoutAGlass = (person: Person, barTender: BarTender) => {
  try {
    const drink = buyDrink(person, barTender);
    person.receives(drink);
  } catch (e) {
    person.getsAFine(250);
  }
};
```

A few months after the initial writing of the `buyDrink` function, one of your coworker was doing some boyscouting and accidently suppress your `try catch`.
Now the exception is not handled in the codebase and the Typescript compiler is totally fine with it.
You and your coworker are unaware of the issue because you trust your fellow compiler, the all mighty Typescript one.
You will encounter the exception at runtime. It's only a matter of time and your system is not prepared to handle it.
A crash is inevitable. Your monitoring system will inform you in a few week.

Was there a way to prevent all of this ?






