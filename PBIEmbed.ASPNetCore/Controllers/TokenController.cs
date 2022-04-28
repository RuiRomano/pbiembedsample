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
using Microsoft.Rest;
using PBIEmbed.ASPNetCore.Classes;
using PBIEmbed.ASPNetCore.Configurations;
using PBIEmbed.ASPNetCore.Controllers;

namespace PBIEmbed.ASPNetCore
{
    [Route("api/[controller]/[action]")]
    public class TokenController : Controller
    {
        private readonly string apiResource = "https://analysis.windows.net/powerbi/api";

        private IMemoryCache cache;
        private readonly ILogger logger;

        public TokenController(IMemoryCache memoryCache, ILogger<TokenController> logger)
        {
            cache = memoryCache;
            this.logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetReportToken([FromQuery]string workspaceId,
                                                        [FromQuery]string reportId,
                                                        [FromServices] PowerBIConfigurations options,
                                                        [FromServices] ProxyConfiguration prmProxyConfiguration,
                                                        [FromServices] PBIEmbedHttpClientHandler prmPBIEmbedHttpClientHandler
                                                        )
        {
            try
            {
                if (string.IsNullOrEmpty(workspaceId) || workspaceId == "null")
                    workspaceId = options.DefaultWorkspaceId;
                if (string.IsNullOrEmpty(reportId) || reportId == "null")
                    reportId = options.DefaultReportId;

                logger.LogInformation("Get Report Token");

                var accessToken = await GetServiceToken(options, prmPBIEmbedHttpClientHandler);

                var tokenCredentials = new TokenCredentials(accessToken.Token);

                Report report = null;
                EmbedToken token = null;
                using (var client = new PowerBIClient(new Uri("https://api.powerbi.com/"), tokenCredentials, prmPBIEmbedHttpClientHandler.HttpClientHandlerProp))
                {
                    // Get the workspace Reports

                    var reports = await client.Reports.GetReportsInGroupAsync(new Guid(workspaceId));

                    // Get the specific Report

                    report = await client.Reports.GetReportInGroupAsync(new Guid(workspaceId), new Guid(reportId));

                    if (options.TokenType == "Embed")
                    {
                        // Get PBI Embed token with edit Permission

                        var generateTokenRequestParameters = new GenerateTokenRequest(TokenAccessLevel.View);

                        //generateTokenRequestParameters.Identities = new List<EffectiveIdentity>()
                        //{
                        //    new EffectiveIdentity()
                        //    {
                        //        Username = "Amy Trefl"
                        //        ,
                        //        Datasets = new List<string>() { report.DatasetId}
                        //        ,
                        //        Roles = new List<string>() { "EmployeeRole" }
                        //    }
                        //};

                        // Generate the Embed Token

                        token = await client.Reports.GenerateTokenInGroupAsync(new Guid(workspaceId),
                                                                                report.Id,
                                                                                generateTokenRequestParameters);
                    }
                    else if(options.TokenType == "Aad")
                    {
                        token = accessToken;
                    }

                }

                var resp = new
                {
                    reportId = report.Id,
                    workspaceId,
                    tokenId = token.TokenId,
                    embedUrl = report.EmbedUrl,
                    reportName = report.Name,
                    accessToken = token.Token,
                    expiration = token.Expiration.ToString("o"),
                    tokenType = options.TokenType
                };

                return Ok(resp);
            }
            catch (Exception _exException)
            {
                _exException = _exException.HandleError();
                logger.LogError(_exException, "Error GetReportToken");
                throw _exException;
            }
        }

        private async Task<EmbedToken> GetServiceToken(PowerBIConfigurations options,
                                            PBIEmbedHttpClientHandler prmPBIEmbedHttpClientHandler)
        {
            if (options.AuthenticationMode == "DeviceCode")
            {
                return await GetTokenUsingDeviceCode(options, prmPBIEmbedHttpClientHandler);
            }
            else
            {
                return await GetTokenUsingClientSecret(options, prmPBIEmbedHttpClientHandler);
            }
        }

        private async Task<EmbedToken> GetTokenUsingClientSecret(PowerBIConfigurations options,
                                                                PBIEmbedHttpClientHandler prmPBIEmbedHttpClientHandler)

        {
            this.logger.LogInformation("Get Token using Client Secret");

            var appConfidential = ConfidentialClientApplicationBuilder.Create(options.ClientId)
                                                                        .WithClientSecret(options.ClientSecret)
                                                                        .WithAuthority(options.Authority)
                                                                        .WithHttpClientFactory(prmPBIEmbedHttpClientHandler)
                                                                        .Build();

            // CLientSecret doesnt need scopes

            // https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent

            var scopesDefault = new string[] { $"{apiResource}/.default" };

            var authResult = await appConfidential.AcquireTokenForClient(scopesDefault).ExecuteAsync();

            return ToEmbedToken(authResult);
        }

        private async Task<EmbedToken> GetTokenUsingDeviceCode(PowerBIConfigurations options,
                                                            PBIEmbedHttpClientHandler prmPBIEmbedHttpClientHandler)
        {
            this.logger.LogInformation("Get Token using Device Code");

            // Docs: https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/wiki/Device-Code-Flow
            // TODO: Review this process and check every error situation as in the docs above

            // https://docs.microsoft.com/en-us/rest/api/power-bi/embedtoken
            //var scopesDefault = new string[] {
            //    $"{apiResource}/Report.ReadWrite.All"
            //    , $"{apiResource}/Dataset.ReadWrite.All"
            //    , $"{apiResource}/Content.Create"
            //};

            var scopesDefault = new string[] {
                $"{apiResource}/.default"
            };

            var app = PublicClientApplicationBuilder
                 .Create(options.ClientId)
                 .WithAuthority(options.Authority)
                 //.WithRedirectUri("https://login.microsoftonline.com/common/oauth2/nativeclient")
                 .WithHttpClientFactory(prmPBIEmbedHttpClientHandler)
                 .Build();

            TokenCacheHelper.EnableSerialization(app.UserTokenCache);

            AuthenticationResult result = null;

            var accounts = await app.GetAccountsAsync();

            if (accounts.Count() != 0)
            {
                // All AcquireToken* methods store the tokens in the cache, so check the cache first
                try
                {
                    result = await app.AcquireTokenSilent(scopesDefault, accounts.FirstOrDefault()).ExecuteAsync();
                }
                // A MsalUiRequiredException happened on AcquireTokenSilent. This indicates you need to call AcquireTokenInteractive to acquire a token                
                catch (MsalUiRequiredException) { }
            }

            if (result == null || string.IsNullOrEmpty(result.AccessToken))
            {
                result = await app.AcquireTokenWithDeviceCode(scopesDefault,
                  deviceCodeCallback =>
                  {
                      var deviceCodeFile = "DeviceCode.txt";

                      var msg = $"Go to {deviceCodeCallback.VerificationUrl} and enter device code {deviceCodeCallback.UserCode}";

                      logger.LogWarning(msg);

                      //Console.WriteLine(msg);

                      System.IO.File.WriteAllText(deviceCodeFile, msg);

                      return Task.FromResult(0);

                  }).ExecuteAsync();
            }

            return ToEmbedToken(result);
        }

        private EmbedToken ToEmbedToken(AuthenticationResult result)
        {
            return new EmbedToken
            (
                result.AccessToken,
                (result.UniqueId != null ? new Guid(result.UniqueId) : new Guid()),
                result.ExpiresOn.UtcDateTime
            );
        }

        [HttpGet]
        public async Task<IActionResult> GetReports([FromQuery]string workspaceId,
                                            [FromServices] PowerBIConfigurations options,
                                            [FromServices] ProxyConfiguration prmProxyConfiguration,
                                            [FromServices] PBIEmbedHttpClientHandler prmPBIEmbedHttpClientHandler
    )
        {
            try
            {
                if (string.IsNullOrEmpty(workspaceId) || workspaceId == "null")
                    workspaceId = options.DefaultWorkspaceId;

                logger.LogInformation("Get Reports");

                var accessToken = await GetServiceToken(options, prmPBIEmbedHttpClientHandler);

                var tokenCredentials = new TokenCredentials(accessToken.Token);

                Reports reports = null;
                using (var client = new PowerBIClient(new Uri("https://api.powerbi.com/"), tokenCredentials, prmPBIEmbedHttpClientHandler.HttpClientHandlerProp))
                {
                    reports = await client.Reports.GetReportsInGroupAsync(new Guid(workspaceId));
                }

                var resp = reports.Value.Select(report =>
                {
                    return new
                    {
                        reportId = report.Id,
                        reportName = report.Name,
                        workspaceId
                    };
                });

                return Ok(resp);
            }
            catch (Exception _exException)
            {
                _exException = _exException.HandleError();
                logger.LogError(_exException, "Error GetReports");
                throw _exException;
            }
        }
              
    }
}
