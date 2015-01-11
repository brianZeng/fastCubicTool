/**
 * Created by 柏子 on 2015/1/11.
 */
angular.module('br').directive('drop',function(){
  return {
    restrict:'EA',
    replace:true,
    scope:{
      iconSrc:'@iconSrc',
      items:'=items',
      selected:'@title',
      role:"@role"
    },
    controller:'dropController',
    template:"<div class='drop' ng-click='toggle();'><div class='dropHeader'>" +
    "<img ng-src='{{iconSrc}}'><p>{{selected}}</p></div>" +
    "<div ng-mouseleave='toggle()' class='menu' ng-show='showMenu&&items&&items.length'>" +
    "<p ng-repeat='item in items' data-item ng-click='selectItem($index);'><b></b>{{item.name}}</p>" +
    "</div>"+
    "</div>"
  }
});