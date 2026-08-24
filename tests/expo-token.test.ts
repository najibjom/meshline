import { expect, test } from "vitest";

test("alternate Expo build token authenticates with Expo", async () => {
  const token = process.env.EXPO_TOKEN?.trim();
  expect(token?.length ?? 0).toBeGreaterThan(0);

  const response = await fetch("https://api.expo.dev/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "query CurrentUser { meActor { __typename id } }",
    }),
  });

  expect(response.ok).toBe(true);
  const payload = await response.json();
  expect(payload.errors).toBeUndefined();
  expect(payload.data?.meActor?.id).toBeTruthy();
});
