using System;

using Microsoft.Rest;

namespace PBIEmbed.ASPNetCore.Classes
{
	public static class ErrorHelper
	{
		public static Exception HandleError(this Exception prmException)
		{
			if(prmException is HttpOperationException)
			{
				HttpOperationException httpEx = (HttpOperationException)prmException;

				prmException = new Exception(httpEx.Response.Content, httpEx);
			}

			return prmException;
		}

	}
}
