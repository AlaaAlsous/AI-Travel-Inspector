using System.ClientModel;
using System.Text.Json;
using OpenAI.Responses;

#pragma warning disable OPENAI001

namespace AI_Travel_Inspector.Services;

public class GenerativeAiService
{
    private readonly ResponsesClient _client;
    private readonly string _deployment;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public GenerativeAiService()
    {
        var endpoint = Environment.GetEnvironmentVariable("OPENAI_ENDPOINT")
            ?? throw new InvalidOperationException("OPENAI_ENDPOINT is missing from .env");
        var key = Environment.GetEnvironmentVariable("OPENAI_KEY")
            ?? throw new InvalidOperationException("OPENAI_KEY is missing from .env");
        _deployment = Environment.GetEnvironmentVariable("OPENAI_DEPLOYMENT")
            ?? throw new InvalidOperationException("OPENAI_DEPLOYMENT is missing from .env");

        var options = new ResponsesClientOptions
        {
            Endpoint = new Uri(endpoint)
        };

        _client = new ResponsesClient(new ApiKeyCredential(key), options);
    }
}
