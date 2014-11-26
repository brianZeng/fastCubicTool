/**
 * Created by 柏然 on 2014/11/25.
 */
if(window.app){
  var module=window.app.ngModule;
  module.directive('drop',function(){
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
        "<div ng-mouseleave='toggle()' class='menu' ng-show='showMenu&&items&&items.length'> " +
        "<p ng-repeat='item in items' data-item ng-click='selectItem($index);'>{{item.name}}</p>" +
        "</div>"+
        "</div>"
    }
  }).directive('iconRange',function(){
    return{
      restrict:'EA',
      replace:true,
      scope:{
        iconSrc:'@iconSrc',
        unit:'@unit',
        value:'@value',
        role:'@role',
        min:'@min',
        max:'@max',
        step:'@step'
      },
      controller:'rangeController',
      template:"<div class='icon-range'>" +
        "<img ng-src='{{iconSrc}}'>" +
        "<p>{{value}}{{unit}}</p>" +
        "<input type='range' ng-model='value' ng-disabled='!mutable'  ng-change='onchange(value)' min='{{min}}' max='{{max}}' step='{{step}}' ng-class=\"{true:'active',false:'inactive'}[mutable]\">" +
        "</div>"
    }
  })
}