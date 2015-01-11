var express = require('express');
var router = express.Router();

router.get('/*',require('../src/cfgLoader'));
router.get('/',require('../src/bssWriter'));
if(process.env.DEBUG){
  router.get('/debug/:msg',function(req,res){
    console.log(req.params.msg);
    res.end();
  });
}

/* GET home page. */
function getModel(res){
  var model=res.locals.cfgModel;
 // model.JData=JSON.stringify(model);
  return model;
}
router.get('/ori',function(req,res){
  var model=res.locals.cfgModel;
  model.JData=JSON.stringify(model);
  res.render('index',model);
});
router.get('/compile',function(req,res){
   res.render('compile',getModel(res));
});

router.get('/', function(req, res) {
  var model=res.locals.cfgModel,debug=process.env.DEBUG;

 // model.JData=JSON.stringify(model);
  res.render(debug? 'index':'compile',model);
});

module.exports = router;
