import { type AnyZodObject, type ZodNativeEnum, type ZodUnion, ZodObject } from "zod";
import { TypeMetadata } from "./types";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";
import { generateClassFromZod } from "./parser";
import {
  createUnionType,
  EnumOptions,
  registerEnumType,
} from "@nestjs/graphql";
import { ResolveTypeFn } from "@nestjs/graphql/dist/interfaces/resolve-type-fn.interface";
import { typeContainers } from "./containers";
import { isZodInstance } from "./helpers";

export const generateObjectTypeFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
) => {
  return generateClassFromZod(input, metadata, ClassType.OBJECT);
};

export const generateInputTypeFromZod = <T extends AnyZodObject>(
  input: T,
  metadata: TypeMetadata,
) => {
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
 */
export const generateUnionTypeFromZod = <T extends ZodUnion<any>>(
  zodUnion: T,
  metadata: TypeMetadata,
  resolveType?: ResolveTypeFn<any, any>,
) => {
  // Get types container in according to root class type.
  const unionsContainer = typeContainers["Union"];
  const objectTypesContainer = typeContainers[ClassType.OBJECT];

  const unionItems: any[] = [];

  for (const unionElementIndex in zodUnion.options) {
    const unionElement = zodUnion.options[unionElementIndex];

    if (!isZodInstance(ZodObject, unionElement)) {
      throw new Error(`Union must contain only objects (“z.object({ ... })”).`);
    }

    // TODO
    // @ts-ignore
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
