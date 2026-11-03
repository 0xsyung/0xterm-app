import { test as base, createBdd } from "playwright-bdd";

type Fixtures = Record<string, never>;

export const test = base.extend<Fixtures>({});

export const { Given, When, Then } = createBdd(test);
