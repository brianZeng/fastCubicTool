/**
 * Created by 柏然 on 2014/11/25.
 */

angular.module('br').
  factory('imgFactory',['$q','glFactory','$http',function($q,glFactory,$http){
        var imgChannel={},baseAddr='resources\\',ctx=document.createElement('canvas').getContext('2d'),maxImgSize=glFactory.MAX_TEXTURE_SIZE;
       if(console.postInfo)
        console.postInfo=function(tag,info){
          $http.get('/debug/'+tag+':'+info);
        };
        function checkSize(img){
          var oriH=img.naturalHeight,oriWidth=img.naturalWidth,width,height,cvs;
          if(oriH>maxImgSize||oriWidth>maxImgSize){
            if(oriH>oriWidth){
              height=maxImgSize;
              width=parseInt(maxImgSize/oriH*oriWidth);
            }
            else {
              width=maxImgSize;
              height=parseInt(maxImgSize/oriWidth*oriH);
            }
          }
          else {
            console.log('imgSize:'+oriWidth+'/'+oriH);
            return img;
          }
          cvs=ctx.canvas;
          cvs.height=height;
          cvs.width=width;
          ctx.clearRect(0,0,width,height);
          ctx.drawImage(img,0,0,oriWidth,oriWidth,0,0,width,height);
          var nimg=new Image();
          nimg.src=cvs.toDataURL('image/png');
          console.log('change img size:'+nimg.naturalWidth+'/'+nimg.naturalHeight);
          return nimg;
        }
        function imgPromise(src){
          var d=$q.defer(),img=new Image();
          img.onload=function(){imgChannel[src]=checkSize(img); d.resolve(img)};
          img.onerror=function(e){imgChannel[src]=new Error(e);d.reject(e)};
          img.src=baseAddr+src;
          console.log('begin load img:'+src);
          return d.promise;
        }
        function getImg(src){
          var imgLike=imgChannel[src];
          if(!imgLike) return imgChannel[src]=imgPromise(src);
          else if(imgLike instanceof Image) return $q(function(r){r(imgLike);});
          else if(imgLike instanceof Error) return $q.reject(imgLike);
          return imgLike;
        }
        return {
          $get:function(src){
            if(typeof src=="string") return getImg(src);
            else if(src.map)return $q.all(src.map(function(s){return getImg(s);}));
          },
          setImgSize:function(v){
            if(isNaN(v))return;
             maxImgSize=parseInt(maxImgSize,10);
          }
        }
      }]).
  factory('cfgFactory',['cfgParser',function(cfg){
    return cfg;
  }]);

