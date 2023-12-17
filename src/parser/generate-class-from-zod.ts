import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { parseShape } from "./index";
import { AnyZodObject, TypeOf } from "zod";
import { TypeMetadata } from "../types";
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

  const parsedFields = parseShape(input, rootClassType);

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
