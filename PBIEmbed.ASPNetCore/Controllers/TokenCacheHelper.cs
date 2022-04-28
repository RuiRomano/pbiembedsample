using Microsoft.Identity.Client;

using System.IO;
using System.Security.Cryptography;

namespace PBIEmbed.ASPNetCore.Controllers
{
    static class TokenCacheHelper
    {
        private static bool encryptBinary = false;

        public static void EnableSerialization(ITokenCache tokenCache)
        {
            tokenCache.SetBeforeAccess(BeforeAccessNotification);
            tokenCache.SetAfterAccess(AfterAccessNotification);
        }

        /// <summary>
        /// Path to the token cache
        /// </summary>
        private static string cacheFilePath = $"{Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location)}\\TokenCache.msalcache.bin3";

        private static readonly object FileLock = new object();

        private static void BeforeAccessNotification(TokenCacheNotificationArgs args)
        {
            lock (FileLock)
            {
                byte[] bytes = null;

                if (File.Exists(cacheFilePath))
                {
                    bytes = File.ReadAllBytes(cacheFilePath);

                    if (encryptBinary)
                    {
                        bytes = ProtectedData.Unprotect(bytes, null, DataProtectionScope.LocalMachine);
                    }
                }

                args.TokenCache.DeserializeMsalV3(bytes);
            }
        }

        private static void AfterAccessNotification(TokenCacheNotificationArgs args)
        {
            // if the access operation resulted in a cache update
            if (args.HasStateChanged)
            {
                lock (FileLock)
                {
                    // reflect changesgs in the persistent store

                    var bytes = args.TokenCache.SerializeMsalV3();

                    if (encryptBinary)
                    {
                        bytes = ProtectedData.Protect(bytes,
                                                            null,
                                                            DataProtectionScope.LocalMachine);
                    }

                    File.WriteAllBytes(cacheFilePath, bytes);
                }
            }
        }
    }
}
