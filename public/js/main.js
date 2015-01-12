/**
 * Created by 柏然 on 2014/11/25.
 */
window.app = {
  ngModule: angular.module('br', []),
  cfg: (function () {
    var input = $('#cfg'), src = input.innerHTML, cfg = JSON.parse(src);
    input.innerHTML = '';
    cfg.isMobile = !!$('#isMobile').value;
    return cfg;
    function $(slt) {
      return document.querySelector(slt) || {};
    }
  })()
};
