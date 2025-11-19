import { assertEquals } from "../deps.ts";
import { beforeAll, describe, it } from "../deps.ts";
import {
  preparePreprompt,
  preparePrepromptFromSnippet,
} from "../../src/preprompt/index.ts";
import { setSettings } from "../../src/settings.ts";
import { withHistoryDefaults } from "../helpers.ts";

describe("preprompt/preparePreprompt", () => {
  beforeAll(() => {
    setSettings(withHistoryDefaults({
      snippets: [
        {
          name: "noop",
          snippet: "echo {{target}}",
        },
        {
          name: "evaluated",
          snippet: "printf evaluated",
          evaluate: true,
        },
      ],
      completions: [],
    }));
  });

  it("appends trailing space and uses placeholder for cursor", () => {
    const result = preparePreprompt("git {{cmd}} -n");
    assertEquals(result, {
      status: "success",
      buffer: "git  -n ",
      cursor: 4,
    });
  });

  it("fails on empty template", () => {
    const result = preparePreprompt("   ");
    assertEquals(result.status, "failure");
  });

  it("uses end of buffer when placeholder is absent", () => {
    const result = preparePreprompt("docker");
    assertEquals(result, {
      status: "success",
      buffer: "docker ",
      cursor: 7,
    });
  });

  it("prepares from snippet name", async () => {
    const result = await preparePrepromptFromSnippet("noop");
    assertEquals(result, {
      status: "success",
      buffer: "echo  ",
      cursor: 5,
    });
  });

  it("evaluates snippet when flagged", async () => {
    const result = await preparePrepromptFromSnippet("evaluated");
    assertEquals(result, {
      status: "success",
      buffer: "evaluated ",
      cursor: 10,
    });
  });

  it("fails when snippet not found", async () => {
    const result = await preparePrepromptFromSnippet("missing");
    assertEquals(result.status, "failure");
  });
});
