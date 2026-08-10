/* wf-init.js — mounts the workflow builder.
 * Separate from workflow.js so the engine stays testable in Node without a DOM
 * and without a page trying to mount itself on require(). */
(function () {
  'use strict';
  function go() {
    var host = document.getElementById('wf');
    if (host && window.VKWorkflow && window.VKWorkflow.mount) window.VKWorkflow.mount(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
