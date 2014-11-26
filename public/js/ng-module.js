/**
 * Created by 柏然 on 2014/11/25.
 */
angular.module('br',[]).factory('imgFactory',function($q){
  var imgChannel={};
  function imgPromise(src){
    var d=$q.defer(),img=new Image();
    img.onload=function(){imgChannel[src]=img; d.resolve(img)};
    img.onerror=function(e){imgChannel[src]=new Error(e);d.reject(e)};
    img.src=src;
    return d.promise;
  }
  function getImg(src){
    var imgLike=imgChannel[src];
    if(imgLike instanceof Image) return $q.resolve(imgLike);
    else if(imgLike instanceof Error) return $q.reject(imgLike);
    else if(imgLike.then) return imgLike;
    return imgChannel[src]=imgPromise(src);
  }
  function checkAllSettled(ps,defer,fail){
    for(var i= 0,len=ps.length;i<len;i++)
      if(ps[i]==undefined)return;
    fail ? defer.reject(ps):defer.reject(ps);
  }
  function all(promises){
    var ps=new Array(promises.length),fail,defer=$q.defer();
    function check(data,i){
      ps[i]=data;
      return checkAllSettled(ps,defer,fail)
    }
    promises.forEach(function(p,i){
      p.then(function(data){check(data,i);},function(error){fail=true;check(error,i);});
    });
    return defer.promise;
  }
  return {
    $get:function(src){
      if(typeof src=="string") return getImg(src);
      else if(src.map)return all(src.map(function(s){return getImg(s);}));
    }
  }
}).directive('drop',function(){
  return {
    restrict:'EA',
    replace:true,
    scope:{
      iconSrc:'@iconSrc',
      items:'=items',
      selected:'@title',
      role:"@role"
    },
    controller:function($scope){
      $scope.selectItem=function(){
        var evt=window.event,item=evt.target,from=$scope.selectedItem;
        if(from!==item){
          $scope.selected=item.innerHTML;
          $scope.$emit('selectedChange',{from:from,to:$scope.selectedItem=item,scope:$scope,evt:evt})
        }
      }
    },
    template:"<div>" +
      "<img ng-src='{{iconSrc}}'><p>{{selected}}</p>" +
      "<div ng-click='selectItem()'> " +
      "<p ng-repeat='item in items' data-item >{{item}}</p>" +
      "</div>"+
      "</div>"
  }
}).controller('bannerController',function($scope,imgFactory){
    $scope.waiting=true;
}).controller('abc',function($scope,imgFactory){

});