/**
 * Created by 柏子 on 2015/1/11.
 */
angular.module('br').directive('multiRange', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      iconSrc: '@iconSrc',
      title: '@title',
      unit: '@unit',
      value: '@value',
      role: '@role',
      min: '@min',
      max: '@max',
      step: '@step',
      items: '=items'
    },
    controller: 'multiController',
    template: "<div class='multi-range'><div class='icon-range dropHeader drop'>" +
    "<img ng-src='{{iconSrc}}' ng-click='toggle(true)'><p ng-click='toggle()'>{{title}}</p>" +
    "<input type='range' ng-model='value' ng-disabled='!mutable'  ng-change='onchange(value)' min='{{min}}' max='{{max}}' step='{{step}}' ng-class=\"{true:'active',false:'inactive'}[mutable]\">" +
    "<p>{{value}}{{unit}}</p></div>" +
    "<div ng-mouseleave='toggle()' class='menu' ng-show='showMenu&&items&&items.length'>" +
    "<p ng-repeat='item in items' data-item ng-click='onselect($index);'><b></b>{{item}}:{{getItemValue(item)}}{{unit}}</p>" +
    "</div>" +
    "</div>"
  }
});