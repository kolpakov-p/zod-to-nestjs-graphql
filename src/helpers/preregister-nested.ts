import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import {
  AnyZodObject,
  UnknownKeysParam,
  ZodArray,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodRawShape,
  ZodTypeAny,
} from "zod";
import { typeContainers } from "../containers";
import { generateClassFromZod } from "../parser";
import { NameGeneratorFunction } from "../types";
import { isZodInstance } from "./is-zod-instance";
import { toPascalCase } from "js-convert-case";

const objectTypeNameGenerator = (parentKey: string, currentKey: string) => {
  return toPascalCase(parentKey) + toPascalCase(currentKey);
};

const inputTypeNameGenerator = (parentKey: string, currentKey: string) => {
  return (
    // Convert to PascalCase (just in case).
    toPascalCase(parentKey)
      // Remove “Input” suffix.
      .replace(/Input$/, "") +
    // Convert camelCase to PascalCase.
    toPascalCase(currentKey) +
    // Append “Input” suffix.
    "Input"
  );
};

const extractWrappedObject = (
  value: ZodTypeAny,
):
  | ZodObject<ZodRawShape, UnknownKeysParam, ZodTypeAny, unknown, unknown>
  | undefined => {
  // Return the object if it's found.
  if (isZodInstance(ZodObject, value)) {
    return value;
  }

  // Unwrap objects placed in arrays.
  if (isZodInstance(ZodArray, value)) {
    // In case if an object in array is wrapped additionally.
    return extractWrappedObject(value.element);
  }

  // Unwrap objects wrapped with optional/nullable.
  if (isZodInstance(ZodOptional, value) || isZodInstance(ZodNullable, value)) {
    const firstUnwrap = value.unwrap();

    // In case if an object is wrapped twice.
    return extractWrappedObject(firstUnwrap);
  }

  // Just in case.
  if (value._def?.innerType) {
    return extractWrappedObject(value._def?.innerType);
  }
};

export const preregisterNested = <T extends AnyZodObject>(
  input: T,
  rootClassType: ClassType.OBJECT | ClassType.INPUT,
  parentKeyName: string,
  nameGenerator?: NameGeneratorFunction,
) => {
  nameGenerator ??=
    rootClassType === ClassType.OBJECT
      ? objectTypeNameGenerator
      : inputTypeNameGenerator;

  const typesContainer = typeContainers[rootClassType];

  for (const [key, value] of Object.entries<ZodTypeAny>(input.shape)) {
    // Finds an object type because it could be nested.
    const type = extractWrappedObject(value) as ZodObject<any> | undefined;

    // Skip if there is no object (a primitive/scalar only).
    if (!type) {
      continue;
    }

    //region Skip if a type provided is already registered before.
    const existingType = typesContainer.get(type);

    if (existingType) {
      continue;
    }
    //endregion

    const newTypeName = nameGenerator(parentKeyName, key);

    // Check and register objects nested in the current one.
    preregisterNested(type, rootClassType, newTypeName, nameGenerator);

    generateClassFromZod(
      type,
      {
        name: newTypeName,
        description: type.description,
      },
      rootClassType,
    );
  }
};
