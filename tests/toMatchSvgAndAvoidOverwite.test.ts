import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const EXAMPLE_SVG = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>`;

// Path to the test file, it will be used to match the snapshot
const testFilePath = import.meta.path;

test("SVG snapshot creation and matching", async () => {
  // First, run the test to create the snapshot
  await expect(EXAMPLE_SVG).toMatchSvgSnapshot(testFilePath);

  // Read the generated snapshot file to check if it was created
  const snapshotPath = join(
    testFilePath.replace(/\.test\.tsx?$/, ""),
    "__snapshots__",
    "svg.test.snap.svg"
  );
  const snapshot = await readFile(snapshotPath, "utf-8");

  // Ensure the snapshot matches the input SVG
  expect(snapshot).toBe(EXAMPLE_SVG);
});

test("SVG snapshot comparison", async () => {
  const firstSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="blue" />
  </svg>`;

  // Second SVG with a slightly different color fill
  const secondSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="green" />
  </svg>`;

  await expect(firstSvg).toMatchSvgSnapshot(testFilePath);
  await expect(secondSvg).toMatchSvgSnapshot(testFilePath);
});
