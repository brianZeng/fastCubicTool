/**
 * Created by 柏然 on 2014/11/11.
 */
(function (app) {
  function $$(selector) {
    return Array.prototype.slice.apply(document.querySelectorAll(selector));
  }

  function $(selector) {
    return document.querySelector(selector)
  }

  $('#sceneMenu').addEventListener('click', clickSceneMenu);
  $('#sceneMenu').addEventListener('touchstart', function (e) {
    e.preventDefault();
    clickSceneMenu(e);
  });
  function clickSceneMenu(e) {
    toggleShadow(true);
    app.waitScene(e.target.getAttribute('data-seq'));
  }

  $('#modeMenu').addEventListener('click', function (e) {
    app.mode = e.target.getAttribute('data-seq');
  });
  $$('input[type=range]').forEach(function (e) {
    e.addEventListener('change', rangeChange);
  });
  function rangeChange(e) {
    var range = e.target;
    app[range.name] = range.value;
  }
  function toggleShadow(hide) {
    var shadow = $('#shadow');
    if (hide === undefined)hide = !(shadow.style.display == 'none');
    shadow.style.display = hide ? 'block' : 'none';
  }
  var cfg;
  app.cfg = cfg = JSON.parse($('#cfg').value);
  app.ui = {
    toggleShadow: toggleShadow,
    menu: $('body>menu'),
    canvas: $('#glcvs')
  };
})(window.app || (window.app = {}));