using AI_Travel_Inspector.Models;
using AI_Travel_Inspector.Repositories;
using AI_Travel_Inspector.Services;
using Microsoft.AspNetCore.Mvc;

DotNetEnv.Env.Load();

const long MaxDocumentSizeBytes = 20 * 1024 * 1024;
const int MaxChatHistoryTurns = 40;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<DocumentAnalysisService>();
builder.Services.AddSingleton<GenerativeAiService>();
builder.Services.AddSingleton<ITravelRepository, JsonTravelRepository>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapPost("/api/analyze", async (
    IFormFile file,
    DocumentAnalysisService documentService,
    ILogger<Program> logger) =>
{
    if (file.Length == 0)
        return Results.BadRequest(new { error = "No file selected." });

    if (file.Length > MaxDocumentSizeBytes)
        return Results.BadRequest(new { error = "Files must be 20 MB or smaller." });

    var allowedExtensions = new[]
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"
    };

    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

    if (!allowedExtensions.Contains(extension))
        return Results.BadRequest(new
        {
            error = "File type not supported. Allowed: pdf, jpg, jpeg, png, bmp, tif, tiff."
        });

    using var stream = file.OpenReadStream();

    try
    {
        var result = await documentService.ExtractTextAsync(stream);

        if (string.IsNullOrWhiteSpace(result.Text))
            return Results.UnprocessableEntity(new
            {
                error = "No readable text was found in this document."
            });

        return Results.Ok(new
        {
            fileName = file.FileName,
            pageCount = result.PageCount,
            text = result.Text,
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Document extraction failed");
        return Results.Problem(
            title: "Document extraction failed",
            detail: "The document could not be processed. Check the service configuration and try again.",
            statusCode: StatusCodes.Status500InternalServerError);
    }
})
    .DisableAntiforgery()
    .WithMetadata(new RequestSizeLimitAttribute(MaxDocumentSizeBytes + 1_048_576));

app.MapPost("/api/travel", async (
    PlanRequest request,
    GenerativeAiService generativeService,
    ITravelRepository repository,
    ILogger<Program> logger) =>
{
    if (request.Documents is null || request.Documents.Count == 0)
        return Results.BadRequest(new { error = "No documents provided." });

    if (request.Documents.Any(document => document is null || string.IsNullOrWhiteSpace(document.Text)))
        return Results.BadRequest(new { error = "Each document must contain extracted text." });

    try
    {
        var plan = await generativeService.BuildPlanAsync(request.Documents);
        await repository.AddAsync(plan);
        return Results.Ok(plan);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Could not build a trip plan");
        return Results.Problem(
            title: "Could not build the trip plan",
            detail: "The trip plan could not be created. Check the service configuration and try again.",
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).DisableAntiforgery();

app.MapPost("/api/travel/{id}/chat", async (
    string id,
    ChatRequest request,
    GenerativeAiService generativeService,
    ITravelRepository repository,
    ILogger<Program> logger) =>
{
    if (string.IsNullOrWhiteSpace(request.Message))
        return Results.BadRequest(new { error = "Message is empty." });
    if (request.Message.Length > 4000)
        return Results.BadRequest(new { error = "Messages must be 4,000 characters or fewer." });

    var plan = await repository.GetAsync(id);
    if (plan is null)
        return Results.NotFound(new { error = "Trip not found." });

    try
    {
        var history = plan.ChatHistory.TakeLast(MaxChatHistoryTurns).ToList();
        var answer = await generativeService.ChatAsync(plan, request.Message, history);

        history.Add(new ChatTurn { Role = "user", Content = request.Message });
        history.Add(new ChatTurn { Role = "assistant", Content = answer });
        plan.ChatHistory = history.TakeLast(MaxChatHistoryTurns).ToList();

        await repository.UpdateAsync(plan);

        return Results.Ok(new { answer, history = plan.ChatHistory });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Chat failed for trip {TripId}", id);
        return Results.Problem(
            title: "Chat failed",
            detail: "The assistant could not respond. Check the service configuration and try again.",
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).DisableAntiforgery();

app.MapPut("/api/travel/{id}", async (
    string id,
    PlanRequest request,
    GenerativeAiService generativeService,
    ITravelRepository repository,
    ILogger<Program> logger) =>
{
    if (request.Documents is null || request.Documents.Count == 0)
        return Results.BadRequest(new { error = "No documents provided." });
    if (request.Documents.Any(document => document is null || string.IsNullOrWhiteSpace(document.Text)))
        return Results.BadRequest(new { error = "Each document must contain extracted text." });

    var existing = await repository.GetAsync(id);
    if (existing is null)
        return Results.NotFound(new { error = "Trip not found." });

    try
    {
        var plan = await generativeService.BuildPlanAsync(request.Documents);

        plan.Id = existing.Id;
        plan.CreatedAt = existing.CreatedAt;
        plan.ChatHistory = existing.ChatHistory;

        await repository.UpdateAsync(plan);
        return Results.Ok(plan);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Could not rebuild trip plan for {TripId}", id);
        return Results.Problem(
            title: "Could not rebuild the trip plan",
            detail: "The trip plan could not be updated. Check the service configuration and try again.",
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).DisableAntiforgery();

app.MapDelete("/api/travel/{id}/chat", async (string id, ITravelRepository repository) =>
{
    var plan = await repository.GetAsync(id);
    if (plan is null)
        return Results.NotFound(new { error = "Trip not found." });

    plan.ChatHistory = new List<ChatTurn>();
    await repository.UpdateAsync(plan);
    return Results.NoContent();
});

app.MapGet("/api/travel", async (ITravelRepository repository) =>
{
    var plans = await repository.GetAllAsync();
    return Results.Ok(plans);
});

app.MapGet("/api/travel/{id}", async (string id, ITravelRepository repository) =>
{
    var plan = await repository.GetAsync(id);
    return plan is null
        ? Results.NotFound(new { error = "Trip not found." })
        : Results.Ok(plan);
});

app.MapDelete("/api/travel/{id}", async (string id, ITravelRepository repository) =>
{
    await repository.DeleteAsync(id);
    return Results.NoContent();
});

app.Run();

public class PlanRequest
{
    public List<TravelDocument> Documents { get; set; } = new();
}

public class ChatRequest
{
    public string Message { get; set; } = "";
}
