# zod-to-nestjs-graphql
A package to generate GraphQL types from `zod` contracts.

Inspired by [`nestjs-graphql-zod` package](https://github.com/incetarik/nestjs-graphql-zod). Thanks to [Tarık İnce](https://github.com/incetarik)! 

## How to use

Package exports three functions:
* `generateObjectTypeFromZod` – takes a `zod` contract and returns Object type.
* `generateInputTypeFromZod` – takes a `zod` contract and returns Input type. 
* `registerZodEnumType` – registers `zod`'s “native enum”.

## Important notes

### Naming

The GraphQL schema became very powerful when types it consist have comprehensive and understandable names.
To achieve that, we need a fully manageable way to deal with types naming.
And this package insists that way – every single operation requires you to provide explicit name for type.

### Declarations order

The order in which functions are called is important. You must start from the most nested type/enum and go through the least ones.

## Types support and mapping

* `z.date()` type maps to `GraphQLISODateTime` (from `@nestjs/graphql`).
* `z.string().uuid()` type maps to `GraphQLUUID` (from `graphql-scalars`).
* `z.number().int()` type maps to `Int` (from `@nestjs/graphql`).
* `z.any()` type maps to `GraphQLJSON` (from `graphql-scalars`).

Coming to enums, only “native enum” is supported as of now.

## Examples

Imagine that you have the following contracts:

```typescript
import { z } from 'zod'

const AuthType = z.nativeEnum({
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const)

const CountryEntity = z.object({
  code: z.string(),
  name: z.string(),
})

const UserEntity = z.object({
  id: z.string().uuid(),
  name: z.string().describe('User name.'),
  age: z.number().int().describe('User age.'),
  authType: AuthType,
  country: CountryContract,
  dataBin: z.any()
})
```

To buckle them up to NestJS's GraphQL, you just need to:

```typescript
import { AuthType, CountryEntity, UserEntity } from 'contracts.ts'
import { registerZodEnumType, generateObjectTypeFromZod } from 'zod-to-nestjs-graphql'

registerZodEnumType(AuthType, {
  name: 'AuthType',
});

// Registering nested type first.
export const Country = generateObjectTypeFromZod(CountryEntity, {
  name: 'Country',
  description: 'Country object.'
});

export const User = generateObjectTypeFromZod(UserEntity, {
  name: 'User',
});
```

...then in your resolvers:

```typescript
import { User } from 'types.ts'

@Resolver()
export class AuthResolver {
  @Query(() => User)
  me() {
    // ...
  }
}
```

And it will generate the following GraphQL schema:

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
}
```
