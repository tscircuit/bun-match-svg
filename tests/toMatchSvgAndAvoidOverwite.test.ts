import { expect, test, beforeAll, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import "../index";

const testSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>`;

const snapshotDir = path.join(__dirname, "__snapshots__");
const snapshotPath = path.join(snapshotDir, "test.snap.svg");

beforeAll(() => {
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(snapshotPath)) {
    fs.unlinkSync(snapshotPath);
  }
  if (fs.existsSync(snapshotDir)) {
    fs.rmdirSync(snapshotDir, { recursive: true });
  }
});

test("init command should not overwrite existing files", async () => {
  // Create temporary test directory
  const testDir = path.join(__dirname, "init-test");
  const fixturesDir = path.join(testDir, "tests", "fixtures");

  try {
    // Create test directory and its subdirectories
    await fs.promises.mkdir(fixturesDir, { recursive: true });

    // Create test files with custom content
    const testFiles = {
      "tests/svg.test.ts":
        "// Custom test content that should not be overwritten",
      "tests/fixtures/preload.ts":
        "// Custom preload content that should not be overwritten",
      "bunfig.toml": "# Custom bunfig content that should not be overwritten",
    };

    // Write test files
    for (const [filePath, content] of Object.entries(testFiles)) {
      const fullPath = path.join(testDir, filePath);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content);
    }

    // Create package.json for the test
    const packageJson = {
      name: "init-test",
      type: "module",
    };
    await fs.promises.writeFile(
      path.join(testDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Copy cli.ts to test directory
    const cliContent = await fs.promises.readFile(
      path.join(__dirname, "..", "cli.ts"),
      "utf-8"
    );
    await fs.promises.writeFile(path.join(testDir, "cli.ts"), cliContent);

    // Run init command in test directory
    const initProcess = spawn("bun", ["cli.ts", "init"], {
      cwd: testDir,
      stdio: "pipe",
    });

    // Wait for process to complete
    await new Promise<void>((resolve) => {
      initProcess.on("close", () => resolve());
    });

    // Verify files weren't overwritten
    for (const [filePath, expectedContent] of Object.entries(testFiles)) {
      const fullPath = path.join(testDir, filePath);
      const actualContent = await fs.promises.readFile(fullPath, "utf-8");
      expect(actualContent).toBe(expectedContent);
    }
  } finally {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true });
    }
  }
});

test("toMatchSvgSnapshot creates and matches snapshot", async () => {
  // First run: create snapshot
  await expect(testSvg).toMatchSvgSnapshot(import.meta.path, "test");

  // Verify snapshot was created
  expect(fs.existsSync(snapshotPath)).toBe(true);

  // Second run: match existing snapshot
  await expect(testSvg).toMatchSvgSnapshot(import.meta.path, "test");
});
