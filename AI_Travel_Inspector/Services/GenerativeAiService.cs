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

    private static readonly BinaryData PlanSchemaData = BinaryData.FromString(PlanJsonSchema);

    private const string PlanSystemPrompt = """
    - You are a meticulous travel assistant. 
    - You extract structured travel data from travel documents and write a friendly summary.
    - Always respond in English.
    """;

    private const string PlanJsonSchema = """
    {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "description": "Short trip title" },
        "destination": { "type": "string", "description": "Main destination, e.g. Istanbul, Turkey" },
        "startDate": { "type": "string", "description": "ISO date (YYYY-MM-DD) or empty string" },
        "endDate": { "type": "string", "description": "ISO date (YYYY-MM-DD) or empty string" },
        "travelers": { "type": "array", "items": { "type": "string" } },
        "summary": { "type": "string", "description": "A friendly 2-4 sentence summary of the whole trip in English" },
        "segments": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": { "type": "string", "enum": ["Flight", "Hotel", "Activity", "Transport", "Other"] },
              "title": { "type": "string" },
              "location": { "type": "string" },
              "start": { "type": "string", "description": "ISO date-time or empty string" },
              "end": { "type": "string", "description": "ISO date-time or empty string" },
              "details": { "type": "string" },
              "reference": { "type": "string" }
            },
            "required": ["type", "title", "location", "start", "end", "details", "reference"]
          }
        }
      },
      "required": ["title", "destination", "startDate", "endDate", "travelers", "summary", "segments"]
    }
    """;

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

    public async Task<TravelPlan> BuildPlanAsync(IReadOnlyList<TravelDocument> documents)
    {
        var input = new List<ResponseItem>
        {
            ResponseItem.CreateUserMessageItem(BuildPlanPrompt(documents)),
        };

        var options = new CreateResponseOptions(_deployment, input)
        {
            Instructions = PlanSystemPrompt,
            TextOptions = new ResponseTextOptions
            {
                TextFormat = ResponseTextFormat.CreateJsonSchemaFormat(
                    jsonSchemaFormatName: "travel_plan",
                    jsonSchema: PlanSchemaData,
                    jsonSchemaFormatDescription: "A structured travel plan extracted from booking documents",
                    jsonSchemaIsStrict: true),
            },
        };

        ResponseResult response = await _client.CreateResponseAsync(options);

        var json = ExtractJson(response.GetOutputText());
        var dto = JsonSerializer.Deserialize<PlanDto>(json, JsonOptions)
            ?? throw new InvalidOperationException("Could not parse the AI's JSON response.");

        var plan = MapPlan(dto);
        plan.Documents = documents.ToList();
        return plan;
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
