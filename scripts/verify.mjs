import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const pages = ["index.html", "learn.html", "combinations.html", "randomness.html", "guide.html", "about.html", "privacy.html", "terms.html"];
const expectedBase = "https://pioneerddoji.github.io/";
const failures = [];
const titles = new Set();
const canonicals = new Set();

function check(condition, message) {
  if (!condition) failures.push(message);
}

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  check(Boolean(title) && !titles.has(title), `${page}: title is missing or duplicated`);
  check(Boolean(canonical) && !canonicals.has(canonical), `${page}: canonical is missing or duplicated`);
  if (title) titles.add(title);
  if (canonical) canonicals.add(canonical);
  check((html.match(/google-adsense-account/g) || []).length === 1, `${page}: invalid AdSense meta count`);
  check((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length === 1, `${page}: invalid AdSense loader count`);
  check(/<meta name="description" content="[^"]{40,}"/.test(html), `${page}: description is missing or too short`);
  check(/<main[ >]/.test(html) && /<nav[ >]/.test(html) && /<footer[ >]/.test(html), `${page}: landmark is missing`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  check(ids.length === new Set(ids).size, `${page}: duplicate id`);
  for (const label of html.matchAll(/<label[^>]+for="([^"]+)"/g)) {
    check(ids.includes(label[1]), `${page}: label target #${label[1]} is missing`);
  }
  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const value = href[1];
    if (/^(https?:|mailto:|#)/.test(value)) continue;
    const target = value.split("#")[0];
    check(fs.existsSync(path.join(root, target)), `${page}: link target ${target} is missing`);
  }

  for (const script of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(script[1])) {
      try { JSON.parse(script[2]); } catch { failures.push(`${page}: invalid JSON-LD`); }
    } else {
      try { new Function(script[2]); } catch { failures.push(`${page}: invalid inline script`); }
    }
  }
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
check(index.includes('action="https://formspree.io/f/xgogjrnb"'), "Formspree endpoint is incorrect");
check(index.includes("https://joco-test.disqus.com/embed.js"), "Disqus embed is missing");
check(fs.readFileSync(path.join(root, "ads.txt"), "utf8").trim() === "google.com, pub-9624604767498126, DIRECT, f08c47fec0942fa0", "ads.txt is incorrect");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const page of pages) {
  const url = page === "index.html" ? expectedBase : expectedBase + page;
  check(sitemap.includes(`<loc>${url}</loc>`), `sitemap: ${url} is missing`);
}
check(fs.readFileSync(path.join(root, "robots.txt"), "utf8").includes(expectedBase + "sitemap.xml"), "robots.txt sitemap is incorrect");

class Element {
  constructor() { this.children = []; this.attrs = {}; this.listeners = {}; this.textContent = ""; this.innerHTML = ""; this.className = ""; }
  appendChild(child) { this.children.push(child); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  setAttribute(name, value) { this.attrs[name] = value; }
  click() { this.listeners.click?.(); }
}
const button = new Element();
const results = new Element();
const themeButton = new Element();
const documentMock = {
  documentElement: { dataset: { theme: "light" } },
  querySelectorAll(selector) { return selector === "[data-theme-toggle]" ? [themeButton] : []; },
  getElementById(id) { return id === "generateButton" ? button : id === "numbers" ? results : null; },
  createElement() { return new Element(); }
};
const storage = new Map();
vm.runInNewContext(fs.readFileSync(path.join(root, "app.js"), "utf8"), {
  document: documentMock,
  localStorage: { setItem(key, value) { storage.set(key, value); } },
  Date,
  Math
});
button.click();
check(results.children.length === 5, "generator did not create five sets");
for (const row of results.children) {
  const values = row.children.slice(1).map((item) => Number(item.textContent));
  check(values.length === 6, "generator set does not contain six numbers");
  check(new Set(values).size === 6 && values.every((n) => n >= 1 && n <= 45), "generator produced invalid numbers");
  check(values.every((n, i) => i === 0 || values[i - 1] < n), "generator numbers are not sorted");
}
themeButton.click();
check(documentMock.documentElement.dataset.theme === "dark" && storage.get("theme") === "dark", "theme toggle failed");

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`PASS: ${pages.length} pages, links, SEO, AdSense, Formspree, Disqus, generator and theme verified`);
