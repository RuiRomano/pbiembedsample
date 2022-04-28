(function () {
    var self = this;

    initEvents();

    loadReportsMenu();

    function initEvents() {

        $(document).on("click", "#btPrint", handleReportPrintClick);
        $(document).on("click", "#btFilter", handleReportFilterClick);
        $(document).on("click", "#btEdit", handleReportEditClick);
        $(document).on("click", ".reportLink", handleReportClick);
    }

    // 1. Get Reports Metadata

    function loadReportsMenu() {

        // Get the Workspace Reports

        fetch("api/token/GetReports?workspaceid=null").then(function (response) {

            response.json().then(function (data) {

                var items = '';

                $("#reportsMenu").empty();

                $.each(data, function (key, val) {
                    items += '<li class="pure-menu-item"><a href="#reportPage" class="pure-menu-link reportLink" data-workspaceid="' + val.workspaceId + '" data-reportid="' + val.reportId + '" >' + val.reportName + '</a></li>';
                });

                $("#reportsMenu").append(items);

            });
        });

    }

    // 2. Get Report Token + LoadReport

    function handleReportClick(event) {

        console.log("report link");

        var workspaceId = $(event.currentTarget).data("workspaceid");

        var reportId = $(event.currentTarget).data("reportid");

        // Get the Report Embed Token        

        fetch("api/token/GetReportToken?workspaceid=" + workspaceId + "&reportid=" + reportId)
            .then(function (response) {

                response.json().then(function (data) {

                    var token = {
                        accessToken: data.accessToken,
                        embedUrl: data.embedUrl,
                        reportId: data.reportId,
                        workspaceId: data.workspaceId,
                        expiration: data.expiration
                    };

                    // Load the Report

                    $("#reportTitle").text(data.reportName);

                    loadPBIReport(token.reportId, token.embedUrl, token.accessToken);

                    $("#reportActionsMenu").removeClass("hidden");

                });
            });

    }

 
    function loadPBIReport(reportId, embedUrl, accessToken) {

        // Get models object to access enums for embed configuration

        var models = window['powerbi-client'].models;

        var config = {
            type: 'report',            
            tokenType: models.TokenType.Embed,
            accessToken: accessToken,
            embedUrl: embedUrl,
            id: reportId,
            permissions: models.Permissions.All,
            settings: {
                filterPaneEnabled: false,
                navContentPaneEnabled: false,
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

        var embedContainer = document.getElementById('pbiReportContainer');

        // Embed the report and display it within the div container.

        // Prepare the Embed Object

        self.report = powerbi.load(embedContainer, config);

        // When is ready navigate to the page

        self.report.on("loaded", function () {

            console.log("loaded");

            var pages = report.getPages()
                .then(function (reportPages) {

                    var pageName = reportPages[0].name;

                    report.setPage(pageName)
                        .then(function () {
                            console.log("Page was set to: " + pageName);
                        })
                        .catch(function (errors) {
                            console.log(errors);
                        });

                    // This action completes the final actions to embed the report

                    report.render();

                });             
        });

        self.report.on("rendered", function () {

            console.log("rendered OK");

        });

        self.report.on("commandTriggered", function (event) {

            console.log("Event - commandTriggered:");

            var commandDetails = event.detail;

            alert(JSON.stringify(commandDetails));

        });      
    }

    function handleReportPrintClick(event) {

        console.log("report print link");

        report = powerbi.get($('#pbiReportContainer')[0]);

        // Trigger the print dialog for your browser.
        report.print()
            .catch(function (errors) {
                console.log(errors);
            });
    }

    function handleReportFilterClick(event) {

        console.log("report filter link");

        report = powerbi.get($('#pbiReportContainer')[0]);

        const filter = {
            $schema: "http://powerbi.com/product/schema#basic",
            target: {
                table: "Stock Item",
                column: "Category"
            },
            operator: "In",
            values: ["Clothing"]
        };

        report.setFilters([filter])
            .then(function () {
                console.log("Report filter was set.");
            })
            .catch(function (errors) {
                console.log(errors);
            });
    }    

    function handleReportEditClick(event) {

        console.log("report edit link");

        report = powerbi.get($('#pbiReportContainer')[0]);

        report.switchMode("edit");

    }

})();