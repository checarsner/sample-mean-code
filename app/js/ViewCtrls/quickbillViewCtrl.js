/* Quick Bill View Controller */

'use strict';

var controllers = angular.module('srWebApp.controllers');
controllers.controller('QuickbillViewCtrl',
	['$rootScope', '$scope', '$location', '$q', 'SR_Storage',
		function ($rootScope, $scope, $location, $q, SR_Storage) {

			var store = SR_Storage;
			if (!store.userIsValid()) {
				$location.path('/');
				return;
			}

			$scope.patSelection = store.getPatSelection();
			$scope.hospSelection = store.getHospSelection();
			$scope.roundsDate = store.getRoundsDate();
			$scope.dateOptions = {};
			$scope.showSaved = false;
			$scope.showSaving = false;
      $scope.dataModified = false;

			$scope.SaveChanges = function () {
				$scope.showSaved = false;
				$scope.showSaving = true;
				// Notify subcontrollers to save data
				$scope.$broadcast('saveData');
				store.setRoundsDate($scope.roundsDate);
			};

			$scope.goToHome = function () {
				// $scope.saveData();
				$location.path('/home');
			};

			$scope.goToPatients = function () {
				// $scope.saveData();
				$location.path('/patients');
			};

			$scope.goToVisits = function () {
				// $scope.saveData();
				$location.path('/visits');
			};

			$scope.logout = function () {
				store.logout();
				$location.path('/');
			};

			// TODO: Move this to a Date Controller, if needed for reuse
			$scope.$watch('roundsDate', function () {
				store.setRoundsDate($scope.roundsDate);
				// FixMe: Bad! Replace with $scope.$emit here + $scope.$broadcast at parent
				// to contain messages
				$rootScope.$broadcast('newRoundsDate');
			});

			$scope.$on('qbGridNotReady', function disableControls() {
				$scope.qbGridValid = false;
			});

			$scope.$on('qbGridReady', function enableControls() {
				$scope.qbGridValid = true;
        $scope.dataModified = false;
			});

      $scope.$on('qbGridDataModified', function gridDataModified() {
        $scope.dataModified = true;
      });

			$scope.$on('visitSaveSuccess', function saveDone() {
				$scope.showSaved = true;
				$scope.showSaving = false;
        $scope.dataModified = false;
				setTimeout(function () {
					$scope.showSaved = false;
					$scope.$apply();
				}, 5000);
			});

			$scope.$on('visitSaveFailed', function visitSaveFailed() {
				alert("Visit save failed.");
				$scope.showSaved = false;
				$scope.showSaving = false;
			});

		}
	]
);
