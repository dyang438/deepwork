const assert = require("assert");
const { isFeed } = require("../chrome-ext/feeds.js");
const hidden = [["x.com", "/home"], ["x.com", "/"], ["x.com", "/explore"], ["x.com", "/explore/tabs/for-you"],
  ["twitter.com", "/home"], ["www.linkedin.com", "/feed/"], ["www.linkedin.com", "/feed"], ["www.linkedin.com", "/"]];
const allowed = [["x.com", "/karpathy"], ["x.com", "/karpathy/status/123"], ["x.com", "/search"], ["x.com", "/messages"],
  ["x.com", "/i/bookmarks"], ["www.linkedin.com", "/in/someone/"], ["www.linkedin.com", "/company/maingen/"],
  ["www.linkedin.com", "/messaging/"], ["www.linkedin.com", "/search/results/people/"],
  ["www.linkedin.com", "/feed/update/urn:li:activity:1/"]];
for (const [h, p] of hidden) assert.strictEqual(isFeed(h, p), true, h + p);
for (const [h, p] of allowed) assert.strictEqual(isFeed(h, p), false, h + p);
console.log("feeds ok");
