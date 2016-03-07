angular.module("VisualSearch", ["ionic"])
/**
 * The Projects factory handles saving and loading projects
 * from local storage, and also lets us save and load the
 * last active project index.
 */
.factory("Services", function () {
    return {
        getLastActiveIndex: function () {
            return parseInt(window.localStorage['lastActiveService']) || 0;
        },
        setLastActiveIndex: function (index) {
            window.localStorage['lastActiveService'] = index;
        }
    };
})

.controller('MainController', function ($scope, $timeout, $ionicModal, Services, $ionicSideMenuDelegate) {

    // Load or initialize services
    $scope.services = [
        { name: "JustVisual", settings: { key: "abc" } },
        { name: "CloudSight", settings: {} }
    ];

    // Grab the last active, or the first service
    $scope.activeService = $scope.services[Services.getLastActiveIndex()];

    // Called to select the given service
    $scope.selectService = function (service, index) {
        $scope.activeService = service;
        Services.setLastActiveIndex(index);
        $ionicSideMenuDelegate.toggleLeft(false);
    };

    // Create our modal
    $ionicModal.fromTemplateUrl('templates/settings.html', function (modal) {
        $scope.settingsModal = modal;
    }, {
        scope: $scope
    });

    $scope.updateSettings = function (settings) {
        if (!$scope.activeService || !settings) {
            return;
        }
        console.log("Si settings!!");
        $scope.activeService.settings.key = settings.key;
        $scope.settingsModal.hide();

        // Inefficient, but save all the projects
        //Projects.save($scope.projects);

        settings.key = "";
    };

    $scope.showSettings = function () {
        $scope.settingsModal.show();
    };

    $scope.closeSettings = function () {
        $scope.settingsModal.hide();
    }

    $scope.toggleServices = function () {
        $ionicSideMenuDelegate.toggleLeft();
    };

});