import {
  type AnyZodObject,
  type ZodNativeEnum,
  type ZodUnion,
  ZodObject,
  ZodTypeAny,
} from "zod";
import { TypeMetadata, TypeRegistrationExtraOptions } from "./types";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { generateClassFromZod } from "./parser";
import {
  createUnionType,
  EnumOptions,
  registerEnumType,
} from "@nestjs/graphql";
import { ResolveTypeFn } from "@nestjs/graphql/dist/interfaces/resolve-type-fn.interface";
import { replacementContainers, typeContainers } from "./containers";
import { isZodInstance } from "./helpers";

export const replaceInputTypeMember = <
  T extends ZodTypeAny,
  K extends ZodTypeAny,
>(
  origin: T,
  replacement: K,
) => {
  replacementContainers[ClassType.INPUT].set(origin, replacement);
};

export const replaceObjectTypeMember = <
  T extends ZodTypeAny,
  K extends ZodTypeAny,
>(
  origin: T,
  replacement: K,
) => {
  replacementContainers[ClassType.OBJECT].set(origin, replacement);
};

export const generateObjectTypeFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
  extras?: TypeRegistrationExtraOptions,
) => {
  if (extras?.hotReplacements) {
    for (const { origin, replacement } of extras.hotReplacements) {
      replaceObjectTypeMember(origin, replacement);
    }
  }

  if (extras?.additionalRegistrations) {
    for (const [type, metadata] of extras.additionalRegistrations) {
      generateObjectTypeFromZod(type, metadata);
    }
  }

  return generateClassFromZod(input, metadata, ClassType.OBJECT);
};

export const generateInputTypeFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
  extras?: TypeRegistrationExtraOptions,
) => {
  if (extras?.hotReplacements) {
    for (const { origin, replacement } of extras.hotReplacements) {
      replaceInputTypeMember(origin, replacement);
    }
  }

  if (extras?.additionalRegistrations) {
    for (const [type, metadata] of extras.additionalRegistrations) {
      generateInputTypeFromZod(type, metadata);
    }
  }

  return generateClassFromZod(input, metadata, ClassType.INPUT);
};

export const registerZodEnumType = <T extends ZodNativeEnum<any>>(
  input: T,
  metadata: EnumOptions<T["enum"]>,
) => {
  registerEnumType(input.enum, metadata);
};

/**
 * A wrapper around NestJS's `createUnionType` that generates a union type from Zod contract.
 *
 * ***Please ensure that we have registered all elements of union (using `generateObjectTypeFromZod`) before you call this method.***
 *
 * Due to GraphQL does not support unions on InputTypes, so this method operates ObjectTypes only.
 * @link https://github.com/graphql/graphql-spec/issues/488
 */
export const generateUnionTypeFromZod = <T extends ZodUnion<any>>(
  zodUnion: T,
  metadata: TypeMetadata,
  resolveType?: ResolveTypeFn<any, any>,
) => {
  // Get types container accordingly to a root class type.
  const unionsContainer = typeContainers["Union"];
  const objectTypesContainer = typeContainers[ClassType.OBJECT];

  const unionItems: any[] = [];

  for (const unionElementIndex in zodUnion.options) {
    const unionElement = zodUnion.options[unionElementIndex];

    // GraphQL support only Object types as union elements: https://spec.graphql.org/June2018/#sec-Unions
    // Throwing an error if the element is not an object.
    if (!isZodInstance(ZodObject, unionElement)) {
      throw new Error(`Union must contain only objects (“z.object({ ... })”).`);
    }

    const existingType = objectTypesContainer.get(unionElement);

    if (!existingType) {
      throw new Error(
        `An object participating union at index ${unionElementIndex} is not properly registered. Please ensure that we have registered all nested objects (“z.object({ ... })”) before you register the union type.`,
      );
    }

    unionItems.push(existingType);
  }

  const resultingUnion = createUnionType({
    name: metadata.name,
    description: metadata.description,
    // TODO: NestJS docs says:
    //    > The array returned by the types property of the createUnionType function should be given a const assertion.
    //    > If the const assertion is not given, a wrong declaration file will be generated at compile time,
    //    > and an error will occur when using it from another project.
    //  https://docs.nestjs.com/graphql/unions-and-enums
    types: () => unionItems,
    resolveType,
  });

  // Put union to container for further usage.
  unionsContainer.set(zodUnion, resultingUnion);

  return resultingUnion;
};
