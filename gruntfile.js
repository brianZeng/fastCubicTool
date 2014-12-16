/**
 * Created by 柏然 on 2014/12/12.
 */
var config = {
  concat: {
    bgl:{
      files:{
        'public/js/bin/bgl.js':'base,BGL,bgl.util'.split(',').map(function(s){return 'public/js/'+s+'.js';})
      }
    },
    angular:{
      files:{
        'public/js/bin/ng.js':'init,*'.split(',').map(function(s){return 'public/js/ng-modules/'+s+'.js';})
      }
    }
  }
};
config.uglify = {
  angular: {
    files: {
      'public/js/bin/ng.min.js':  'public/js/bin/ng.js'
    }
  },
  bgl: {
    files: {
      'public/js/bin/bgl.min.js':  'public/js/bin/bgl.js'
    },options:{
      banner:'/* contact me: borian@vip.qq.com */console.log("请叫我柏子:borian@vip.qq.com -.-!");'
    }
  }
};
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.initConfig(config);
};