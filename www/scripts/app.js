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

.factory("JustVisual", ['$http', function ($http) {
    return {
        searchByUrl: function (imgUrl, settings) {
            return $http({
                method: "GET",
                url: settings.server + "api-search/by-url?url=" + imgUrl + "&apikey=" + settings.key
            });
        }
    }
}])

.controller('MainController', function ($scope, $timeout, $ionicModal, Services, JustVisual, $ionicSideMenuDelegate) {

    // Load or initialize services
    $scope.services = [
        { name: "JustVisual", settings: { key: "8b502b94-24f6-4b97-b33e-a78ad605da31", server: "http://decor.vsapi01.com/" } },
        { name: "CloudSight", settings: {} }
    ];

    // Grab the last active, or the first service
    $scope.activeService = $scope.services[Services.getLastActiveIndex()];

    $scope.results = {};
    $scope.getResults = function () {
        JustVisual.searchByUrl("http://myofficeideas.com/wp-content/uploads/2012/05/Leather-Office-Executive-Swivel-Chair.jpg", $scope.activeService.settings)
        .success(function (data) {
            console.log("Funziona!");
            $scope.results = data;
            console.log(data.images.length);
            console.log(data.searchId);
        });
    };

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
        //Services.save($scope.services);

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