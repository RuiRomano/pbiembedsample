namespace PBIEmbed.ASPNetCore.Configurations
{
	public class ProxyConfiguration
	{
		public bool UseProxy { get; set; } = false;
	
		public string ProxyHost { get; set; }

		public int ProxyPort { get; set; }

	}
}
