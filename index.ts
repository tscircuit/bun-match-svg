import { expect, type MatcherResult } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import looksSame from "looks-same"

async function toMatchSvgSnapshot(
  // biome-ignore lint/suspicious/noExplicitAny: bun doesn't expose
  this: any,
  receivedMaybePromise: string | Promise<string>,
  testPathOriginal: string,
  svgName?: string,
): Promise<MatcherResult> {
  const received = await receivedMaybePromise
  const testPath = testPathOriginal.replace(/\.test\.tsx?$/, "")
  const snapshotDir = path.join(path.dirname(testPath), "__snapshots__")
  const snapshotName = svgName
    ? `${svgName}.snap.svg`
    : `${path.basename(testPath)}.snap.svg`
  const filePath = path.join(snapshotDir, snapshotName)

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true })
  }

  const updateSnapshot =
    process.argv.includes("--update-snapshots") ||
    process.argv.includes("-u") ||
    Boolean(process.env.BUN_UPDATE_SNAPSHOTS)

  if (!fs.existsSync(filePath) || updateSnapshot) {
    console.log("Writing snapshot to", filePath)
    fs.writeFileSync(filePath, received)
    return {
      message: () => `Snapshot created at ${filePath}`,
      pass: true,
    }
  }

  const existingSnapshot = fs.readFileSync(filePath, "utf-8")

  const result = await looksSame(
    Buffer.from(received),
    Buffer.from(existingSnapshot),
    {
      strict: false,
      tolerance: 2,
    },
  )

  if (result.equal) {
    return {
      message: () => "Snapshot matches",
      pass: true,
    }
  }

  const diffPath = filePath.replace(".snap.svg", ".diff.png")
  await looksSame.createDiff({
    reference: Buffer.from(existingSnapshot),
    current: Buffer.from(received),
    diff: diffPath,
    highlightColor: "#ff00ff",
  })

  return {
    message: () => `Snapshot does not match. Diff saved at ${diffPath}`,
    pass: false,
  }
}

async function toMatchMultipleSvgSnapshot(
  // biome-ignore lint/suspicious/noExplicitAny: bun doesn't expose
  this: any,
  receivedMaybePromise: string[] | Promise<string[]>,
  testPathOriginal: string,
  svgNames: string[],
): Promise<MatcherResult> {
  const passed = []
  const failed = []
  for (let index = 0; index < svgNames.length; index++) {
    const svgName = svgNames[index]
    const received = await receivedMaybePromise
    const testPath = testPathOriginal.replace(/\.test\.tsx?$/, "")
    const snapshotDir = path.join(path.dirname(testPath), "__snapshots__")
    const snapshotName = svgName
      ? `${svgName}.snap.svg`
      : `${path.basename(testPath)}.snap.svg`
    const filePath = path.join(snapshotDir, snapshotName)

    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true })
    }

    const updateSnapshot =
      process.argv.includes("--update-snapshots") ||
      process.argv.includes("-u") ||
      Boolean(process.env.BUN_UPDATE_SNAPSHOTS)

    if (!fs.existsSync(filePath) || updateSnapshot) {
      console.log("Writing snapshot to", filePath)
      fs.writeFileSync(filePath, received[index])
      passed.push({
        message: `Snapshot ${svgName} created at ${filePath}`,
        pass: true,
      })
      continue
    }

    const existingSnapshot = fs.readFileSync(filePath, "utf-8")

    const result = await looksSame(
      Buffer.from(received[index]),
      Buffer.from(existingSnapshot),
      {
        strict: false,
        tolerance: 2,
      },
    )

    if (result.equal) {
      passed.push({
        message: `Snapshot ${svgName} matches`,
        pass: true,
      })
      continue
    }

    const diffPath = filePath.replace(".snap.svg", ".diff.png")
    await looksSame.createDiff({
      reference: Buffer.from(existingSnapshot),
      current: Buffer.from(received[index]),
      diff: diffPath,
      highlightColor: "#ff00ff",
    })

    failed.push({
      message: `Snapshot ${svgName} does not match. Diff saved at ${diffPath}`,
      pass: false,
    })
  }
  if (failed.length === 0) {
    let messages = ""
    for (const result of passed) messages += `${result.message}\n`
    return {
      pass: true,
      message: () => messages,
    }
  }
  let messages = ""
  for (const result of failed) messages += `${result.message}\n`
  return {
    pass: false,
    message: () => messages,
  }
}

expect.extend({
  // biome-ignore lint/suspicious/noExplicitAny:
  toMatchSvgSnapshot: toMatchSvgSnapshot as any,
  // biome-ignore lint/suspicious/noExplicitAny:
  toMatchMultipleSvgSnapshot: toMatchMultipleSvgSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchSvgSnapshot(
      testPath: string,
      svgName?: string,
    ): Promise<MatcherResult>
    toMatchMultipleSvgSnapshot(
      testPath: string,
      svgNames?: string[],
    ): Promise<MatcherResult>
  }
}
