import { AnyZodObject, ZodTypeAny, ZodUnion } from "zod";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";

export const typeContainers = {
  [ClassType.INPUT]: new WeakMap<AnyZodObject, any>(),
  [ClassType.OBJECT]: new WeakMap<AnyZodObject, any>(),
  Union: new WeakMap<ZodUnion<any>, any>(),
};

export const replacementContainers = {
  [ClassType.INPUT]: new WeakMap<ZodTypeAny, ZodTypeAny>(),
  [ClassType.OBJECT]: new WeakMap<ZodTypeAny, ZodTypeAny>(),
};
