namespace PBIEmbed.ASPNetCore
{
    public class PowerBIConfigurations
    {
        public PowerBIConfigurations()
        {
            this.AuthenticationMode = "ClientSecret";
            this.TokenType = "Embed";
        }

        public string Authority { get; set; }
        
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string Password { get; set; }
        public string Username { get; set; }
        public string AuthenticationMode { get; set; }
        public string TokenType { get; set; }
        public string DefaultWorkspaceId { get; set; }
        public string DefaultReportId { get; set; }
    }
}
