# bun-match-svg

## Usage

```ts
import "bun-match-svg"

test("getAllDimensionsForSchematicBox 1", () => {
  const params: Parameters<typeof getAllDimensionsForSchematicBox>[0] = {
    schWidth: 1,
    schPinSpacing: 0.2,
    schPinStyle: {},
    pinCount: 8,
  }

  const dimensions = getAllDimensionsForSchematicBox(params)

  expect(getSchematicBoxSvg(dimensions)).toMatchSvgSnapshot(
    import.meta.path,
    "schematicbox1"
  )
})
```
