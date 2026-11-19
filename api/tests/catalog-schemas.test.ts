import { describe, expect, it } from "vitest";

import {
  CreateLessonTypeSchema,
  UpdateLessonTypeSchema,
} from "../src/features/lesson-types/schema.js";
import {
  CreateTextbookSchema,
  UpdateTextbookSchema,
} from "../src/features/textbooks/schema.js";

describe("catalog request schemas", () => {
  it("accepts a lesson type with the screen fields", () => {
    expect(CreateLessonTypeSchema.parse({
      name: "マンツーマン会話 60分",
      level: "全レベル",
      durationMinutes: 60,
      priceMinor: 4500,
    })).toMatchObject({ currency: "JPY" });
  });

  it("rejects an invalid lesson duration", () => {
    expect(() => CreateLessonTypeSchema.parse({
      name: "無効なレッスン",
      level: "全レベル",
      durationMinutes: 0,
      priceMinor: 4500,
    })).toThrow();
  });

  it("allows partial lesson type updates", () => {
    expect(UpdateLessonTypeSchema.parse({ priceMinor: 5200 })).toEqual({ priceMinor: 5200 });
  });

  it("requires at least one lesson type update field", () => {
    expect(() => UpdateLessonTypeSchema.parse({})).toThrow();
  });

  it("accepts a selling textbook", () => {
    expect(CreateTextbookSchema.parse({
      title: "みんなの日本語 初級I",
      publisher: "スリーエーネットワーク",
      priceMinor: 2750,
    })).toMatchObject({ currency: "JPY", status: "selling" });
  });

  it("accepts discontinuing a textbook", () => {
    expect(UpdateTextbookSchema.parse({ status: "discontinued" })).toEqual({ status: "discontinued" });
  });

  it("rejects a negative textbook price", () => {
    expect(() => CreateTextbookSchema.parse({
      title: "無効な教科書",
      publisher: "出版社",
      priceMinor: -1,
    })).toThrow();
  });

  it("requires at least one textbook update field", () => {
    expect(() => UpdateTextbookSchema.parse({})).toThrow();
  });
});
