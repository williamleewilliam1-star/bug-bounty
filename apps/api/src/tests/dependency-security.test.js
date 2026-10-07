import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) throw new Error(`Unsupported semver: ${version}`);
  return match.slice(1).map(Number);
}

function atLeast(version, minimum) {
  const current = parseVersion(version);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] !== minimum[index]) return current[index] > minimum[index];
  }
  return true;
}

function packageVersion(name, parentPackage = null) {
  if (!parentPackage) return require(`${name}/package.json`).version;
  const parentPath = require.resolve(`${parentPackage}/package.json`);
  const parentRequire = createRequire(parentPath);
  return parentRequire(`${name}/package.json`).version;
}

test("API dependency graph stays outside patched advisory ranges", () => {
  const versions = {
    express: packageVersion("express"),
    bodyParser: packageVersion("body-parser", "express"),
    proxyAddr: packageVersion("proxy-addr", "express"),
    qs: packageVersion("qs", "express"),
    bodyParserQs: packageVersion("qs", "body-parser")
  };

  assert.equal(atLeast(versions.express, [4, 22, 3]), true, `express ${versions.express}`);
  assert.equal(atLeast(versions.bodyParser, [1, 20, 8]), true, `body-parser ${versions.bodyParser}`);
  assert.equal(atLeast(versions.proxyAddr, [2, 0, 8]), true, `proxy-addr ${versions.proxyAddr}`);
  assert.equal(atLeast(versions.qs, [6, 16, 0]), true, `express qs ${versions.qs}`);
  assert.equal(atLeast(versions.bodyParserQs, [6, 16, 0]), true, `body-parser qs ${versions.bodyParserQs}`);
});

test("dependency boundary checker distinguishes vulnerable and patched versions", () => {
  const cases = [
    ["4.22.2", [4, 22, 3], false],
    ["4.22.3", [4, 22, 3], true],
    ["1.20.6", [1, 20, 8], false],
    ["1.20.8", [1, 20, 8], true],
    ["2.0.7", [2, 0, 8], false],
    ["2.0.8", [2, 0, 8], true],
    ["6.15.3", [6, 16, 0], false],
    ["6.16.0", [6, 16, 0], true]
  ];

  for (const [version, boundary, expected] of cases) {
    assert.equal(atLeast(version, boundary), expected, version);
  }
});
