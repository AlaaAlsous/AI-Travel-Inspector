using Azure;
using Azure.AI.DocumentIntelligence;

namespace AI_Travel_Inspector.Services;

public class DocumentAnalysisService
{
    private readonly DocumentIntelligenceClient _client;

    public DocumentAnalysisService()
    {
        var endpoint = Environment.GetEnvironmentVariable("DOCUMENT_ENDPOINT")
            ?? throw new InvalidOperationException("DOCUMENT_ENDPOINT is missing from .env");
        var key = Environment.GetEnvironmentVariable("DOCUMENT_KEY")
            ?? throw new InvalidOperationException("DOCUMENT_KEY is missing from .env");

        _client = new DocumentIntelligenceClient(
            new Uri(endpoint),
            new AzureKeyCredential(key)
        );
    }
    public async Task<DocumentTextResult> ExtractTextAsync(Stream fileStream)
    {
        using var memory = new MemoryStream();
        await fileStream.CopyToAsync(memory);
        var fileBytes = BinaryData.FromBytes(memory.ToArray());

        var operation = await _client.AnalyzeDocumentAsync(
            WaitUntil.Completed,
            "prebuilt-read",
            fileBytes);

        var result = operation.Value;

        return new DocumentTextResult(
            Text: result.Content ?? "",
            PageCount: result.Pages.Count);
    }
}

public record DocumentTextResult(string Text, int PageCount);
