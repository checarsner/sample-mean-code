'use strict';

describe ('Service: VisitSvc', function () {

	// load the app module
	beforeEach (module ('srWebApp'));
	var vs,
		us,
		scope,
		store,
		testDate,
		newUser,
		newVisit,
		timeNow;

	// Initialize the controller and a mock scope
	beforeEach (inject (function ($q, $rootScope, SR_Storage, VisitSvc, UserSvc) {
		scope = $rootScope.$new ();
		vs = VisitSvc;
		us = UserSvc;
		store = SR_Storage;
		testDate = new Date;
		newUser = us.getNewUser ();  // Needed for testing
		newUser._id = 1;  // Needed for testing
		store.setUser (newUser);
		// Clear the rounds date
		store.setRoundsDate (null);
		newVisit = vs.getNewVisit ();
		timeNow = Date.now();
		/* Debugging */
		console.log("Rounds Date: " + store.getRoundsDate().getTime());
		console.log("Visit Date: " + newVisit.visit_date.getTime());
		console.log("Time Now: " + timeNow);
	}));

	describe ("Visit Test Suite", function () {

		describe ("Visit Creation Tests", function () {
			it ("should create a new visit", function() {
				expect(newVisit).toBeDefined();
			});
		});

		describe ("Creation Date Tests", function () {
			it ("should init visit date with the current rounds date", function () {
				/* Have to use .getTime() for Date comparisons */
				expect (newVisit.visit_date.getTime ()).toEqual (store.getRoundsDate().getTime ());
			});
			it ("should init created timestamp", function () {
				expect (newVisit.createdTS).toBeDefined ();
			});
			it ("should set created timestamp after visit date", function () {
				expect (newVisit.createdTS).toBeGreaterThan (newVisit.visit_date.getTime ());
			});
//			it ("should set created timestamp accurately", function () {
//				/* TODO: Not sure how to accurately test for this. For now, just testing
//				 to make sure it doesn't differ by more than a second in testing. */
//				// Make sure they are within 1 second. Divide by 1000, check precision 0
//				expect (newVisit.createdTS/1000).toBeCloseTo (timeNow/1000, 0)
//			});
			it ("should init edited timestamp", function () {
				expect (newVisit.editedTS).toBeDefined ();
			});
			it ("should set edited timestamp after visit date", function () {
				expect (newVisit.editedTS).toBeGreaterThan (newVisit.visit_date.getTime ());
			});
//			it ("should set edited timestamp accurately", function () {
//				/* TODO: Not sure how to accurately test for this. For now, just testing
//				 to make sure it doesn't differ by more than a second in testing. */
//				// Make sure they are within 1 second. Divide by 1000, check precision 0
//				expect (newVisit.editedTS/1000).toBeCloseTo (timeNow/1000, 0)
//			});
			it ("should set edited date to current date and time", function () {
				/* TODO: Add test details */
			});
			it ("should set creator id", function () {
				/* TODO: Add test details */
			});
			it ("should set editor id", function () {
				/* TODO: Add test details */
			});
		});

	});
});
