'use strict';

describe ('Service: SR_Storage', function () {

	// load the app module
	beforeEach (module('srWebApp'));
	var vs,
		us,
		scope,
		store,
		testDate,
		newUser,
		newVisit;

	// Initialize the controller and a mock scope
	beforeEach (inject (function ($q, $rootScope, SR_Storage, VisitSvc, UserSvc) {
		scope = $rootScope.$new();
		vs = VisitSvc;
		us = UserSvc;
		store = SR_Storage;
		testDate = new Date;
		newUser = us.getNewUser();  // Needed for testing
		newUser._id = 1;  // Needed for testing
		store.setUser(newUser);
		store.setRoundsDate(testDate);
		newVisit = vs.getNewVisit();
	}));

	describe ("Basic Date Test", function () {
		it("dates should be equal", function () {
			expect (testDate.getTime()).toEqual (new Date(testDate).getTime());
		});
	});

	describe ("Basic Storage Test Suite", function () {

		describe ("Visit Date Storage Tests", function () {

			it ("should not modify the date", function () {
				expect (store.getRoundsDate().getTime()) .toEqual (testDate.getTime());
			});

		});

	});
});
