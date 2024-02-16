# zod-to-nestjs-graphql
A package to generate GraphQL types from `zod` contracts.

Inspired by [`nestjs-graphql-zod` package](https://github.com/incetarik/nestjs-graphql-zod). Thanks to [Tarık İnce](https://github.com/incetarik)! 

## How to use

Package exports three functions:
* `generateObjectTypeFromZod` – takes a `zod` contract and returns Object type.
* `generateInputTypeFromZod` – takes a `zod` contract and returns Input type. 
* `registerZodEnumType` – registers enumeration declared using `zod` (both `z.enum()` and `z.nativeEnum()`).

## Important notes

### Naming

The GraphQL schema became very powerful when types it consist have comprehensive and understandable names.
To achieve that, we need a fully manageable way to deal with types naming.
And this package insists that way – every single operation requires you to provide explicit name for type.

### Declaration order

The order in which functions are called is important. You must start from the most nested type/enum and go through the least ones.

## Types support and mapping

* `z.date()` type maps to `GraphQLISODateTime` (from `@nestjs/graphql`).
* `z.string().uuid()` type maps to `GraphQLUUID` (from `graphql-scalars`).
* `z.number().int()` type maps to `Int` (from `@nestjs/graphql`).
* `z.any()` and `z.unknown()` types maps to `GraphQLJSON` (from `graphql-scalars`).
* `z.record()` type (with all the arguments) maps to `GraphQLJSONObject` (from `graphql-scalars`).

## Basic usage

Imagine that you have the following contracts:

```typescript
// contracts.ts

import { z } from 'zod'

export const AuthType = z.nativeEnum({
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const)

export const CountryEntity = z.object({
  code: z.string(),
  name: z.string(),
})

export const UserEntity = z.object({
  id: z.string().uuid(),
  name: z.string().describe('User name.'),
  age: z.number().int().describe('User age.'),
  authType: AuthType,
  country: CountryContract,
  dataBin: z.any(),
  someAmorphousData: z.record(z.string(), z.unknown())
})
```

To transform them up to GraphQL types suitable for NestJS, you need to:

```typescript
// auth.types.ts

import { AuthType, CountryEntity, UserEntity } from 'contracts.ts'
import { registerZodEnumType, generateObjectTypeFromZod } from 'zod-to-nestjs-graphql'

registerZodEnumType(AuthType, {
  name: 'AuthType',
});

export const User = generateObjectTypeFromZod(UserEntity, {
  name: 'User',
});
```

...then in your resolvers:

```typescript
// auth.resolver.ts

import { User } from 'auth.types.ts'

@Resolver()
export class AuthResolver {
  @Query(() => User)
  me() {
    // ...
  }
}
```

And it will produce the following GraphQL schema:

```graphql
enum AuthType {
    PHONE
    EMAIL
}

type Country {
    code: String!
    name: String!
}

type User {
    id: UUID!
  
    """User name."""
    name: String!

    """User age."""
    age: Int!

    authType: AuthType!

    country: Country!
    
    dataBin: GraphQLJSON!

    someAmorphousData: GraphQLJSONObject!
}
```

You don't need to worry about nested objects (like `CountryEntity` in `UserEntity`)
because they're registered automatically (with auto-generated names). 

## GraphQL types auto-registration and name generation

Types auto-registration is enabled by default.

Let's take a case study based on the example above.

```typescript
// auth.types.ts

// ...

export const User = generateObjectTypeFromZod(UserEntity, {
  name: 'User',
});
```

`generateObjectTypeFromZod` here registers two objects.

One is `UserEntity` which is transformed to GraphQL Object type with name `User`.
Its name is explicitly supplied in the `name` option.

Another one is `CountryEntity`.
It nested to `UserEntity` object, in `country` key.
Corresponding GraphQL Object type will be named `Country` –
the name is generated based on the key name, first transformed to PascalCase
(in according to GraphQL naming recommendations).

A few more examples:

```typescript
export const Person = z.object({
  country: CountryContract,           // Country
  personalDetails: DetailsContract,   // PersonalDetails
  misc_data: MiscContract             // MiscData
})
```

## Advanced usage

### Overriding auto-generated names of types

From the example above:

```typescript
// auth.types.ts

// ...

export const User = generateObjectTypeFromZod(UserEntity, {
  name: 'User'
});
```

To override auto-generated name, register an object manually, before it happens automatically (before you will call `generateObjectTypeFromZod`):

```typescript
// auth.types.ts

// Preliminary registering nested type to take full control of it.
export const Country = generateObjectTypeFromZod(CountryEntity, {
  name: 'MySpecialNameOfCountry',
  description: 'Country object.'
});

export const User = generateObjectTypeFromZod(UserEntity, {
  name: 'User'
});
```

Or, in cases if you don't use a newly registered GraphQL type anywhere in resolvers, there is one more way to do this:

```typescript
// auth.types.ts

// ...

export const User = generateObjectTypeFromZod(
  UserEntity,
  { name: 'User' },
  {
    // The order of registration is still important. Register most nested types first.
    additionalRegistrations: [
      [
        Country,
        {
          name: 'MySpecialNameOfCountry',
          description: 'Country object.'
        }
      ],
    ],
  }
);
```

By this we get the same result as in the example above.

### Hot replacements

Occasionally you will need to change the type on the fly. Let's take contracts with highly nested objects inside:

```typescript
// contracts.ts

import { z } from 'zod'

export const NestedDataContract = z.object({
  data: z.object({}),
})

// A contract with highly nesting.
export const UserDataContract = z.object({
  // Property that have many nested objects inside.
  data: NestedDataContract,
})

export const UserEntity = z.object({
  id: z.string().uuid(),
  name: z.string().describe('User name.'),
  data: UserDataContract,
})
```

In case when you don't want to register all these nested types to GraphQL too, just replace it with more appropriate:

```typescript
// auth.types.ts

import { AuthType, CountryEntity, UserEntity } from 'contracts.ts'
import { registerZodEnumType, generateObjectTypeFromZod } from 'zod-to-nestjs-graphql'

registerZodEnumType(AuthType, {
  name: 'AuthType',
});

export const User = generateObjectTypeFromZod(
  UserEntity,
  { name: 'User' },
  {
    hotReplacements: [
      {
        // Replace value of “data” in “UserDataContract” (“NestedDataContract”)
        origin: User.shape.data.shape.data,
        // ...with just “GraphQLJSONObject”.
        replacement: z.record(z.string(), z.unknown())
      },
    ],
  }
);
```

After this, the GraphQL schema would look like:

```graphql
type User {
    id: UUID!
  
    """User name."""
    name: String!

    data: GraphQLJSONObject!
}
```
