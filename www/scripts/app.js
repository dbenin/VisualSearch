"use strict";

angular.module("VisualSearch", ["ionic"])
/**
 * The Projects factory handles saving and loading projects
 * from local storage, and also lets us save and load the
 * last active project index.
 */
.factory("Storage", function () {
    return {
        getLastActiveIndex: function () {
            return parseInt(window.localStorage['lastActiveService']) || 0;
        },
        setLastActive: function (index) {
            window.localStorage['lastActiveService'] = index;
        }
    };
})

.factory("Camera", ['$q', function ($q) {
    return {
        getPicture: function (options) {
            var q = $q.defer();

            navigator.camera.getPicture(function (result) {
                //
                q.resolve(result);
            }, function (err) {
                q.reject(err);
            }, options);

            return q.promise;
        }
    };
}])

.factory("Search", ['$q', function ($q) {
    return {
        justVisual: function (fileURI, key, server) {
            var q = $q.defer();

            var win = function (r) { q.resolve(r); };
            var fail = function (err) { q.reject(err); };

            var options = new FileUploadOptions();
            options.fileKey = "file";
            options.fileName = fileURI.substr(fileURI.lastIndexOf('/') + 1);
            options.mimeType = "image/jpeg";
            options.httpMethod = "POST";
            options.params = {}; // if we need to send parameters to the server request

            var ft = new FileTransfer();
            ft.upload(fileURI, encodeURI(server + "/api-search?apikey=" + key), win, fail, options, true);

            return q.promise;
        }
    };
}])

