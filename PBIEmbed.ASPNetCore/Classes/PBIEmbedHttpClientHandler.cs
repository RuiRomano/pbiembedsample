using System.Net;
using System.Net.Http;

using Microsoft.Identity.Client;

using PBIEmbed.ASPNetCore.Configurations;

namespace PBIEmbed.ASPNetCore.Classes
{
	public class PBIEmbedHttpClientHandler : IMsalHttpClientFactory
	{

		public HttpClientHandler HttpClientHandlerProp { get; private set; }
		public HttpClient HttpClientProp { get; private set; }

		public HttpClient GetHttpClient()
		{
			return this.HttpClientProp;
		}

		public PBIEmbedHttpClientHandler(ProxyConfiguration prmProxyConfiguration)
		{
			// Proxy Configuration
			HttpClientHandler _htchHttpClientHandler = new HttpClientHandler();
			_htchHttpClientHandler.UseProxy = prmProxyConfiguration.UseProxy;

			if(prmProxyConfiguration.UseProxy)
			{
				_htchHttpClientHandler.Proxy = new WebProxy(prmProxyConfiguration.ProxyHost, prmProxyConfiguration.ProxyPort);
			}

			this.HttpClientHandlerProp = _htchHttpClientHandler;
			this.HttpClientProp = new HttpClient(_htchHttpClientHandler);
		}
	}
}
