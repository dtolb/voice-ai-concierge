<script>
(function () {
  var panels = document.getElementById('nodepanels');

  function closeAllNodes() {
    document.querySelectorAll('.node').forEach(function (n) {
      n.classList.remove('sel');
      n.setAttribute('aria-expanded', 'false');
    });
    if (panels) {
      panels.querySelectorAll('.node-detail').forEach(function (d) { d.hidden = true; });
    }
  }

  document.querySelectorAll('.node').forEach(function (node) {
    function toggle() {
      var open = node.classList.contains('sel');
      closeAllNodes();
      if (open) return;
      node.classList.add('sel');
      node.setAttribute('aria-expanded', 'true');
      var detail = document.getElementById(node.getAttribute('aria-controls'));
      if (detail) detail.hidden = false;
    }
    node.addEventListener('click', toggle);
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggle();
      }
    });
  });

  function setHop(step, open) {
    var row = step.querySelector('.row');
    var detail = document.getElementById(row.getAttribute('aria-controls'));
    step.classList.toggle('open', open);
    row.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (detail) detail.hidden = !open;
  }

  document.querySelectorAll('.ladder .step').forEach(function (step) {
    step.querySelector('.row').addEventListener('click', function () {
      setHop(step, !step.classList.contains('open'));
    });
  });

  document.querySelectorAll('.bulk button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('data-bulk') === 'open';
      var flow = btn.getAttribute('data-flow');
      var ladder = document.querySelector('.ladder[data-flow="' + flow + '"]');
      if (!ladder) return;
      ladder.querySelectorAll('.step').forEach(function (s) { setHop(s, open); });
    });
  });

  function openFromHash() {
    var id = window.location.hash.replace('#', '');
    if (!id) return;
    var detail = document.getElementById(id);
    if (!detail) return;
    var step = detail.closest('.step');
    if (step) {
      setHop(step, true);
      step.scrollIntoView({ block: 'center' });
      return;
    }
    if (detail.classList.contains('node-detail')) {
      var node = document.querySelector('.node[aria-controls="' + id + '"]');
      if (node) node.dispatchEvent(new Event('click'));
    }
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();
</script>
