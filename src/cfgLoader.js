/**
 * Created by 柏子 on 2015/1/10.
 */
/**
 * Created by 柏然 on 2014/11/24.
 */
var fileReader = require('../src/resReader.js'), path = require('path'), cfgInstance, err;
var cfgPath = path.normalize('./conf.json');
require('fs').watchFile(cfgPath, {interval: 200, persistent: true}, function () {
  readInstance();
});
function readInstance() {
  fileReader.readFile(cfgPath).then(function (cfgStr) {
    try {
      cfgInstance = JSON.parse(cfgStr);
      cfgInstance.JData = cfgStr;
      err = null;
    }
    catch (ex) {
      err = ex
    }
  }, function (e) {
    err = e;
  });
}
readInstance();
module.exports = function (req, res, next) {
  if (err) {
    next(err);
  } else {
    res.locals.cfgModel = cfgInstance;
    next();
  }

};
