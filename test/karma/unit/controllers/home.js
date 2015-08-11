'use strict';

describe('Controller: HomeViewCtrl', function () {

  // load the controller's module
  beforeEach(module('srWebApp'));

  var HomeCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
	  HomeCtrl = $controller('HomeViewCtrl', {
      $scope: scope
    });
  }));

	describe("True Test", function() {
		it("contains spec with an expectation", function() {
			expect(true).toBe(true);
		});
	});
});
