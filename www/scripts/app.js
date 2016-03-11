angular.module("VisualSearch", ["ionic"])
/**
 * The Projects factory handles saving and loading projects
 * from local storage, and also lets us save and load the
 * last active project index.
 */
/*.factory("Services", function () {
    return {
        getLastActiveIndex: function () {
            return parseInt(window.localStorage['lastActiveService']) || 0;
        },
        setLastActiveIndex: function (index) {
            window.localStorage['lastActiveService'] = index;
        }
    };
})*/

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

.controller('MainController', function ($scope, $ionicModal, Camera, $http, $ionicSideMenuDelegate) {

    // Load or initialize services
    $scope.services = [
        {
            name: "GoogleCloudVision", key: "AIzaSyA3CSP33Kkj0FN1ypV7UeS_BhEcQjqLzsI", sets: [
                { name: "Label Detection", value: "LABEL_DETECTION" }
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

    // Grab the last active, or the first service
    //$scope.activeService = $scope.services[Services.getLastActiveIndex()];
    $scope.activeService = $scope.services[0];
    $scope.activeSet = $scope.services[0].sets[0]

    $scope.getPhoto = function (album) {
        $scope.results = {};
        // Setting the options object to take a picture either from album or camera
        var options = { // Common options
            destinationType: navigator.camera.DestinationType.FILE_URI, // DATA_URL, FILE_URI, NATIVE_URI
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
            options.correctOrientation = true;
            options.saveToPhotoAlbum = false;
        }
        Camera.getPicture(options).then(function (imageURI) {
            console.log("Picture taken: " + imageURI);
            $scope.lastPhoto = imageURI;

            //
            switch ($scope.activeService.name) {
                case "MetaMind":
                case "GoogleCloudVision":
                    // base64 econding needed
                    var toDataUrl = function (url, callback, outputFormat) {
                        var img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.onload = function () {
                            var canvas = document.createElement('CANVAS');
                            var ctx = canvas.getContext('2d');
                            var dataURL;
                            canvas.height = this.height;
                            canvas.width = this.width;
                            ctx.drawImage(this, 0, 0);
                            dataURL = canvas.toDataURL(outputFormat);
                            callback(dataURL);
                            canvas = null;
                        };
                        img.src = url;
                    };
                    toDataUrl(imageURI, function (base64Img) {
                        // Base64DataURL
                        console.log("Base64 image: " + base64Img);
                        if ($scope.activeService.name === "MetaMind") {
                            // METAMIND
                            var classifier = $scope.activeSet.value;
                            if ($scope.activeSet.name !== "Custom Classifier") {
                                classifier = '"' + classifier + '"';
                            }
                            $http.defaults.headers.common.Authorization = "Basic " + $scope.activeService.key;
                            $http({
                                method: "POST",
                                data: '{"classifier_id":' + classifier + ', "image_url": "' + base64Img + '"}',
                                url: "https://www.metamind.io/vision/classify"
                            }).success(function (result) {
                                console.log("SUCCESS");
                                $scope.results = result;
                                console.log(result);
                            }).error(function (err) {
                                console.log("FAIL");
                                console.log(err);
                                alert(err);
                            });
                        }
                        else {
                            // GOOGLE CLOUD VISION
                            $http({
                                method: "POST",
                                data: '{"requests":[{"image":{"content":"' + base64Img.slice(23) + '"},"features":[{"type":"' + $scope.activeSet.value + '","maxResults":5}]}]}',
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
                            });
                        }

                    }, "image/jpeg");
                    break;
                case "JustVisual":
                    console.log("justvisual here");
            }

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