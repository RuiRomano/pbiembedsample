(function () {
    var self = this;    

    init();


    function init() {
      
        var workspaceId = getParameterByName("workspaceid");

		var reportId = getParameterByName("reportid");

        // Get the token for the report

        $.get("api/token/GetReportToken?workspaceid=" + workspaceId + "&reportid=" + reportId, handleTokenResponse);
   
    }

    function handleTokenResponse(data) {
        var token = {
            accessToken: data.accessToken,
            embedUrl: data.embedUrl,
            reportId: data.reportId,
            workspaceId: data.workspaceId,
            expiration: data.expiration
        };
  
        // Load the Report w/ the token

        loadReport(token.reportId, token.embedUrl, token.accessToken);
    }

  
    function loadReport(reportId, embedUrl, accessToken) {
        
        // Get models object to access enums for embed configuration

        var models = window['powerbi-client'].models;

        var permissions = models.Permissions.All;     

		var blnFilterPaneEnabled = ((getParameterByName("filterpaneenabled") == null) || (getParameterByName("filterpaneenabled") != "false"));

		var blnNavContentPaneEnabled = ((getParameterByName("navcontentpaneenabled") == null) || (getParameterByName("navcontentpaneenabled") != "false"));

        var config = {
            type: 'report',
            tokenType: models.TokenType.Embed,
            accessToken: accessToken,
            embedUrl: embedUrl,
            id: reportId,
            permissions: models.Permissions.All,
            settings: {
				filterPaneEnabled: blnFilterPaneEnabled,
				navContentPaneEnabled: blnNavContentPaneEnabled,
                // Extensions
                extensions: [
                    {
                        command: {
                            name: "extension command",
                            title: "Extend command",
                            extend: {                                
                                visualContextMenu: {                 
                                    title: "Application Action",
                                }
                            }
                        }
                    }
                ]
            }
        };

        // Get a reference to the embedded report HTML element

        var embedContainer = document.getElementById('embedContainer');

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

	function getParameterByName(name, url) {
        if (!url) url = window.location.href.toLocaleLowerCase();
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
   
})();