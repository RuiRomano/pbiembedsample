(function () {
    var self = this;
    
    var tokenexpiration = new Date();

    self.tokenName = 'pbirtoken';

    self.tokenEmbedUrlName = 'pbirtoken';

    self.viewMode = "view";

    init();

    function init() {
     
        // Get the token for the report

        $.get("api/token/GetReportToken", handleTokenResponse);
   
    }

    function handleTokenResponse(data) {
        var token = {
            accessToken: data.accessToken,
            embedUrl: data.embedUrl,
            reportId: data.reportId,
            workspaceId: data.workspaceId,
            expiration: data.expiration
        };

        tokenexpiration = new Date(token.expiration);

        //para simular expiração antes 2 minutos
        tokenexpiration.setTime(tokenexpiration.getTime() - 2 * 60 * 1000);

        console.log(tokenexpiration);

        // Load the Report w/ the token

        loadReport(token.reportId, token.embedUrl, token.accessToken);
    } 

    function loadReport(reportId, embedUrl, accessToken) {
        
        // Get models object to access enums for embed configuration

        var models = window['powerbi-client'].models;

        var permissions = models.Permissions.All;

        //var tokenType = models.TokenType.Aad;
        var tokenType = models.TokenType.Embed;      

        var config = {
            type: 'visual',
            tokenType: tokenType,
            accessToken: accessToken,
            embedUrl: embedUrl,
            id: reportId,
            permissions: permissions,
            pageName: "ReportSection6e1e1158221b0a018d8e",
            visualName: "ad5e1afc389191737b70",
            settings: {
				filterPaneEnabled: true,
				navContentPaneEnabled: true  
            }
        };

        // Get a reference to the embedded report HTML element

        self.embedContainer = document.getElementById('embedContainer');

        // Embed the report and display it within the div container.

        self.report = powerbi.embed(embedContainer, config);


        self.report.on("loaded", function () {

            console.log("loaded");      

            var visualObject = powerbi.get(self.embedContainer);

            visualObject.updateSettings(
                {
                    filterPaneEnabled: true,
                    navContentPaneEnabled: true
                });

            //setVisualFilters(visualObject);

            printFilters(visualObject);           

        });

        self.report.on("rendered", function () {
            console.log("rendered");

          
        });

        function setVisualFilters(powerbiVisual) {

           // var page = powerbiVisual.page().then(function (page) {
           //     console.log(page);
            
           // })
           //.catch(function (errors) {
           //         console.log(errors);
           // });

            const filterValues = [
                {
                    $schema: "http://powerbi.com/product/schema#basic",
                    target: {
                        table: "Stock Item",
                        column: "Category"
                    },
                    operator: "In",
                    values: ["Clothing", "Accessories", "Toys"]
                }
                //,
                //{
                //    $schema: "http://powerbi.com/product/schema#basic",
                //    target: {
                //        table: "Stock Item",
                //        column: "Color"
                //    },
                //    operator: "In",
                //    values: ["Red"]
                //}
                ,
                // FIltro Novo
                {
                    $schema: "http://powerbi.com/product/schema#basic",
                    target: {
                        table: "Stock Item",
                        column: "Brand"
                    },
                    operator: "In",
                    values: ["Northwind"]
                },
                // Tem filtro no report e faz um "AND" com este
                {
                    $schema: "http://powerbi.com/product/schema#basic",
                    target: {
                        table: "Calendar",
                        column: "Year"
                    },
                    operator: "In",
                    values: [2015]
                }
            ];

            powerbiVisual.setFilters(filterValues)
                .then(function () {
                    console.log("filter ok");

                    console.log(powerbiVisual);

                    printFilters(powerbiVisual);
                })
                .catch(function (errors) {
                    console.log(errors);
                });
        }

        function printFilters(powerbiVisual) {

            powerbiVisual.getFilters(models.FiltersLevel.Report)
                .then(function (filtersParam) {

                    console.log("report filters");
                    var filters = filtersParam;

                    console.log(filters);
                });

            powerbiVisual.getFilters(models.FiltersLevel.Page)
                .then(function (filtersParam) {

                    console.log("page filters");
                    var filters = filtersParam;

                    console.log(filters);
                });

            powerbiVisual.getFilters()
                .then(function (filtersParam) {

                    var filters = filtersParam;
                    console.log("visual filters");
                    console.log(filters);
                });
        }

    }
   
})();