/* Quickbill Grid Subview Controller */

'use strict';

var controllers = angular.module('srWebApp.controllers');
controllers.controller('QuickbillGridCtrl',
  ['$rootScope', '$scope', '$q', '$resource', '$log', 'DateTimeSvc',
    'SR_Storage', 'PatientSvc', 'VisitSvc', 'BillCodeSvc', 'DXCodeSvc',
    function ($rootScope, $scope, $q, $resource, $log, DateTimeSvc,
              SR_Storage, PatientSvc, VisitSvc, BillCodeSvc, DXCodeSvc) {
      /**
       * Note: This controller has a lot of async calls for data and messaging with its
       * parent controller. Due to that, the order and timing of calls in functions affecting
       * the grid are very important.
       */
      var store = SR_Storage;
      var dobDateTemplate = "<div>{{row.entity.dob | date:'MM/dd/yyyy'}}</div>";

      // Store the controller scope for access from the grid, which has an isolate scope.
      $scope.$scope = $scope;

      $scope.getPatients = function getPatients() {
        $log.debug('getPatients() called.');
        var patients = store.getPatients();
        if (!patients) {
          // FixMe: Switch to callback
          PatientSvc.getPatients()
        } else {
          $scope.patients = patients;
        }
      };

      $scope.getVisits = function getVisits() {
        $log.debug('getVisits() called.');
        // Get all visits for the selected rounds date
        // FixMe: Switch to callback
        VisitSvc.getQBVisits($scope.getVisitsCb);
      };

      $scope.getVisitsCb = function getVisitsCb(failReason, visits) {
        if (failReason) {
          $scope.billCodes = null;
          alert("Failed to get QB visits. Reason: " + failReason);
          return;
        }
        $scope.visits = visits;
        if ($scope.visits != undefined) {
          $scope.visitsValid = true;
        }
        // Can't set up the Grid until both Patients and Visits are retrieved
        // TODO: Implement a module like asyncawait or async - https://github.com/yortus/asyncawait
        if ($scope.patientsValid && $scope.visitsValid) {
          $scope.populateGrid();
          if ($scope.$parent.showSaving)
            $scope.$emit('saveDone');
        }
      };

      $scope.getBillCodes = function getBillCodes() {
        // We need *all* codes.
        // Don't use the codes cache; it only has active ones
        BillCodeSvc.getActiveBillCodes($scope.billCodesCb);
      };

      $scope.billCodesCb = function billCodesCb(failReason, billCodes) {
        if (failReason) {
          $scope.billCodes = null;
          alert("Failed to get Bill Codes. Reason: " + failReason);
          return;
        }
        $scope.billCodes = billCodes;
      };

      $scope.getDxCodes = function getDxCodes() {
        // We need *all* codes.
        // Don't use the codes cache; it only has active ones
        DXCodeSvc.getActiveDxCodes($scope.dxCodesCb);
      };

      $scope.dxCodesCb = function dxCodesCb(failReason, dxCodes) {
        if (failReason) {
          $scope.dxCodes = null;
          alert("Failed to get DX Codes. Reason: " + failReason);
          return;
        }
        $scope.dxCodes = dxCodes;
      };

      $scope.validateGridData = function validateGridData() {
        $log.debug('validateGridData() called.');
        var gridData = store.getQbGridData();
        // If grid data is stored, set it and return
        if (gridData) {
          $scope.gridData = gridData;
        } else {
          $scope.buildGridData();
        }
      };

      $scope.buildVisitMap = function buildVisitMap() {
        $log.debug('buildVisitMap() called.');
        $scope.visitMap = {};
        angular.forEach($scope.visits, function (visit, vIndex) {
          $scope.visitMap[visit.pat_id] = visit;
        })
      };

      $scope.buildGridData = function buildGridData() {
        $log.debug('buildGridData() called.');
        // If patient and visits data is stored, build the grid data
        $scope.buildVisitMap();
        var patients = $scope.patients;
        if (!$scope.visits) {
          $scope.visits = [];
        }
        if (patients) {
          var items = [];
          angular.forEach(patients, function (patient, patIndex) {
              var visit = $scope.visitMap[patient._id];
              if (!visit) {
                // if no visit, get a new one and put it in the map
                store.setPatID(patient._id);
                visit = VisitSvc.getNewVisit();
                $scope.visitMap[patient._id] = visit;
                $scope.visits.push(visit);
              }
              var item = {};
              item.patient = patient;
              item.visit = visit;
              item.patIndex = patIndex;
              item.patId = patient._id;
              item.lastname = patient.lastname;
              item.firstname = patient.firstname;
              item.dob = patient.dob;
              item.room = patient.room;
              item.discharged = patient.discharged;
              item.dx1 = visit.diagnosis.dx1;
              item.dx2 = visit.diagnosis.dx2;
              item.dx3 = visit.diagnosis.dx3;
              item.billcode = visit.billing.bCode;
              // add a modified flag
              item.modified = false;
              items.push(item);
            }
          );
          $scope.gridData = items;
          // ToDo: Do we need these?
          //$scope.dxCodes = store.getDxCodes();
          //$scope.billCodes = store.getBillCodes();
          store.setQbGridData(items);
          // ToDo: Re-implement when ready
          //$scope.setQbDataWatch();
          store.setPatID(null);
          store.setPatSelection(null);
        }
      };

      /***** Start Patient Grid settings & Functions *****/
      $scope.setGridOptions = function setGridOptions() {
        $log.debug('setGridOptions() called.');
        $scope.gridOptions = {
          data: 'gridData',
          selectedItems: [],
          multiSelect: false,
          jqueryUITheme: false,
          keepLastSelected: true,
          showFooter: true,
          footerRowHeight: 30,
          beforeSelectionChange: function (rowItem, event) {
            // Don't allow selections for QB Grid
            return false;
          },
          afterSelectionChange: function (rowItem, event) {
            // Don't allow selections for QB Grid
            return false;
          },
          columnDefs: [
            {
              name: 'lastname', field: 'lastname', displayName: 'Last Name', width: '*',
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'firstname', field: 'firstname', displayName: 'First Name', width: "*",
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'dob', field: 'dob', displayName: 'DOB', width: "*",
              cellTemplate: dobDateTemplate,
              cellClass: 'gridDateCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'room', field: 'room', displayName: 'Location', width: "*",
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'discharged', field: 'discharged', displayName: 'DC', width: "*",
              cellTemplate: './gridCellTpls/dcCell.html',
              cellClass: 'gridCell',
              headerClass: 'gridCellHeader'
            },
            {
              name: 'dx1', field: 'dx1', displayName: 'Dx 1', width: "*",
              cellTemplate: './gridCellTpls/dx1Cell.html',
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'dx2', field: 'dx2', displayName: 'Dx 2', width: "*",
              cellTemplate: './gridCellTpls/dx2Cell.html',
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'dx3', field: 'dx3', displayName: 'Dx 3', width: "*",
              cellTemplate: './gridCellTpls/dx3Cell.html',
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            },
            {
              name: 'billcode', field: 'billcode', displayName: 'Bill Code', width: "*",
              cellTemplate: './gridCellTpls/bcCell.html',
              cellClass: 'gridCell', headerClass: 'gridCellHeader'
            }
          ],
          enablePaging: false,
          pagingOptions: $scope.pagingOptions,
          showFilter: false,
          filterOptions: {
            filterText: "",
            useExternalFilter: false
          },
          enableSorting: false
        };
      };
      /***** End Patient Grid settings & Functions *****/

      $scope.cellClassForRow = function cellClassForRow(row) {
        $log.debug("qbGrid cellClassForRow() called.");
        if (row && row.entity && $scope.checkRowDirty(row.entity)) {
          return 'srGridCellModified';
        } else {
          return 'gridCell';
        }
      };

      $scope.prepForSave = function prepForSave() {
        $log.debug('prepForSave() called.');
        /**
         * ToDo: Add patient change detection
         * For each patient:
         *    - detect if their visit has changed
         *    - detect if their discharged flag has changed
         *    - if there are changes:
         *        - add the patient to the changedPatients array
         *        - add their visit to the changedVisits array
         */
        /* For each patient in the patients array:
         *  - perform a patient update
         *  - find the related visit in the visits array
         *  - perform a visit update */
        $scope.changedPatients = [];
        $scope.changedVisits = [];
        angular.forEach($scope.gridData, function (item, index) {
          /* ToDo: Check for changed rows. Only update if true.
           ToDo: Add changed records to changed arrays.
           ToDo: Only save the changed items.
           */
          $scope.checkRowDirty(item);
          if (item.modified) {
            var patient = item.patient;
            var patient_id = patient._id;
            if (item.discharged) {
              patient.discharged = true;
              patient.dis_date = $scope.roundsDate;
            } else {
              patient.discharged = false;
              patient.dis_date = null;
            }
            var visit = item.visit;
            visit.diagnosis.dx1 = item.dx1 ? item.dx1 : '';
            visit.diagnosis.dx2 = item.dx2 ? item.dx2 : '';
            visit.diagnosis.dx3 = item.dx3 ? item.dx3 : '';
            visit.billing.bCode = item.billcode ? item.billcode : '';
            // Update the Dr and Editor IDs
            visit.dr_id = store.getUser()._id;
            visit.editorID = store.getUser()._id;
            // Update the Edited Time Stamp
            visit.editedTS = DateTimeSvc.utcIntFromDate(new Date());
            // Added the updated items to the changed item arrays.
            $scope.changedPatients.push(patient);
            $scope.changedVisits.push(visit);
          }
        });
      };

      $scope.checkBcDirty = function checkBcDirty(item) {
        $log.debug("qbGrid checkBcDirty() called.");
        // Check if the billcode attribute has changed.
        if (item && item.patId) {
          var visit = $scope.visitMap[item.patId];
          // Changed = true
          return item.billcode !== visit.billing.bCode;
        } else {
          // Either item or id is missing
          return false;
        }
      };

      $scope.checkDcDirty = function checkDcDirty(item) {
        $log.debug("qbGrid checkDcDirty() called.");
        // Check if the discharge attribute has changed.
        if (item && item.patId) {
          // Changed = true
          return item.discharged !== item.patient.discharged;
        } else {
          // Either item or id is missing
          return false;
        }
      };

      $scope.checkDx1Dirty = function checkDx1Dirty(item) {
        $log.debug("qbGrid checkDx1Dirty() called.");
        // Check if the DX1 attribute has changed.
        if (item && item.patId) {
          var visit = $scope.visitMap[item.patId];
          // Changed = true
          return item.dx1 !== visit.diagnosis.dx1;
        } else {
          // Either item or id is missing
          return false;
        }
      };

      $scope.checkDx2Dirty = function checkDx2Dirty(item) {
        $log.debug("qbGrid checkDx2Dirty() called.");
        // Check if the DX2 attribute has changed.
        if (item && item.patId) {
          var visit = $scope.visitMap[item.patId];
          // Changed = true
          return item.dx2 !== visit.diagnosis.dx2;
        } else {
          // Either item or id is missing
          return false;
        }
      };

      $scope.checkDx3Dirty = function checkDx3Dirty(item) {
        $log.debug("qbGrid checkDx3Dirty() called.");
        // Check if the DX3 attribute has changed.
        if (item && item.patId) {
          var visit = $scope.visitMap[item.patId];
          // Changed = true
          return item.dx3 !== visit.diagnosis.dx3;
        } else {
          // Either item or id is missing
          return false;
        }
      };

      $scope.checkRowDirty = function checkRowDirty(item) {
        $log.debug("qbGrid checkRowDirty() called.");
        // Check all the changeable attributes
        if (item) {
          if ($scope.checkDcDirty(item) ||
              $scope.checkDx1Dirty(item) ||
              $scope.checkDx2Dirty(item) ||
              $scope.checkDx3Dirty(item) ||
              $scope.checkBcDirty(item)) {
                item.modified = true;
                return true;
          } else {
              item.modified = false;
              return false;
          }
        }
      };

      $scope.resetQBData = function resetQBData() {
        $log.debug('resetQBData() called.');
        $scope.qbGridValid = false;
        // FixMe: Bad! Replace with callback
        $rootScope.$broadcast('qbGridNotReady');
        $scope.patients = undefined;
        $scope.visits = undefined;
        store.setPatients(null);
        store.setQbGridData(null);
        store.setVisit(null);
        $scope.patSelection = undefined;
        $scope.patID = undefined;
        $scope.hospID = store.getHospID();
        $scope.patientsValid = false;
        $scope.visitsValid = false;
        $scope.getPatients();
        $scope.getVisits();
      };

      $scope.populateGrid = function populateGrid() {
        $log.debug('populateGrid() called.');
        $scope.buildGridData();
        $scope.qbGridValid = true;
        // Notify parent the grid is ready.
        $scope.$emit('qbGridReady');
      };

      // ToDo: Replace with a callback
      $scope.$on('dxCodes', function dxCodes() {
        $log.debug("'dxCodes' message received.");
        $log.debug('dxCodes() called.');
        $scope.dxCodes = store.getDxCodes();
      });

      // ToDo: Replace with a callback
      $scope.$on('billCodes', function billCodes() {
        $log.debug("'billCodes' message received.");
        $log.debug('billCodes() called.');
        $scope.billCodes = store.getBillCodes();
      });

      // ToDo: Replace with a callback
      $scope.$on('newPatients', function newPatients() {
        $log.debug("'newPatients' message received.");
        $log.debug('newPatients() called.');
        $scope.patients = store.getPatients();
        if ($scope.patients != undefined) {
          $scope.patientsValid = true;
        }
        // Can't set up the Grid until both Patients and Visits are retrieved
        if ($scope.patientsValid && $scope.visitsValid) {
          $scope.populateGrid();
          // FixMe: Remove $scope.parent check to increase modularity
          if ($scope.$parent.showSaving)
          // FixMe: Bad! Replace with callback
            $rootScope.$broadcast('saveDone');
        }
      });

      // ToDo: Remove this once the new callback is verified.
      $scope.$on('qbVisitsReady', function qbVisitsReady() {
        $log.debug("'qbVisitsReady' message received.");
        $log.debug('qbVisitsReady() called.');
        $scope.visits = store.getQBVisits();
        if ($scope.visits != undefined) {
          $scope.visitsValid = true;
        }
        // Can't set up the Grid until both Patients and Visits are retrieved
        if ($scope.patientsValid && $scope.visitsValid) {
          $scope.populateGrid();
          if ($scope.$parent.showSaving)
          // FixMe: Bad! Replace with callback
            $rootScope.$broadcast('saveDone');
        }
      });

      $scope.updatePatList = function updatePatList() {
        $log.debug('updatePatList() called.');
        $scope.hospID = store.getHospID();
        // Check if this is just the initial init
        if ($scope.patients && $scope.patients.length &&
          $scope.patients[0].hosp_id == $scope.hospID) {
          // Patient list is current
          $scope.qbGridValid = true;
          // FixMe: Bad! Replace with callback
          $rootScope.$broadcast('qbGridReady');
          return;
        }
        // The new hospital selection doesn't match the store
        $scope.resetQBData();
      };

      var hospSelection = function hospSelection() {
        $log.debug('hospSelection() called.');
        $scope.updatePatList();
      };

      $scope.$on('hospSelection', function onHospSelection() {
        // Received when the parent view hospital selection changes.
        $log.debug("'hospSelection' message received.");
        hospSelection();
      });

      var newRoundsDate = function newRoundsDate() {
        $log.debug('newRoundsDate() called.');
        // Only reset the date if this is a true change; not an init
        if ($scope.roundsDate) {
          $scope.resetQBData();
        }
        $scope.roundsDate = store.getRoundsDate();
      };

      $scope.$on('newRoundsDate', function onNewRoundsDate() {
        // Received when the parent view date selection changes.
        $log.debug("'newRoundsDate' message received.");
        newRoundsDate();
      });

      $scope.$on('saveData', function saveData() {
        $log.debug("'saveData' message received.");
        $log.debug('saveData() called.');
        // Check for any changes to Patients or Visits
        $scope.prepForSave();
        // FixMe: Finish prereqs
        if ($scope.changedPatients.length ||
          $scope.changedVisits.length) {
          // FixMe: Replace the parent calls with messages.
          $scope.$parent.showSaved = false;
          $scope.$parent.showSaving = true;
          // Save the changes
          PatientSvc.savePatArray($scope.changedPatients);
          VisitSvc.saveQBVisitArray($scope.changedVisits);
          /*      ToDo: Finish this & replace above */
          //PatientSvc.savePatArray($scope.changedPatients, $scope.savePatArrayCb);
          //VisitSvc.saveQBVisitArray($scope.changedVisits, $scope.saveVisitArrayCb);
        } else {
          // Make sure no saving or saved flags are set in the parent view.
          // FixMe: Replace the parent calls with messages.
          $scope.$parent.showSaved = false;
          $scope.$parent.showSaving = false;
        }
        /*
         PatientSvc.savePatArray($scope.patients);
         VisitSvc.saveQBVisitArray($scope.visits);
         */

        // force retrieving on new patients and visits after saves
        newRoundsDate();
      });

      $scope.savePatArrayCb = function savePatArrayCb(reason, data) {

      };

      $scope.saveVisitArrayCb = function saveVisitArrayCb(reason, data) {

      };

      $scope.init = function () {
        $log.debug('init() called.');
        $scope.hospID = store.getHospID();
        $scope.roundsDate = store.getRoundsDate();
        $scope.getDxCodes();
        $scope.getBillCodes();
        $scope.setGridOptions();
        // Always get the latest patients upon view open
        //$scope.resetQBData();
      };

      $scope.init();
    }
  ])
;
