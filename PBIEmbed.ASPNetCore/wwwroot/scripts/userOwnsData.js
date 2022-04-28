(function () {
    var self = this;

    var msalConfig = {
        auth: {
            clientId: "6fa3accc-5e88-4a7a-addd-0467d944153a",
            authority: "https://login.microsoftonline.com/common"
        },
        cache: {
            cacheLocation: "localStorage",
            storeAuthStateInCookie: true
        }
    };

    self.msalObj = new Msal.UserAgentApplication(msalConfig);

    self.msalObj.handleRedirectCallback(msalRedirectCallBack);

    self.msalScopes = {
        scopes: [
            "https://analysis.windows.net/powerbi/api/Dataset.Read.All",
            "https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All",
            "https://analysis.windows.net/powerbi/api/Report.Read.All",
            "https://analysis.windows.net/powerbi/api/Group.Read.All"
        ]
    };

    self.msalAccessToken = null;

    initEvents();

    function initEvents() {

        $(document).on('click', "#btSignInPowerBI", handlePBISignIn);

        $(document).on('click', "#btExportData", handlePBIExport);

        $(document).on("click", ".workspaceLink", handleWorkspaceClick);

        $(document).on("click", ".reportLink", handleReportClick);
    }

    function handlePBISignIn(event) {

        self.msalObj.loginPopup(self.msalScopes).then(function (loginResponse) {

            var userAccount = self.msalObj.getAccount();

            console.log("Logged on: " + userAccount.userName);

            self.msalObj.acquireTokenSilent(self.msalScopes).then(function (tokenResponse) {

                console.log("Access Token acquired silently...")

                self.msalAccessToken = tokenResponse.accessToken;

                loadWorkspaces();

            }).catch(function (error) {

                console.log(error);

                // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
                // Call acquireTokenPopup(popup window)

                //if (requiresInteraction(error.errorCode)) {

                //    self.msalObj.acquireTokenPopup(self.msalScopes).then(function (tokenResponse) {

                //        //callMSGraph(graphConfig.graphMeEndpoint, tokenResponse.accessToken, graphAPICallback);

                //    }).catch(function (error) {

                //        console.log(error);

                //    });
                //}

            });

        }).catch(function (error) {

            console.log(error);

        });

    }

    function loadWorkspaces() {

        pbiRESTAPICall("groups", function (response) {

            response.json().then(function (json) {

                var groups = json.value;

                $("#workspacesMenu").empty();

                var items = [];

                $.each(groups, function (key, val) {
                    items += '<li class="pure-menu-item"><a href="#workspacePage" class="pure-menu-link workspaceLink" data-workspaceid="' + val.id + '" data-workspacename="' + val.name + '" >' + val.name + '</a></li>';
                });

                $("#workspacesMenu").append(items);

                $("#workspacesMenuList,#btExportData").removeClass("hidden");
            });

        });

    }

    function handleWorkspaceClick(event) {

        console.log("workspace link");

        var workspaceId = $(event.currentTarget).data("workspaceid");

        var workspaceName = $(event.currentTarget).data("workspacename");

        $("#workspaceTitle").text(workspaceName);

        pbiRESTAPICall("groups/" + workspaceId + "/reports", function (response) {

            response.json().then(function (json) {

                var reports = json.value;

                $("#workspaceReports").empty();

                var items = [];

                $.each(reports, function (key, val) {

                    items += '<li class="pure-menu-item"><a href="#reportPage" class="pure-menu-link reportLink" data-workspaceid="' + workspaceId + '" data-reportid="' + val.id + '" data-reportname="' + val.name + '" data-reportembedurl="' + val.embedUrl + '" >' + val.name + '</a></li>';

                });

                $("#workspaceReports").append(items);
            });

        });

    }

    function pbiRESTAPICall(resource, responseCallBack) {

        var apiUrl = "https://api.powerbi.com/v1.0/myorg/";

        fetch(apiUrl + resource, {
            headers: {
                "Accept": "application/json;odata.metadata=minimal;",
                "Authorization": "Bearer " + self.msalAccessToken
            }
        }).then(responseCallBack);
    }

    function handleReportClick(event) {

        console.log("report link");

        var workspaceId = $(event.currentTarget).data("workspaceid");

        var reportId = $(event.currentTarget).data("reportid");

        var reportName = $(event.currentTarget).data("reportname");

        var reportEmbedUrl = $(event.currentTarget).data("reportembedurl");

        $("#reportTitle").text(reportName);

        loadReport(reportId, reportEmbedUrl, self.msalAccessToken);
    }

    function loadReport(reportId, embedUrl, accessToken) {

        // Get models object to access enums for embed configuration

        var models = window['powerbi-client'].models;

        var config = {
            type: 'report',
            tokenType: models.TokenType.Aad,
            accessToken: accessToken,
            embedUrl: embedUrl,
            id: reportId,
            permissions: models.Permissions.All,
            settings: {
                filterPaneEnabled: false,
                navContentPaneEnabled: false
            }
        };

        // Get a reference to the embedded report HTML element

        var embedContainer = document.getElementById('pbiReportContainer');

        // Embed the report and display it within the div container.

        self.report = powerbi.load(embedContainer, config);

        self.report.on("loaded", function () {

            console.log("loaded");

            report.getPages()
                .then(function (reportPages) {
                    pages = reportPages;

                    console.log(pages.length);
                });

            report.render();

        });

        self.report.on("commandTriggered", function (event) {
            console.log("Event - commandTriggered:");
            var commandDetails = event.detail;
            console.log(commandDetails);
        });

        self.report.on("rendered", function () {
            console.log("rendered");

        });
    }

    function msalRedirectCallBack(error, response) {

        console.log("redirect callback");

        if (error) {
            console.log(error);
        }
        else {
            if (response.tokenType === "access_token") {

                self.msalAccessToken = tokenResponse.accessToken;

            } else {
                console.log("token type is:" + response.tokenType);
            }
        }
    }

    function handlePBIExport(event) {

        console.log("export Data");


        fetch("api/export/ExportToPBI", {
            headers: {
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ "accessToken": self.msalAccessToken })
        }).then(function (response) {

            console.log("data exported");

            //$("#notificationMsg").text("Data Exported Successfully");

            alert("Data Exported Successfully");

        });

    }

    //function requiresInteraction(errorCode) {
    //    if (!errorCode || !errorCode.length) {
    //        return false;
    //    }
    //    return errorCode === "consent_required" ||
    //        errorCode === "interaction_required" ||
    //        errorCode === "login_required";
    //}
})();