/**
 * Created by 柏然 on 2014/11/11.
 */
(function (app) {
  var glUtil, cfg = app.cfg, server = app.server, state = {
    curMode: 0, lum: 1, tem: 3000, weights: [], scene: null
  };
  app.gl = {};
  function waitScene(seq) {
    var scene = cfg.scenes[seq], dir = scene.dir;
    if (scene == state.scene)return;
    return app.server.waitImgs(scene.res.map(function (n) {
      return dir + '\\' + n;
    })).then(function (imgs) {
      resetScene(scene, imgs);
      app.mode = seq;
      app.ui.toggleShadow(false);
    })
  }

  function resetScene(scene, imgs) {
    glUtil.reset(imgs.length);
    glUtil.changeABK(scene.A || 1.2, scene.B || 0.7, scene.K || 1);
    imgs.forEach(function (img, i) {
      glUtil.changeImg(i, img);
    });
    glUtil.visible = true;
    setParam();
  }

  function setParam() {
    var lum = state.lum, tem = state.tem;
    state.weights.forEach(function (inten, i) {
      glUtil.changeIntensity(i, (inten * lum) || 0);
      glUtil.changeTem(i, tem);
    });
  }

  app.waitScene = waitScene;
  (function () {
    var menu = app.ui.menu, domEle = document.documentElement;
    glUtil = bgl.pls = bgl.pls(app.ui.canvas, {
      maxLG: 6,
      normalLocation: {x: 0, y: -23, w: domEle.clientWidth, h: domEle.clientHeight - menu.clientHeight}
    });
    glUtil.visible = false;
    waitScene(0);
    glUtil.adjustCanvas(null, false);
    glUtil.reset(0);
    Object.defineProperties(app,
      {
        tem: {
          get: function () {
            return state.tem;
          },
          set: function (v) {
            if (isNaN(v) || v == state.tem || v < 0 || v > 1)return;
            state.tem = cfg.tem.min * (1 - v) + v * cfg.tem.max;
            setParam();
          }},
        lum: {
          get: function () {
            return state.lum;
          },
          set: function (v) {
            if (isNaN(v) || v == state.tem || v < 0 || v > 1)return;
            state.lum = v;
            setParam();
          }
        },
        mode: {
          get: function () {
            return state.curMode;
          },
          set: function (seq) {
            var mode;
            if (mode = cfg.modes[seq]) {
              state.curMode = mode;
              state.weights = mode.weights.slice();
              setParam();
            }
          }
        }
      });
    app.mode = 0;
  })();
})(window.app);