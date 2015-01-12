var express = require('express');
var router = express.Router();
var userAgent = require('express-useragent').express();
var cfgLoader = require('../src/cfgLoader');
//router.get('/', require('../src/bssWriter'));
if (process.env.DEBUG) {
  router.get('/debug/:msg', function (req, res) {
    console.log(req.params.msg);
    res.end();
  });
}

/* GET home page. */
function getModel(res, ua, compress) {
  var model = res.locals.cfgModel;
  return {
    model: model,
    useragent: ua,
    compress: compress
  };
}
router.get(['/:type', '/'], cfgLoader, userAgent, function (req, res) {
  var compress, model, ua = req.useragent;
  switch (req.params.type) {
    case 'mobile':
      ua.isDesktop = !(compress = ua.isMobile = true);
      break;
    case 'dev':
      ua.isDesktop = !(compress = ua.isMobile = false);
      break;
    default :
      compress = ua.isMobile ? true : !process.env.DEBUG;
  }
  model = getModel(res, ua, compress);
  res.render('index', model);
});


module.exports = router;
