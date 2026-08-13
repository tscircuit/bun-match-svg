import { Resvg } from "@resvg/resvg-js"
import looksSame from "@tscircuit/image-utils/looks-same"
import { expect, type MatcherResult } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"

/** Rasterize SVG before pixel comparison; the shared comparator accepts PNG. */
const renderSvgToPng = (svg: string): Uint8Array =>
  new Resvg(Buffer.from(svg)).render().asPng()

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
    ? `${path.basename(testPath)}-${svgName}.snap.svg`
    : `${path.basename(testPath)}.snap.svg`
  const filePath = path.join(snapshotDir, snapshotName)

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true })
  }

  const updateSnapshot =
    process.argv.includes("--update-snapshots") ||
    process.argv.includes("-u") ||
    Boolean(process.env["BUN_UPDATE_SNAPSHOTS"])
  const forceUpdate = Boolean(process.env["FORCE_BUN_UPDATE_SNAPSHOTS"])

  const fileExists = fs.existsSync(filePath)

  if (!fileExists) {
    console.log("Writing snapshot to", filePath)
    fs.writeFileSync(filePath, received)
    return {
      message: () => `Snapshot created at ${filePath}`,
      pass: true,
    }
  }

  const existingSnapshot = fs.readFileSync(filePath, "utf-8")

  const receivedPng = renderSvgToPng(received)
  const existingPng = renderSvgToPng(existingSnapshot)
  const result: any = await looksSame(
    receivedPng,
    existingPng,
    {
      strict: false,
      tolerance: 2,
    },
  )

  if (updateSnapshot) {
    if (!forceUpdate && result.equal) {
      return {
        message: () => "Snapshot matches",
        pass: true,
      }
    }
    console.log("Updating snapshot at", filePath)
    fs.writeFileSync(filePath, received)
    return {
      message: () => `Snapshot updated at ${filePath}`,
      pass: true,
    }
  }

  if (result.equal) {
    return {
      message: () => "Snapshot matches",
      pass: true,
    }
  }

  const diffPath = filePath.replace(".snap.svg", ".diff.png")
  const diffPng = await looksSame.createDiff({
    reference: existingPng,
    current: receivedPng,
    highlightColor: "#ff00ff",
  })
  fs.writeFileSync(diffPath, diffPng)

  return {
    message: () => `Snapshot does not match. Diff saved at ${diffPath}`,
    pass: false,
  }
}

async function toMatchMultipleSvgSnapshots(
  // biome-ignore lint/suspicious/noExplicitAny: bun doesn't expose
  this: any,
  receivedMaybePromise: string[] | Promise<string[]>,
  testPathOriginal: string,
  svgNames: string[],
): Promise<MatcherResult> {
  const passed: any[] = []
  const failed: any[] = []
  for (let index = 0; index < svgNames.length; index++) {
    const svgName = svgNames[index]
    const received = await receivedMaybePromise
    const testPath = testPathOriginal.replace(/\.test\.tsx?$/, "")
    const snapshotDir = path.join(path.dirname(testPath), "__snapshots__")
    const snapshotName = svgName
      ? `${path.basename(testPath)}-${svgName}.snap.svg`
      : `${path.basename(testPath)}.snap.svg`
    const filePath = path.join(snapshotDir, snapshotName)

    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true })
    }

    const updateSnapshot =
      process.argv.includes("--update-snapshots") ||
      process.argv.includes("-u") ||
      Boolean(process.env["BUN_UPDATE_SNAPSHOTS"])
    const forceUpdate = Boolean(process.env["FORCE_BUN_UPDATE_SNAPSHOTS"])

    const fileExists = fs.existsSync(filePath)

    if (!fileExists) {
      console.log("Writing snapshot to", filePath)
      fs.writeFileSync(filePath, received[index] as any)
      passed.push({
        message: `Snapshot ${svgName} created at ${filePath}`,
        pass: true,
      })
      continue
    }

    const existingSnapshot = fs.readFileSync(filePath, "utf-8")

    const receivedPng = renderSvgToPng(received[index] as string)
    const existingPng = renderSvgToPng(existingSnapshot)
    const result: any = await looksSame(
      receivedPng,
      existingPng,
      {
        strict: false,
        tolerance: 2,
      },
    )

    if (updateSnapshot) {
      if (!forceUpdate && result.equal) {
        passed.push({
          message: `Snapshot ${svgName} matches`,
          pass: true,
        })
        continue
      }
      console.log("Updating snapshot at", filePath)
      fs.writeFileSync(filePath, received[index] as any)
      passed.push({
        message: `Snapshot ${svgName} updated at ${filePath}`,
        pass: true,
      })
      continue
    }

    if (result.equal) {
      passed.push({
        message: `Snapshot ${svgName} matches`,
        pass: true,
      })
      continue
    }

    const diffPath = filePath.replace(".snap.svg", ".diff.png")
    const diffPng = await looksSame.createDiff({
      reference: existingPng,
      current: receivedPng,
      highlightColor: "#ff00ff",
    })
    fs.writeFileSync(diffPath, diffPng)

    failed.push({
      message: `Snapshot ${svgName} does not match. Diff saved at ${diffPath}`,
      pass: false,
    })
  }
  let aggregatedMessage = ""
  if (failed.length === 0) {
    for (const result of passed) aggregatedMessage += `${result.message}\n`
    return {
      pass: true,
      message: () => aggregatedMessage,
    }
  }
  for (const result of failed) aggregatedMessage += `${result.message}\n`
  return {
    pass: false,
    message: () => aggregatedMessage,
  }
}

expect.extend({
  // biome-ignore lint/suspicious/noExplicitAny:
  toMatchSvgSnapshot: toMatchSvgSnapshot as any,
  // biome-ignore lint/suspicious/noExplicitAny:
  toMatchMultipleSvgSnapshots: toMatchMultipleSvgSnapshots as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchSvgSnapshot(
      testPath: string,
      svgName?: string,
    ): Promise<MatcherResult>
    toMatchMultipleSvgSnapshots(
      testPath: string,
      svgNames?: string[],
    ): Promise<MatcherResult>
  }
}
