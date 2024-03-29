import {
  ZodAny,
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEnum,
  ZodNativeEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTransformer,
  ZodTypeAny,
  ZodLiteral,
  ZodUnion,
  ZodRecord,
  ZodDiscriminatedUnion,
  ZodNumberCheck,
  ZodUnknown,
} from "zod";
import { isZodInstance } from "../helpers";
import { enumsContainer, typeContainers, unionsContainer } from "../containers";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { ZodTypeInfo } from "../types";
import { GraphQLISODateTime, Int } from "@nestjs/graphql";
import {
  GraphQLBigInt,
  GraphQLJSON,
  GraphQLJSONObject,
  GraphQLUUID,
} from "graphql-scalars";

export function getFieldInfoFromZod(
  key: string,
  prop: ZodTypeAny,
  rootClassType: ClassType,
): ZodTypeInfo {
  // Getting field description.
  const description = prop.description;

  if (isZodInstance(ZodArray, prop)) {
    const data = getFieldInfoFromZod(key, prop.element, rootClassType);

    const {
      type,
      isNullable: isItemNullable,
      isOptional: isItemOptional,
    } = data;

    return {
      type: [type],
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      isOfArray: true,
      isItemNullable,
      isItemOptional,
      description,
    };
  } else if (isZodInstance(ZodBoolean, prop)) {
    return {
      type: Boolean,
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      description,
    };
  }

  if (isZodInstance(ZodString, prop)) {
    return {
      type: prop.isUUID ? GraphQLUUID : String,
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      description,
    };
  } else if (isZodInstance(ZodNumber, prop)) {
    const isInt = Boolean(
      prop._def.checks.find((check: ZodNumberCheck) => check.kind === "int"),
    );

    return {
      type: isInt ? Int : Number,
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      description,
    };
  } else if (isZodInstance(ZodOptional, prop)) {
    const { type, isOfArray, isItemNullable, isItemOptional, isNullable } =
      getFieldInfoFromZod(key, prop.unwrap(), rootClassType);

    return {
      type,
      isOfArray,
      isItemNullable,
      isItemOptional,
      isOptional: true,
      isNullable,
      description,
    };
  } else if (isZodInstance(ZodNullable, prop)) {
    const { type, isOfArray, isItemNullable, isItemOptional, isOptional } =
      getFieldInfoFromZod(key, prop.unwrap(), rootClassType);

    return {
      type,
      isOfArray,
      isItemNullable,
      isItemOptional,
      isOptional,
      isNullable: true,
      description,
    };
  } else if (isZodInstance(ZodObject, prop)) {
    if (
      rootClassType !== ClassType.INPUT &&
      rootClassType !== ClassType.OBJECT
    ) {
      throw new Error(
        `Generating classes with type of “${rootClassType}” is not supported. Supported types are “InputType” and “ObjectType”.`,
      );
    }

    const typeContainer = typeContainers[rootClassType];
    const existingType = typeContainer.get(prop);

    if (!existingType) {
      throw new Error(
        `Nested object assigned to key “${key}” is not properly registered. Please ensure that all nested objects (z.object()) are registered before you register the root type.`,
      );
    }

    return {
      type: existingType,
      isType: true,
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      description,
    };
    // In order of backward compatibility, returning nativeEnum's declaration as-is.
    // It's ok because the resulting object of `prop.enum` doesn't change each call.
  } else if (isZodInstance(ZodNativeEnum, prop)) {
    return {
      type: prop.enum,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      description,
    };
  } else if (isZodInstance(ZodEnum, prop)) {
    const preregisteredDeclaration = enumsContainer.get(prop);

    if (!preregisteredDeclaration) {
      throw new Error(
        `Enumeration type assigned to key “${key}” is not properly registered. Please registered all nested enumeration types before you register the root one.`,
      );
    }

    return {
      type: preregisteredDeclaration,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      description,
    };
  } else if (isZodInstance(ZodDefault, prop)) {
    return getFieldInfoFromZod(key, prop._def.innerType, rootClassType);
  } else if (isZodInstance(ZodTransformer, prop)) {
    return getFieldInfoFromZod(key, prop.innerType(), rootClassType);
  } else if (isZodInstance(ZodDate, prop)) {
    return {
      type: GraphQLISODateTime,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      description,
    };
  } else if (isZodInstance(ZodAny, prop)) {
    // z.any() is both optional and nullable by default, which is inappropriate applying for GraphQL JSON type.
    return {
      type: GraphQLJSON,
      isNullable: false,
      isOptional: false,
      description,
    };
  } else if (isZodInstance(ZodUnknown, prop)) {
    // z.unknown() is both optional and nullable by default, which is inappropriate applying for GraphQL JSON type.
    return {
      type: GraphQLJSON,
      isNullable: false,
      isOptional: false,
      description,
    };
  } else if (isZodInstance(ZodLiteral, prop)) {
    // Due to GraphQL specification does not declare literal types, just casting Zod literals to the nearest
    // appropriate type.

    if (typeof prop.value === "boolean") {
      return {
        type: Boolean,
        isOptional: prop.isOptional(),
        isNullable: prop.isNullable(),
        description,
      };
    }

    if (typeof prop.value === "bigint") {
      return {
        type: GraphQLBigInt,
        isOptional: prop.isOptional(),
        isNullable: prop.isNullable(),
        description,
      };
    }

    if (typeof prop.value === "number") {
      return {
        type: Number,
        isOptional: prop.isOptional(),
        isNullable: prop.isNullable(),
        description,
      };
    }

    // Cast to “String” by default.
    return {
      type: String,
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      description,
    };
  } else if (
    isZodInstance(ZodUnion, prop) ||
    isZodInstance(ZodDiscriminatedUnion, prop)
  ) {
    const preregisteredUnion = unionsContainer.get(prop);

    if (!preregisteredUnion) {
      throw new Error(
        `Nested union assigned to key “${key}” is not properly registered. Please register it before you register the type it nested in.`,
      );
    }

    return {
      type: preregisteredUnion,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      description,
    };
  } else if (isZodInstance(ZodRecord, prop)) {
    return {
      type: GraphQLJSONObject,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      description,
    };
  } else {
    throw new Error(
      `Failed to determine type of nested element assigned to key “${key}”.`,
    );
  }
}
