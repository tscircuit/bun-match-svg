import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const EXAMPLE_TEST = `import { expect, test } from "bun:test";

const testSvg = \`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>\`;

test("svg snapshot example", async () => {
  // First run will create the snapshot
  // Subsequent runs will compare against the saved snapshot
  await expect(testSvg).toMatchSvgSnapshot(import.meta.path);
});
`;

const PRELOAD_FILE = `import "bun-match-svg";`;

const BUNFIG = `[test]
preload = ["./tests/fixtures/preload.ts"];`;

async function installDependency() {
  return new Promise((resolve, reject) => {
    const install = spawn("bun", ["add", "-d", "bun-match-svg"], {
      stdio: "inherit",
    });

    install.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
}

async function init() {
  try {
    console.log("📦 Installing bun-match-svg...");
    await installDependency();

    await mkdir("tests/fixtures", { recursive: true });

    const files = [
      { path: "tests/svg.test.ts", content: EXAMPLE_TEST },
      { path: "tests/fixtures/preload.ts", content: PRELOAD_FILE },
      { path: "bunfig.toml", content: BUNFIG },
    ];

    for (const file of files) {
      if (existsSync(file.path)) {
        console.log(`⚠️  Skipped creating ${file.path} (file already exists)`);
        continue;
      }
      await writeFile(file.path, file.content);
      console.log(`✅ Created ${file.path}`);
    }

    console.log("\n🎉 You can now run: bun test");
  } catch (error) {
    console.error("❌ Error during initialization:", error);
    process.exit(1);
  }
}

const command = process.argv[2];

if (command === "init") {
  init().catch(console.error);
} else {
  console.log("Usage: bunx bun-match-svg init");
}
