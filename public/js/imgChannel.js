/**
 * Created by 柏然 on 2014/11/11.
 */
(function(def){
  if(!window.app)window.app={};
  if(!Promise){
    var ele=document.createElement('script');
    ele.src='js/bluebird';
    document.head.appendChild(ele);
    ele.onload=function(){
      def(window.app);
    }
  }
  else def(window.app);
})(
  function(app){
    var imgChannel={};
    function imgPromise(src){
      var d=Promise.defer(),img=new Image();
      img.onload=function(){imgChannel[src]=img; d.resolve(img)};
      img.onerror=function(e){imgChannel[src]=e;d.reject(e)};
      img.src=src;
      return d.promise;
    }
    function getImg(src){
      var imgLike=imgChannel[src];
      if(imgLike instanceof Image)return Promise.resolve(imgLike);
      else if(imgLike instanceof Error)return Promise.reject(imgLike);
      else if(imgLike instanceof Promise)return imgLike;
      return imgChannel[src]=imgPromise(src);
    }
    app.server={
      getImg:getImg,
      waitImgs:function(imgs){
        return Promise.all(imgs.map(getImg));
      }
    }
  }
);
