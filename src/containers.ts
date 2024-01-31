import {
  ZodDiscriminatedUnion,
  ZodEnum,
  ZodNativeEnum,
  ZodTypeAny,
  ZodUnion,
} from "zod";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";

export const typeContainers: {
  [ClassType.INPUT]: WeakMap<ZodTypeAny, any>;
  [ClassType.OBJECT]: WeakMap<ZodTypeAny, any>;
} = {
  [ClassType.INPUT]: new WeakMap<ZodTypeAny, any>(),
  [ClassType.OBJECT]: new WeakMap<ZodTypeAny, any>(),
};

export const replacementContainers: {
  [ClassType.INPUT]: WeakMap<ZodTypeAny, ZodTypeAny>;
  [ClassType.OBJECT]: WeakMap<ZodTypeAny, ZodTypeAny>;
} = {
  [ClassType.INPUT]: new WeakMap<ZodTypeAny, ZodTypeAny>(),
  [ClassType.OBJECT]: new WeakMap<ZodTypeAny, ZodTypeAny>(),
};

export const enumsContainer: WeakMap<
  ZodNativeEnum<any> | ZodEnum<any>,
  { [k: string]: string }
> = new WeakMap<ZodNativeEnum<any> | ZodEnum<any>, { [k: string]: string }>();

export const unionsContainer: WeakMap<
  ZodUnion<any> | ZodDiscriminatedUnion<any, any>,
  any
> = new WeakMap<ZodUnion<any> | ZodDiscriminatedUnion<any, any>, any>();