.controller('MainController', function ($scope, $ionicModal, Camera, Search, $http, $ionicSideMenuDelegate, $ionicLoading) {

    // Load or initialize services
    $scope.services = [
        {
            name: "GoogleCloudVision", key: "AIzaSyA3CSP33Kkj0FN1ypV7UeS_BhEcQjqLzsI", sets: [
                { name: "Label Detection", value: "LABEL_DETECTION" },
                { name: "Landmark Detection", value: "LANDMARK_DETECTION" },
                { name: "Logo Detection", value: "LOGO_DETECTION" },
                { name: "Text Detection", value: "TEXT_DETECTION" }
            ]
        },
        {
            name: "MetaMind", key: "T2e0GexSpnGDPmxU4xj6kktMx89yl3aGxSGOd9jljRTe19xFYW", sets: [
                { name: "General Classifier", value: "imagenet-1k-net" },
                { name: "Food Classifier", value: "food-net" },
                { name: "Custom Classifier", value: 41291 }
            ]
        },
        {
            name: "JustVisual", key: "8b502b94-24f6-4b97-b33e-a78ad605da31", sets: [
                { name: "Fashion", value: "http://style.vsapi01.com" },
                { name: "Flowers & Plants", value: "http://garden.vsapi01.com" },
                { name: "Furniture", value: "http://decor.vsapi01.com" },
                { name: "Pet", value: "http://pets.vsapi01.com" }
            ]
        }
    ];
    $scope.settings = { saveToAlbum: false };

    // Grab the last active, or the first service and set
    //$scope.activeService = $scope.services[Storage.getLastActiveService()];
    //$scope.activeSet = $scope.activeService.sets[Storage.getLastActiveSet()];
    $scope.activeService = $scope.services[0];
    $scope.activeSet = $scope.services[0].sets[0];

    $scope.showLoading = function () {
        $ionicLoading.show({
            template: '<p>Searching...</p><ion-spinner icon="android" class="spinner-dark"></ion-spinner>'
        });
    };

    $scope.hideLoading = function () {
        $ionicLoading.hide();
    };

    $scope.getPhoto = function (album) {
        $scope.results = {};
        // Setting the options object to take a picture either from album or camera
        var options = { // Common options
            //destinationType: navigator.camera.DestinationType.FILE_URI, // DATA_URL, FILE_URI, NATIVE_URI
            targetWidth: 320,
            targetHeight: 320
        };
        if (album) { // From album
            options.sourceType = navigator.camera.PictureSourceType.SAVEDPHOTOALBUM; // PHOTOLIBRARY, CAMERA, SAVEDPHOTOALBUM
            options.mediaType = navigator.camera.MediaType.PICTURE;  // PICTURE, VIDEO, ALLMEDIA
        }
        else { // From camera
            options.quality = 50; // 0-100
            options.sourceType = navigator.camera.PictureSourceType.CAMERA; // PHOTOLIBRARY, CAMERA, SAVEDPHOTOALBUM
            options.encodingType = navigator.camera.EncodingType.JPEG; // JPEG, PNG
            options.correctOrientation = false;
            options.saveToPhotoAlbum = $scope.settings.saveToAlbum;
        }
        //console.log("Save: " + options.saveToPhotoAlbum);
        //console.log("Servizio: " + $scope.activeService.name);
        if ($scope.activeService.name != "JustVisual") {
            options.destinationType = navigator.camera.DestinationType.DATA_URL; // DATA_URL, FILE_URI, NATIVE_URI
        }
        else {
            options.destinationType = navigator.camera.DestinationType.FILE_URI; // DATA_URL, FILE_URI, NATIVE_URI
        }
        Camera.getPicture(options).then(function (image) {
            console.log("Image: " + image);
            if ($scope.activeService.name != "JustVisual") {
                $scope.lastPhoto = "data:image/jpeg;base64," + image;
            }
            else {
                $scope.lastPhoto = image;
            }
            console.log("Scope: " + $scope.lastPhoto);
            $scope.showLoading($ionicLoading);
            switch ($scope.activeService.name) {
                case "MetaMind":
                    var classifier = $scope.activeSet.value;
                    if ($scope.activeSet.name != "Custom Classifier") {//aggiungo le virgolette al classifier se non e' custom
                        classifier = '"' + classifier + '"';
                    }
                    $http.defaults.headers.common.Authorization = "Basic " + $scope.activeService.key;
                    $http({
                        method: "POST",
                        data: '{"classifier_id":' + classifier + ', "image_url": "' + $scope.lastPhoto + '"}',
                        url: "https://www.metamind.io/vision/classify"
                    }).success(function (result) {
                        console.log("SUCCESS");
                        $scope.results = result;
                        console.log(result);
                    }).error(function (err) {
                        console.log("FAIL");
                        console.log(err);
                        alert(err.message);
                    }).finally(function () {
                        $scope.hideLoading($ionicLoading);
                    });
                    break;   
                case "GoogleCloudVision":
                    $http({
                        method: "POST",
                        data: '{"requests":[{"image":{"content":"' + image + '"},"features":[{"type":"' + $scope.activeSet.value + '","maxResults":5}]}]}',
                        url: "https://vision.googleapis.com/v1/images:annotate?key=" + $scope.activeService.key
                    }).success(function (result) {
                        console.log("SUCCESS");
                        $scope.results = result;
                        console.log(result);
                    }).error(function (err) {
                        alert(err.error.message);
                        console.log("FAIL");
                        console.log(err);
                        alert(err);
                    }).finally(function () {
                        $scope.hideLoading($ionicLoading);
                    });
                    break;
                case "JustVisual":
                    Search.justVisual(image, $scope.activeService.key, $scope.activeSet.value).then(function (result) {
                        $scope.results = JSON.parse(result.response);
                    }, function (err) {
                        console.log(err);
                        alert(err);
                    }).finally(function () {
                        $scope.hideLoading($ionicLoading);
                    });
                    break;
            }
        }, function (err) {
            alert(err);
        }).finally(function () {
            
        });
    };

    // Called to select the given service
    $scope.selectService = function (service, index) {
        $scope.activeService = service;
        $scope.activeSet = service.sets[index];
        //console.log("Active service: " + $scope.activeService.name);
        //Services.setLastActiveIndex(index);

        $scope.results = {};

        $ionicSideMenuDelegate.toggleLeft(false);
    };

    // Create settings modal
    $ionicModal.fromTemplateUrl('templates/settings.html', function (modal) {
        $scope.settingsModal = modal;
    }, {
        scope: $scope
    });

    // Create results modal
    $ionicModal.fromTemplateUrl('templates/results.html', function (modal) {
        $scope.resultsModal = modal;
    }, {
        scope: $scope
    });

    $scope.updateSettings = function (settings) {
        if (!$scope.activeService || !settings) {
            return;
        }
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
    };

    $scope.showResults = function () {
        $scope.resultsModal.show();
    };

    $scope.closeResults = function () {
        $scope.resultsModal.hide();
    };

    $scope.toggleServices = function () {
        $ionicSideMenuDelegate.toggleLeft();
    };

});