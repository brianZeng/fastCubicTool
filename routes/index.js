var express = require('express');
var router = express.Router();
var fileReader=require('../src/resReader.js');
var cfgLoader=require('../src/cfgLoader.js');

/* GET home page. */
router.get('/', function(req, res) {
  var model={title:'GAP'};
  cfgLoader.load().then(function(cfg){
    model.scenes=cfg.scenes;
    model.modes=cfg.modes;
    model.cfg=JSON.stringify(cfg);
   return fileReader.readDirFiles('bss')
  }).then(function(files){
    model.bss=files.join('====');
    res.render('index',model);
  }).catch(function(e){
    res.render('error',e);
  });
});

module.exports = router;
