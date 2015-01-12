/**
 * Created by 柏子 on 2015/1/11.
 */
angular.module('br').
  controller('dropController', ['$scope', function ($scope) {
    $scope.toggle = function () {
      $scope.showMenu = !$scope.showMenu;
    };
    $scope.showMenu = false;
    $scope.selectItem = function ($index) {
      var item = $scope.items[$index], from = $scope.selectedItem;
      if (from !== item) {
        $scope.selected = item.name;
        $scope.$emit('selectedChange', {from: from, to: $scope.selectedItem = item, scope: $scope})
      }
      $scope.showMenu = false;
    };
    $scope.$on('dropTitleChange', function (e, evt) {
      if (evt.role == $scope.role) {
        $scope.selected = evt.selected;
      }
    })
  }]);