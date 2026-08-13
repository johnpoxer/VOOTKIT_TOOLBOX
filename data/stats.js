/* stats.js - shared public product metrics for homepage and social proof.
 * Keep audience numbers here so homepage, about, pricing and footer copy do
 * not drift as the product positioning changes. */
(function (root, factory) {
  var stats = factory();
  if (typeof module === "object" && module.exports) module.exports = stats;
  else root.VK_STATS = stats;
})(typeof self !== "undefined" ? self : this, function () {
  return {
    audience: {
      users: { value: 1000000, display: "1M+", label: "Users" },
      countries: { value: 120, display: "120+", label: "Countries" },
      tasksCompleted: { value: 10000000, display: "10M+", label: "Tasks Completed" }
    },
    tools: { roundTo: 50 }
  };
});
