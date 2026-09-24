using System.ClientModel;
using System.Globalization;
using System.Text;
using System.Text.Json;
using AI_Travel_Inspector.Models;
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
    private class PlanDto
    {
        public string? Title { get; set; }
        public string? Destination { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public List<string>? Travelers { get; set; }
        public string? Summary { get; set; }
        public List<SegmentDto>? Segments { get; set; }
    }

    private class SegmentDto
    {
        public string? Type { get; set; }
        public string? Title { get; set; }
        public string? Location { get; set; }
        public string? Start { get; set; }
        public string? End { get; set; }
        public string? Details { get; set; }
        public string? Reference { get; set; }
    }
}
