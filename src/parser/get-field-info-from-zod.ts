import type { ZodNumberCheck } from "zod";
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
} from "zod";
import { isZodInstance } from "../helpers";
import { typeContainers } from "../containers";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { ZodTypeInfo } from "../types";
import { GraphQLISODateTime, Int } from "@nestjs/graphql";
import { GraphQLBigInt, GraphQLJSON, GraphQLUUID } from "graphql-scalars";

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
      isEnum,
      isNullable: isItemNullable,
      isOptional: isItemOptional,
    } = data;

    return {
      type: [type],
      isOptional: prop.isOptional(),
      isNullable: prop.isNullable(),
      isEnum,
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
    const { type, isEnum, isOfArray, isItemNullable, isItemOptional } =
      getFieldInfoFromZod(key, prop.unwrap(), rootClassType);

    return {
      type,
      isEnum,
      isOfArray,
      isItemNullable,
      isItemOptional,
      isOptional: true,
      isNullable: prop.isNullable(),
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
    // TODO
    // @ts-ignore
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
  } else if (
    isZodInstance(ZodEnum, prop) ||
    isZodInstance(ZodNativeEnum, prop)
  ) {
    return {
      type: prop.enum,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      isEnum: true,
      description,
    };
  } else if (isZodInstance(ZodDefault, prop)) {
    return getFieldInfoFromZod(key, prop._def.innerType, rootClassType);
  } else if (isZodInstance(ZodTransformer, prop)) {
    return getFieldInfoFromZod(key, prop.innerType(), rootClassType);
  } else if (isZodInstance(ZodNullable, prop)) {
    return getFieldInfoFromZod(key, prop._def.innerType, rootClassType);
  } else if (isZodInstance(ZodDate, prop)) {
    return {
      type: GraphQLISODateTime,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
      isEnum: true,
      description,
    };
  } else if (isZodInstance(ZodAny, prop)) {
    return {
      type: GraphQLJSON,
      isNullable: prop.isNullable(),
      isOptional: prop.isOptional(),
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
  } else if (isZodInstance(ZodUnion, prop)) {
    const unionsContainer = typeContainers["Union"];
    // TODO
    // @ts-ignore
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
  } else {
    throw new Error(
      `Failed to determine type of nested element assigned to key “${key}”.`,
    );
  }
}
