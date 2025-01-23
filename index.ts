import { expect, type MatcherResult } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import looksSame from "looks-same";

// Single SVG Snapshot Matcher
async function toMatchSvgSnapshot(
  this: any,
  receivedMaybePromise: string | Promise<string>,
  testPathOriginal: string,
  svgName?: string
): Promise<MatcherResult> {
  const received = await receivedMaybePromise;
  const testPath = testPathOriginal.replace(/\.test\.tsx?$/, "");
  const snapshotDir = path.join(path.dirname(testPath), "__snapshots__");
  const snapshotName = svgName
    ? `${svgName}.snap.svg`
    : `${path.basename(testPath)}.snap.svg`;
  const filePath = path.join(snapshotDir, snapshotName);

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const updateSnapshot =
    process.argv.includes("--update-snapshots") ||
    process.argv.includes("-u") ||
    Boolean(process.env["BUN_UPDATE_SNAPSHOTS"]);

  if (!fs.existsSync(filePath) || updateSnapshot) {
    console.log("Writing snapshot to", filePath);
    fs.writeFileSync(filePath, received);
    return {
      message: () => `Snapshot created at ${filePath}`,
      pass: true,
    };
  }

  const existingSnapshot = fs.readFileSync(filePath, "utf-8");

  const result: any = await looksSame(
    Buffer.from(received),
    Buffer.from(existingSnapshot),
    {
      strict: false,
      tolerance: 2,
    }
  );

  if (result.equal) {
    return {
      message: () => "Snapshot matches",
      pass: true,
    };
  }

  const diffPath = filePath.replace(".snap.svg", ".diff.png");
  await looksSame.createDiff({
    reference: Buffer.from(existingSnapshot),
    current: Buffer.from(received),
    diff: diffPath,
    highlightColor: "#ff00ff",
  });

  return {
    message: () => `Snapshot does not match. Diff saved at ${diffPath}`,
    pass: false,
  };
}

// Multiple SVG Snapshot Matcher
async function toMatchMultipleSvgSnapshots(
  this: any,
  receivedMaybePromise: string[] | Promise<string[]>,
  testPathOriginal: string,
  svgNames: string[]
): Promise<MatcherResult> {
  const passed: any[] = [];
  const failed: any[] = [];
  for (let index = 0; index < svgNames.length; index++) {
    const svgName = svgNames[index];
    const received = await receivedMaybePromise;
    const testPath = testPathOriginal.replace(/\.test\.tsx?$/, "");
    const snapshotDir = path.join(path.dirname(testPath), "__snapshots__");
    const snapshotName = svgName
      ? `${svgName}.snap.svg`
      : `${path.basename(testPath)}.snap.svg`;
    const filePath = path.join(snapshotDir, snapshotName);

    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const updateSnapshot =
      process.argv.includes("--update-snapshots") ||
      process.argv.includes("-u") ||
      Boolean(process.env["BUN_UPDATE_SNAPSHOTS"]);

    if (!fs.existsSync(filePath) || updateSnapshot) {
      console.log("Writing snapshot to", filePath);
      fs.writeFileSync(filePath, received[index] as any);
      passed.push({
        message: `Snapshot ${svgName} created at ${filePath}`,
        pass: true,
      });
      continue;
    }

    const existingSnapshot = fs.readFileSync(filePath, "utf-8");

    const result: any = await looksSame(
      Buffer.from(received[index] as any),
      Buffer.from(existingSnapshot),
      {
        strict: false,
        tolerance: 2,
      }
    );

    if (result.equal) {
      passed.push({
        message: `Snapshot ${svgName} matches`,
        pass: true,
      });
      continue;
    }

    const diffPath = filePath.replace(".snap.svg", ".diff.png");
    await looksSame.createDiff({
      reference: Buffer.from(existingSnapshot),
      current: Buffer.from(received[index] as any),
      diff: diffPath,
      highlightColor: "#ff00ff",
    });

    failed.push({
      message: `Snapshot ${svgName} does not match. Diff saved at ${diffPath}`,
      pass: false,
    });
  }
  let aggregatedMessage = "";
  if (failed.length === 0) {
    for (const result of passed) aggregatedMessage += `${result.message}\n`;
    return {
      pass: true,
      message: () => aggregatedMessage,
    };
  }
  for (const result of failed) aggregatedMessage += `${result.message}\n`;
  return {
    pass: false,
    message: () => aggregatedMessage,
  };
}

// Extend expect with the custom matchers
expect.extend({
  toMatchSvgSnapshot: toMatchSvgSnapshot as any,
  toMatchMultipleSvgSnapshots: toMatchMultipleSvgSnapshots as any,
});

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchSvgSnapshot(
      testPath: string,
      svgName?: string
    ): Promise<MatcherResult>;
    toMatchMultipleSvgSnapshots(
      testPath: string,
      svgNames?: string[]
    ): Promise<MatcherResult>;
  }
}
