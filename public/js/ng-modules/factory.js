/**
 * Created by 柏然 on 2014/11/25.
 */

angular.module('br').
  provider('imgFactory', function imgFactoryProvider() {
    var imgChannel = {}, baseAddr, ctx = document.createElement('canvas').getContext('2d');
    this.mobileRoute = function (isMobile) {
      if (isMobile)baseAddr = 'mobile\\resources\\';
      else baseAddr = 'resources\\'
    };
    this.$get = ['$q', '$http', 'glFactory', function imgFactory($q, $http, glFactory) {
      var maxImgSize = glFactory.MAX_TEXTURE_SIZE;
      if (console.postInfo)
        console.postInfo = function (tag, info) {
          $http.get('/debug/' + tag + ':' + info);
        };
      return {
        get: function (src) {
          if (typeof src == "string") return getImg(src);
          else if (src.map)return $q.all(src.map(function (s) {
            return getImg(s);
          }));
        },
        setImgSize: function (v) {
          if (isNaN(v))return;
          maxImgSize = parseInt(maxImgSize, 10);
        }
      };
      function checkSize(img) {
        var oriH = img.naturalHeight, oriWidth = img.naturalWidth, width, height, cvs;
        if (oriH > maxImgSize || oriWidth > maxImgSize) {
          cvs = ctx.canvas;
          cvs.height = cvs.width = maxImgSize;
          ctx.clearRect(0, 0, maxImgSize, maxImgSize);
          ctx.drawImage(img, 0, 0, oriWidth, oriH, 0, 0, maxImgSize, maxImgSize);
          var nimg = new Image(), defer = $q.defer();
          nimg.src = cvs.toDataURL('image/png');
          nimg.onload = nimg.onerror = function () {
            if (nimg.complete) {
              console.log('change img size:' + nimg.naturalWidth + '/' + nimg.naturalHeight);
              defer.resolve(nimg);
            }
            else defer.resolve(nimg);
          };
          return defer.promise;
        }
        return img;
      }

      function imgPromise(src) {
        var d = $q.defer(), img = new Image();
        img.onload = function () {
          d.resolve(imgChannel[src] = checkSize(img))
        };
        img.onerror = function (e) {
          imgChannel[src] = new Error(e);
          d.reject(e)
        };
        img.src = baseAddr + src;
        console.log('begin load img:' + src);
        return d.promise;
      }

      function getImg(src) {
        var imgLike = imgChannel[src];
        if (!imgLike) return imgChannel[src] = imgPromise(src);
        else if (imgLike instanceof Image) return $q(function (r) {
          r(imgLike);
        });
        else if (imgLike instanceof Error) return $q.reject(imgLike);
        return imgLike;
      }

    }]
  }).
  factory('cfgFactory', ['cfgParser', function (cfg) {
    return cfg;
  }]);

