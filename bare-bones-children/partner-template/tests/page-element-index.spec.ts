import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Hash-based routes (createHashRouter). Add concrete IDs below to exercise
// dynamic segments — leaving them empty skips that variant.
const ROUTES: Array<{ name: string; hash: string }> = [
  { name: "landing", hash: "/" },
  { name: "basic-wallet", hash: "/basic-wallet-facet" },
  { name: "dapp-browser", hash: "/dapp-browser" },
  { name: "daos", hash: "/daos" },
  { name: "payments", hash: "/payments" },
  { name: "vaults", hash: "/vaults" },
  { name: "organizations", hash: "/organizations" },
];

const OUT_DIR = path.resolve(process.cwd(), "tests/.element-index");

type ElementRecord = {
  tag: string;
  role: string | null;
  testId: string | null;
  ariaLabel: string | null;
  name: string | null;
  text: string | null;
  href: string | null;
  type: string | null;
  selector: string;
};

test.describe("page element index", () => {
  test.beforeAll(async () => {
    await mkdir(OUT_DIR, { recursive: true });
  });

  for (const route of ROUTES) {
    test(`index ${route.name}`, async ({ page }) => {
      await page.goto(`/#${route.hash}`);
      await page.waitForLoadState("networkidle").catch(() => {});

      const records = await page.evaluate(() => {
        const SELECTOR =
          "a, button, input, select, textarea, [role='button'], [role='link'], [role='tab'], [data-testid]";
        const nodes = Array.from(document.querySelectorAll(SELECTOR));

        const cssPath = (el: Element): string => {
          const parts: string[] = [];
          let node: Element | null = el;
          while (node && node.nodeType === 1 && parts.length < 6) {
            let part = node.nodeName.toLowerCase();
            if (node.id) {
              part += `#${node.id}`;
              parts.unshift(part);
              break;
            }
            const cls = (node.getAttribute("class") || "")
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .join(".");
            if (cls) part += `.${cls}`;
            const parent = node.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(
                (c) => c.nodeName === node!.nodeName
              );
              if (siblings.length > 1) {
                part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
              }
            }
            parts.unshift(part);
            node = parent;
          }
          return parts.join(" > ");
        };

        return nodes.map((el) => {
          const htmlEl = el as HTMLElement;
          const text = (htmlEl.innerText || htmlEl.textContent || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 120);
          return {
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute("role"),
            testId: el.getAttribute("data-testid"),
            ariaLabel: el.getAttribute("aria-label"),
            name: el.getAttribute("name"),
            text: text || null,
            href: el.getAttribute("href"),
            type: el.getAttribute("type"),
            selector: cssPath(el),
          } satisfies ElementRecord;
        });
      });

      const outFile = path.join(OUT_DIR, `${route.name}.json`);
      await writeFile(
        outFile,
        JSON.stringify(
          { route: route.hash, count: records.length, elements: records },
          null,
          2
        )
      );
    });
  }
});
