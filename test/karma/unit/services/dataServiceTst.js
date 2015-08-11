'use strict';

describe ('Service: DataSvc', function () {

	// load the app module
	beforeEach (module('app'));
	var dt
		, scope;

	// Initialize the controller and a mock scope
	beforeEach (inject(function ($q, $rootScope, SR_Storage, DateTimeSvc) {
		scope = $rootScope.$new();
		dt = DateTimeSvc;
	}));

	describe ("utcIntFromDate Test", function () {
		it("should convert a Date to the correct UTC date integer", function () {
			var now = new Date(); // Get current time in local timezone.
			var timezoneMins = now.getTimezoneOffset(); // Get the local timezone offset in minutes.
			var utzInt1 = now.getTime() - (timezoneMins * 60000);
			var utzInt2 = dt.utcIntFromDate(now);
			expect(utzInt1).toEqual(utzInt2);
		});
	});

	describe ("UTC Conversion Round-trip Test", function () {
		it("should convert a Date to the UTC integer and back",
			function () {
				var nowDate = new Date(); // Get current time in local timezone.
				var utzInt = dt.utcIntFromDate(nowDate);
				var dsDate = dt.dateFromUtcInt(utzInt);
				expect(dsDate).toEqual(nowDate);
			});
	});
});
