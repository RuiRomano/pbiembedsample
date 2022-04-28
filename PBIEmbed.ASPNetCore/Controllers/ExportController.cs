using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using Microsoft.PowerBI.Api;
using Microsoft.PowerBI.Api.Models;
//using Microsoft.PowerBI.Api.V2;
//using Microsoft.PowerBI.Api.V2.Models;
using Microsoft.Rest;
using Newtonsoft.Json.Linq;
using PBIEmbed.ASPNetCore.Classes;
using PBIEmbed.ASPNetCore.Configurations;
using PBIEmbed.ASPNetCore.Controllers;

namespace PBIEmbed.ASPNetCore
{
    [Route("api/[controller]/[action]")]
    public class ExportController : Controller
    {
        private readonly ILogger _logger;

        public ExportController(ILogger<TokenController> logger)
        {
            _logger = logger;
        }

        public class ExportDataBody
        {
            public string AccessToken { get; set; }
        }
        public async Task<IActionResult> ExportToPBI([FromBody]ExportDataBody body)
        {
            try
            {
                // Access the API with the User Token (Not the best practice in terms of security :))
                var tokenCredentials = new TokenCredentials(body.AccessToken);

                using (var client = new PowerBIClient(new Uri("https://api.powerbi.com/"), tokenCredentials))
                {
                    // Get the workspace Reports

                    var datasets = await client.Datasets.GetDatasetsAsync();

                    var dataSetName = "TheApp-PBIExport";

                    var dataset = datasets.Value.FirstOrDefault(s => s.Name == dataSetName);

                    // Create DataSet if not exists

                    if (dataset == null)
                    {
                        var createDataSetReq = new CreateDatasetRequest();
                        createDataSetReq.Name = dataSetName;
                        createDataSetReq.Tables = new List<Table>();
                        createDataSetReq.DefaultMode = DatasetMode.Push;

                        createDataSetReq.Tables.Add(new Table
                        {
                            Name = "Data"
                            ,
                            Columns = new List<Column>
                            {
                                new Column("SaleDate", "DateTime")
                                ,
                                new Column("Product", "String")
                                ,
                                new Column("SalesAmount", "Double")
                            }
                        });

                        createDataSetReq.Validate();

                        dataset = await client.Datasets.PostDatasetAsync(createDataSetReq, DefaultRetentionPolicy.None);
                    }

                    // Reset Data

                    await client.Datasets.DeleteRowsAsync(dataset.Id, "Data");

                    // Push new Data

                    var rnd = new Random();

      
                    var jsonObj = new PostRowsRequest(
                            Enumerable.Range(1, 1000).Select(s =>
                            {
                                var productId =rnd.Next(1, 100);
                                var days = rnd.Next(-50, 50);

                                return new JObject(
                                    new JProperty("SaleDate", DateTime.Today.AddDays(days)),
                                    new JProperty("Product", $"Product {productId}"),
                                    new JProperty("SalesAmount", rnd.Next(100, 1000))
                                );
                            }).ToList<object>()
                        );

                    await client.Datasets.PostRowsAsync(dataset.Id
                        , "Data"
                        , jsonObj
                        );
                }

                return Ok();

            }
            catch (Exception _exException)
            {
                _exException = _exException.HandleError();
                _logger.LogError(_exException, "Error GetReports");
                throw _exException;
            }
        }
    }
}
