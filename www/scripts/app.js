"use strict";

angular.module("VisualSearch", ["ionic"])
/**
 * The Projects factory handles saving and loading projects
 * from local storage, and also lets us save and load the
 * last active project index.
 */
.factory("Storage", function () {
    return {
        getLastActiveService: function () {
            return parseInt(window.localStorage['lastActiveServiceIndex']) || 0;
        },
        getLastActiveSet: function () {
            return parseInt(window.localStorage['lastActiveSetIndex']) || 0;
        },
        setLastActive: function (serviceIndex, setIndex) {
            window.localStorage['lastActiveServiceIndex'] = serviceIndex;
            window.localStorage['lastActiveSetIndex'] = setIndex;
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

.factory("Search", ['$q', '$http', function ($q, $http) {
    return {
        googleCloudVision: function (image, key, type) {
            return $http({
                method: "POST",
                data: '{"requests":[{"image":{"content":"' + image + '"},"features":[{"type":"' + type + '","maxResults":5}]}]}',
                url: "https://vision.googleapis.com/v1/images:annotate?key=" + key
            });
        },
        metaMind: function (image, key, classifier) {
            if (isNaN(classifier)) {//aggiungo le virgolette al classifier se non e' custom (quindi non e' un numero ma una stringa)
                classifier = '"' + classifier + '"';
            }
            $http.defaults.headers.common.Authorization = "Basic " + key;
            return $http({
                method: "POST",
                data: '{"classifier_id":' + classifier + ', "image_url": "' + image + '"}',
                url: "https://www.metamind.io/vision/classify"
            });
        },
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
        },
        imagga: function (fileURI, key, endpoint) {
            console.log("imagga " + fileURI);
            var i = fileURI.indexOf('?');
            console.log(i);
            if (i > 0) { // Ha ?qualcosa dopo il nome del file, da togliere
                fileURI = fileURI.substr(0, i);
            }
            console.log("imagga " + fileURI);
            var q = $q.defer();

            var win = function (r) {
                //response:{"status": "error", "message": "No valid files received for uploading."}
                //response:{"status": "success", "uploaded": [{"id": "83b31dec5efbc8443414093ab7668363", "filename": "1458077576115.jpg"}]}
                var result = JSON.parse(r.response);
                if (result.status === "success") {
                    var id = result.uploaded[0].id;
                    console.log(id);
                    $http.defaults.headers.common.Authorization = key;
                    $http({
                        method: "GET",
                        url: "https://api.imagga.com/v1/" + endpoint + "?content=" + id
                    }).then(function (r) {
                        q.resolve(r);
                    }, function (err) {
                        q.reject(err);
                    });
                }
                else {
                    q.reject(r);
                }
            };
            var fail = function (err) { q.reject(err); };

            var options = new FileUploadOptions();
            options.fileKey = "file";
            options.fileName = fileURI.substr(fileURI.lastIndexOf('/') + 1);
            options.mimeType = "image/jpeg";
            options.httpMethod = "POST";
            //options.params = {}; // if we need to send parameters to the server request
            options.headers = {"Authorization": key};

            var ft = new FileTransfer();
            ft.upload(fileURI, encodeURI("https://api.imagga.com/v1/content"), win, fail, options, true);

            return q.promise;
        },
        cloudSight: function (image, key) {
            var q = $q.defer();
            $.ajax({
                type: "POST",
                processData: false,
                contentType: false,
                url: "https://api.cloudsightapi.com/image_requests",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "CloudSight " + key);
                },
                data: {
                    "image_request[image]": image,
                    //"image_request[remote_image_url]": "http://pf.pfgcdn.net/sites/poltronafrau.com/files/styles/scheda_prodotto_gallery/public/content/catalogo/any_case/immagini/anycase.jpg",
                    "image_request[locale]": "en-US"
                },
                success: function (r) {
                    q.resolve(r);
                },
                error: function (err) {
                    q.reject(err);
                }
            });
            return q.promise;
        }
    };
}])

.controller('MainController', function ($scope, $ionicModal, Storage, Camera, Search, $ionicSideMenuDelegate, $ionicLoading) {

    // Load or initialize services
    $scope.services = [
        /*{
            name: "CloudSight", key: "Q-mo9tM_bf4fGlaJaAoZ8g", sets: [
                { name: "Product", value: "" }
            ]
        },*/
        {
            name: "Imagga", key: "Basic YWNjX2YzMDMyOTkxNzUwODY1Mzo5N2U0YmI4ZjYxMDBlMjc2M2M4ZjNhOTg3YWM2ZDk0Zg==", sets: [
                { name: "Tagging", value: "tagging" }
            ]
        },
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
    $scope.activeService = $scope.services[Storage.getLastActiveService()];
    $scope.activeSet = $scope.activeService.sets[Storage.getLastActiveSet()];
    //$scope.activeService = $scope.services[0];
    //$scope.activeSet = $scope.services[0].sets[0];

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
        if (($scope.activeService.name !== "JustVisual") && ($scope.activeService.name !== "Imagga")) {
            options.destinationType = navigator.camera.DestinationType.DATA_URL; // DATA_URL, FILE_URI, NATIVE_URI
        }
        else {
            options.destinationType = navigator.camera.DestinationType.FILE_URI; // DATA_URL, FILE_URI, NATIVE_URI
        }
        Camera.getPicture(options).then(function (image) {
            console.log("Image: " + image);
            if (($scope.activeService.name !== "JustVisual") && ($scope.activeService.name !== "Imagga")) {
                $scope.lastPhoto = "data:image/jpeg;base64," + image;
            }
            else {
                $scope.lastPhoto = image;
            }
            console.log("Scope: " + $scope.lastPhoto);

            $scope.showLoading($ionicLoading);

            switch ($scope.activeService.name) {
                case "GoogleCloudVision":
                    Search.googleCloudVision(image, $scope.activeService.key, $scope.activeSet.value).then(function (result) {
                        $scope.results = result.data;
                        console.log(result);
                    }, function (err) {
                        console.log(err);
                        alert(err.error.message);
                    }).finally(function () {
                        $scope.hideLoading($ionicLoading);
                    });
                    break;
                case "MetaMind":
                    Search.metaMind($scope.lastPhoto, $scope.activeService.key, $scope.activeSet.value).then(function (result) {
                        $scope.results = result.data;
                        console.log(result);
                    }, function (err) {
                        console.log(err);
                        alert(err.message);
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
                case "Imagga":
                    Search.imagga(image, $scope.activeService.key, $scope.activeSet.value).then(function (result) {
                        console.log("SUCCESS");
                        console.log(result);
                        //$scope.results = JSON.parse(result.response);
                    }, function (err) {
                        console.log("FAIL");
                        console.log(err);
                        alert(err);
                    }).finally(function () {
                        $scope.hideLoading($ionicLoading);
                    });
                    break;
                case "CloudSight":
                    Search.cloudSight($scope.lastPhoto, $scope.activeService.key).then(function (result) {
                        //$scope.results = JSON.parse(result.response);
                        console.log("Token: " + result.token);
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
            //
        });
    };

    // Called to select the given service
    $scope.selectService = function (serviceIndex, setIndex) {
        //console.log(service + " " + index);
        $scope.activeService = $scope.services[serviceIndex];
        $scope.activeSet = $scope.activeService.sets[setIndex];
        //console.log("Active service: " + $scope.activeService.name);
        Storage.setLastActive(serviceIndex, setIndex);

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
