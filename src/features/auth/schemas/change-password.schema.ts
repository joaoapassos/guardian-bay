import { z } from "zod";
import {
  authenticationPasswordSchema,
  passwordSchema,
} from "./credential.schema";

export const changePasswordSchema = z.strictObject({
  currentPassword: authenticationPasswordSchema,
  newPassword: passwordSchema,
});
