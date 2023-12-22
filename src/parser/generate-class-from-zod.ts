import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { isZodInstance } from "../helpers";
import { parseShape } from "../parser";
import { AnyZodObject, TypeOf, ZodObject, ZodTypeAny } from "zod";
import { ParsedField, TypeMetadata } from "../types";
import { typeContainers } from "../containers";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";

export const generateClassFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
  rootClassType: ClassType,
): TypeOf<T> => {
  if (rootClassType !== ClassType.INPUT && rootClassType !== ClassType.OBJECT) {
    throw new Error(
      `Generating classes with type of “${rootClassType}” is not supported. Supported types are “InputType” and “ObjectType”.`,
    );
  }

  // Get types container in according to root class type.
  const container = typeContainers[rootClassType];

  //region Duplication guard.
  const previousType = container.get(input);

  if (previousType) {
    return previousType;
  }
  //endregion

  // Initializing a class that will be filled with fields and registered as a one of supported GraphQL types.
  class DynamicZodModel {}
  Object.defineProperty(DynamicZodModel, "name", {
    value: metadata.name,
  });

  // Putting the class to container for further usage.
  container.set(input, DynamicZodModel);

  if (rootClassType === ClassType.INPUT) {
    InputType(metadata.name, {
      description: metadata.description,
    })(DynamicZodModel);
  } else if (rootClassType === ClassType.OBJECT) {
    ObjectType(metadata.name, {
      description: metadata.description,
    })(DynamicZodModel);
  }

  const parsedFields: ParsedField[] = [];

  if (isZodInstance(ZodObject, input)) {
    // Parsing an object shape.
    for (const [key, value] of Object.entries<ZodTypeAny>(input.shape)) {
      parsedFields.push(parseShape(key, value, rootClassType));
    }
  } else {
    // Parsing a primitive value.
    parsedFields.push(parseShape("", input, rootClassType));
  }

  for (const {
    key,
    fieldType,
    nullable,
    defaultValue,
    description,
  } of parsedFields) {
    Field(() => fieldType, {
      nullable,
      defaultValue,
      description,
    })(DynamicZodModel.prototype, key as string);
  }

  return DynamicZodModel;
};
