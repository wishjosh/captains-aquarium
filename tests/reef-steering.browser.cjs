// Run with Playwright WebKit installed: node tests/reef-steering.browser.cjs <reef.html URL>
const assert = require("node:assert/strict");
const test = require("node:test");
const { devices, webkit } = require("playwright");

test("the reef keeps steering when browser focus changes on a visible page", async () => {
  const url = process.argv[2];
  assert.ok(url, "Pass the URL of a running reef.html preview");
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage(devices["iPhone 13"]);
    await page.goto(url);
    await page.getByRole("button", { name: "물방울 쏘기", exact: true }).tap();
    await page.mouse.move(160, 520);
    await page.mouse.down();
    await page.mouse.move(220, 500);

    const stick = page.locator("#stick");
    const rest = page.locator("#rest");
    assert.ok(await stick.isVisible());
    const focusChange = await page.evaluate(() => {
      // Focusing a child frame produces a browser-generated window blur without hiding the game.
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;width:1px;height:1px;pointer-events:none";
      document.body.appendChild(frame);
      let trusted = false;
      window.addEventListener("blur", (event) => {
        trusted = event.isTrusted;
      }, { once: true });
      const button = frame.contentDocument.createElement("button");
      frame.contentDocument.body.appendChild(button);
      button.focus();
      return { trusted, visible: !document.hidden };
    });
    assert.deepEqual(focusChange, { trusted: true, visible: true });
    assert.equal(await rest.isVisible(), false);
    assert.ok(await stick.isVisible());

    await page.setViewportSize({ width: 390, height: 800 });
    await page.mouse.move(100, 500);
    const offset = await stick.locator("i").evaluate(
      (knob) => new DOMMatrixReadOnly(getComputedStyle(knob).transform).m41,
    );
    assert.ok(await stick.isVisible() && offset < 0, "the held gesture can still turn left");
    await page.mouse.up();
    assert.equal(await stick.isVisible(), false);

    await page.locator("#pause").tap();
    assert.ok(await rest.isVisible());
    await page.locator("#resume").tap();
    assert.equal(await rest.isVisible(), false);
  } finally {
    await browser.close();
  }
});
