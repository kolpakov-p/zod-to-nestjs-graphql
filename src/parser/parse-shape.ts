import { ZodObject, ZodType } from "zod";
import { NullableList } from "@nestjs/graphql";
import { replacementContainers } from "../containers";
import { generateDefaults } from "../helpers";
import { getFieldInfoFromZod } from "./get-field-info-from-zod";
import { isZodInstance } from "../helpers";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { ParsedField, ZodTypeInfo } from "../types";

export function parseShape<T extends ZodType>(
  zodInput: T,
  rootClassType: ClassType,
): ParsedField[] {
  // Parsing an object shape.
  if (isZodInstance(ZodObject, zodInput)) {
    return Object.entries(zodInput.shape).map(([key, value]) =>
      parseSingleShape(key, value, rootClassType),
    );
  }

  // Parsing a primitive shape.
  const parsedShape = parseSingleShape("", zodInput, rootClassType);
  return [parsedShape];
}

export function determineNullability(
  typeInfo: ZodTypeInfo,
): boolean | NullableList {
  const { isNullable, isOptional, isOfArray, isItemOptional, isItemNullable } =
    typeInfo;

  let nullable: boolean | NullableList = isNullable || isOptional;

  if (isOfArray) {
    if (isItemNullable || isItemOptional) {
      if (nullable) {
        nullable = "itemsAndList";
      } else {
        nullable = "items";
      }
    }
  }

  return nullable;
}

function parseSingleShape<T extends ZodType>(
  key: string,
  input: T,
  rootClassType: ClassType,
): ParsedField {
  let elementType: ZodTypeInfo;

  //region Replaces member if specified.
  const replacementsContainer = replacementContainers[rootClassType];
  // TODO
  // @ts-ignore
  const replacement = replacementsContainer.get(input);

  if (replacement) {
    elementType = getFieldInfoFromZod(key, replacement, rootClassType);
  }
  //endregion
  else {
    elementType = getFieldInfoFromZod(key, input, rootClassType);
  }

  const { type: fieldType, description } = elementType;

  let defaultValue = elementType.isType ? undefined : generateDefaults(input);
  const nullable = determineNullability(elementType);

  if (nullable === "items") {
    defaultValue = undefined;
  }

  return {
    key,
    fieldType,
    nullable,
    defaultValue,
    description,
  };
}
