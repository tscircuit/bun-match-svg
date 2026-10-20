import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
  type Mock,
} from "bun:test"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as cli from "../cli"

const tempDir = path.join(__dirname, "cli-test-temp")
const originalCwd = process.cwd()

describe("cli init", () => {
  let bunInitSpy: Mock<typeof cli.bunInit>
  let installSpy: Mock<typeof cli.installDependency>
  let consoleSpy: Mock<typeof console.log>

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  beforeEach(async () => {
    process.chdir(tempDir)
    bunInitSpy = spyOn(cli, "bunInit").mockImplementation(async () => {})
    installSpy = spyOn(cli, "installDependency").mockImplementation(
      async () => {},
    )
    consoleSpy = spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    const files = await fs.readdir(tempDir)
    for (const file of files) {
      await fs.rm(path.join(tempDir, file), { recursive: true, force: true })
    }
    bunInitSpy.mockRestore()
    installSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  test("should create files and config on a fresh project", async () => {
    await cli.init()

    expect(bunInitSpy).toHaveBeenCalledTimes(1)
    expect(installSpy).toHaveBeenCalledTimes(1)

    // Check files
    const testFileExists = await cli.fileExists("tests/svg.test.ts")
    expect(testFileExists).toBe(true)
    const preloadFileExists = await cli.fileExists("tests/fixtures/preload.ts")
    expect(preloadFileExists).toBe(true)
    const bunfigExists = await cli.fileExists("bunfig.toml")
    expect(bunfigExists).toBe(true)

    // Check bunfig.toml content
    const bunfigContent = await fs.readFile("bunfig.toml", "utf-8")
    expect(bunfigContent).toContain(`[test]`)
    expect(bunfigContent).toContain(`preload = ["./tests/fixtures/preload.ts"]`)

    // Check console logs
    const logs = consoleSpy.mock.calls.flat().join("\n")
    expect(logs).toContain("🚀 Initializing bun project...")
    expect(logs).toContain("✅ Created example test in tests/svg.test.ts")
    expect(logs).toContain(
      "✅ Created preload file in tests/fixtures/preload.ts",
    )
    expect(logs).toContain("✅ Created bunfig.toml")
  })

  test("should skip creating files that already exist", async () => {
    // Pre-create files
    await fs.mkdir("tests/fixtures", { recursive: true })
    await fs.writeFile("package.json", "{}")
    await fs.writeFile("tests/svg.test.ts", "test")
    await fs.writeFile("tests/fixtures/preload.ts", "preload")
    await fs.writeFile(
      "bunfig.toml",
      `[test]\npreload = ["./tests/fixtures/preload.ts"]`,
    )

    await cli.init()

    expect(bunInitSpy).toHaveBeenCalledTimes(0)

    const logs = consoleSpy.mock.calls.flat().join("\n")
    expect(logs).toContain("🔒 package.json already exists, skipping bun init.")
    expect(logs).toContain("🔒 tests/svg.test.ts already exists, skipping.")
    expect(logs).toContain(
      "🔒 tests/fixtures/preload.ts already exists, skipping.",
    )
    expect(logs).toContain(
      "🔒 bunfig.toml already has preload configuration, skipping.",
    )
  })

  test("should update bunfig.toml if [test] section exists", async () => {
    await fs.writeFile("bunfig.toml", "[test]")

    await cli.init()

    const bunfigContent = await fs.readFile("bunfig.toml", "utf-8")
    expect(bunfigContent).toBe(
      `[test]\npreload = ["./tests/fixtures/preload.ts"]`,
    )

    const logs = consoleSpy.mock.calls.flat().join("\n")
    expect(logs).toContain("✅ Updated bunfig.toml with preload configuration.")
  })

  test("should append to bunfig.toml if it exists but is unrelated", async () => {
    await fs.writeFile("bunfig.toml", "[some-other-section]")

    await cli.init()

    const bunfigContent = await fs.readFile("bunfig.toml", "utf-8")
    expect(bunfigContent).toContain("[some-other-section]")
    expect(bunfigContent).toContain(
      `\n\n[test]\npreload = ["./tests/fixtures/preload.ts"]`,
    )

    const logs = consoleSpy.mock.calls.flat().join("\n")
    expect(logs).toContain("✅ Added preload configuration to bunfig.toml.")
  })
})
