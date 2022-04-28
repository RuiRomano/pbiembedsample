(function () {
    var self = this;

    init();

    function init() {

        self.Parameters = {
            workspaceId: getParameterByName("workspaceId")
            ,
            reportId: getParameterByName("reportId")
            ,
            navContentPaneEnabled: ((getParameterByName("navContentPaneEnabled") == null) || (getParameterByName("navContentPaneEnabled") != "false"))
            ,
            filterPaneEnabled: ((getParameterByName("filterPaneEnabled") == null) || (getParameterByName("filterPaneEnabled") != "false"))
            ,
            refreshTimeout: getParameterByName("refreshTimeout")
            ,
            defaultPage: getParameterByName("defaultPage")
        }

        // default refresh to 30s
        if (self.Parameters.refreshTimeout == null) {
            self.Parameters.refreshTimeout = 30;
        }

        getReportToken();
    }

    function getReportToken() {

        console.log("Get new token from API");

        // Get the token for the report

        $.get("api/token/GetReportToken?workspaceid=" + self.Parameters.workspaceId + "&reportid=" + self.Parameters.reportId, handleTokenResponse);
    }

    function handleTokenResponse(data) {

        var token = {
            accessToken: data.accessToken,
            embedUrl: data.embedUrl,
            reportId: data.reportId,
            workspaceId: data.workspaceId,
            expiration: new Date(data.expiration),
            tokenType: data.tokenType
        };

        console.log("TokenId: " + data.tokenId);

        self.token = token;

        if (!self.report) {
            // Load the Report w/ the token
            loadReport(token.reportId, token.embedUrl);
        }
        else {
            self.report.setAccessToken(self.token.accessToken);

            self.report.refresh();
        }
    }


    function loadReport(reportId, embedUrl) {

        // Get models object to access enums for embed configuration

        var models = window['powerbi-client'].models;

        var permissions = models.Permissions.All;

        var config = {
            type: 'report',
            tokenType: models.TokenType[self.token.tokenType],
            accessToken: self.token.accessToken,
            embedUrl: embedUrl,
            id: reportId,
            permissions: permissions,
            settings: {
                filterPaneEnabled: self.Parameters.filterPaneEnabled,
                navContentPaneEnabled: self.Parameters.navContentPaneEnabled
            }
        };

        if (self.Parameters.defaultPage) {
            config.pageName = self.Parameters.defaultPage;
        }

        // Get a reference to the embedded report HTML element

        var embedContainer = document.getElementById('embedContainer');

        // Embed the report and display it within the div container.

        self.report = powerbi.load(embedContainer, config);


        self.report.on("loaded", function () {

            console.log("loaded");

            report.render();

        });

        self.report.on("rendered", function () {
            console.log("rendered");

            if (!self.refreshIntervalId) {
                console.log("Setting refresh interval: " + self.Parameters.refreshTimeout);

                self.refreshIntervalId = setInterval(refreshReport, self.Parameters.refreshTimeout * 1000);
            }
        });
    }

    function refreshReport() {

        var currentDate = new Date();

        // Expire 2 min early

        currentDate = new Date(currentDate.setMinutes(currentDate.getMinutes() + 2))

        if (self.token.expiration <= currentDate) {

            console.log("Token expired");

            getReportToken();
        }
        else {

            // Issue a Power BI Report Refresh

            console.log("Report Refresh");

            self.report.refresh();
        }
    }

    function getParameterByName(name, url) {
        //name = name.toLowerCase();
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

})();