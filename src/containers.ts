import { AnyZodObject } from "zod";
import { ClassType } from "@nestjs/graphql/dist/enums/class-type.enum";

export const typeContainers = {
  [ClassType.INPUT]: new WeakMap<AnyZodObject, any>(),
  [ClassType.OBJECT]: new WeakMap<AnyZodObject, any>(),
};
