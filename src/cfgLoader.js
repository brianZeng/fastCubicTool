/**
 * Created by 柏然 on 2014/11/15.
 */
var fileReader = require('../src/resReader.js'), promise = require('bluebird'), path = require('path');
var cfg, jsonStr;
function loadJSON() {
  if (cfg)return promise.resolve(cfg);
  return fileReader.readFile('./conf.json').then(function (j) {
    cfg = JSON.parse(jsonStr = j);
    normalizeCfg();
    return cfg;
  });
}
function reload() {
  cfg = null;
  jsonStr = '';
}
function normalizeCfg() {
  cfg.scenes.forEach(function (scene) {
    var dirPath = scene.dir;
    if (dirPath)dirPath = path.join('resources', dirPath);
    else
      dirPath = 'resources';
    scene.dir = dirPath;
  });
}
module.exports = {
  load: function () {
    reload();
    return loadJSON();
  }
};