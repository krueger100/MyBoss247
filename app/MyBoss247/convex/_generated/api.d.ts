/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as challenges from "../challenges.js";
import type * as chat from "../chat.js";
import type * as checkIns from "../checkIns.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as goals from "../goals.js";
import type * as notifications from "../notifications.js";
import type * as partners from "../partners.js";
import type * as projects from "../projects.js";
import type * as reviews from "../reviews.js";
import type * as stats from "../stats.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as warnings from "../warnings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  challenges: typeof challenges;
  chat: typeof chat;
  checkIns: typeof checkIns;
  crons: typeof crons;
  files: typeof files;
  goals: typeof goals;
  notifications: typeof notifications;
  partners: typeof partners;
  projects: typeof projects;
  reviews: typeof reviews;
  stats: typeof stats;
  tasks: typeof tasks;
  users: typeof users;
  warnings: typeof warnings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
