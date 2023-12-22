import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { AnyZodObject, ZodObject, ZodTypeAny } from "zod";
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
    //region Finds an object type because it could be nested.
    let type: ZodObject<any> | undefined;

    if (isZodInstance(ZodObject, value)) {
      type = value as ZodObject<any>;
    }

    if (
      value._def?.innerType &&
      isZodInstance(ZodObject, value._def.innerType)
    ) {
      type = value._def?.innerType;
    }
    //endregion

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
