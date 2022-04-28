using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PBIEmbed.ASPNetCore.Classes;
using PBIEmbed.ASPNetCore.Configurations;

namespace PBIEmbed.ASPNetCore
{
	public class Startup
	{
		public Startup(IConfiguration configuration)
		{
			Configuration = configuration;
		}

		public IConfiguration Configuration { get; }

		// This method gets called by the runtime. Use this method to add services to the container.
		public void ConfigureServices(IServiceCollection services)
		{
			services.AddOptions();

			services.AddControllers();

            services.AddMemoryCache();

			services.AddLogging(logging =>
			{
				logging.ClearProviders();
				logging.AddConsole();
				logging.AddAzureWebAppDiagnostics();
			});

            var powerBiConfigurations = new PowerBIConfigurations();
            new ConfigureFromConfigurationOptions<PowerBIConfigurations>(Configuration.GetSection("PowerBIConfigurations")).Configure(powerBiConfigurations);
            services.AddSingleton(powerBiConfigurations);

			var _objProxyConfiguration = new ProxyConfiguration();
			new ConfigureFromConfigurationOptions<ProxyConfiguration>(Configuration.GetSection("ProxyConfiguration")).Configure(_objProxyConfiguration);
			services.AddSingleton(_objProxyConfiguration);

			var _objMyHttpClientHandler = new PBIEmbedHttpClientHandler(_objProxyConfiguration);
			services.AddSingleton(_objMyHttpClientHandler);
		}

		// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
		public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
		{

			if (env.IsDevelopment())
			{
				app.UseDeveloperExceptionPage();
			}

			//app.UseHttpsRedirection();

			app.UseRouting();

			//app.UseAuthorization();

			app.UseStaticFiles();

			app.UseEndpoints(endpoints =>
			{
				endpoints.MapControllers();
			});
		}

	}
}
