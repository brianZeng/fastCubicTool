/**
 * Created by 柏然 on 2014/11/24.
 */
var fileReader = require('../src/resReader.js'), ChangSS = require('../bin/ChangSS.min');
function concatBss() {
  return fileReader.readDirFiles('bss').then(function (files) {
    var result = ChangSS(files.join('===='));
    return fileReader.writeFile('public/bss.css', result)
  });
}
module.exports = function (req, res, next) {
  concatBss().then(function () {
    next();
  }, function (e) {
    next(e);
    debugger;
  })
};