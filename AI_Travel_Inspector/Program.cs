using AI_Travel_Inspector.Models;
using AI_Travel_Inspector.Repositories;
using AI_Travel_Inspector.Services;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<DocumentAnalysisService>();
builder.Services.AddSingleton<GenerativeAiService>();
builder.Services.AddSingleton<ITravelRepository, JsonTravelRepository>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapPost("/api/analyze", async (
    IFormFile file,
    DocumentAnalysisService documentService) =>
{
    if (file.Length == 0)
        return Results.BadRequest(new { error = "No file selected." });

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

        return Results.Ok(new
        {
            fileName = file.FileName,
            pageCount = result.PageCount,
            text = result.Text,
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Document extraction failed",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).DisableAntiforgery();

app.MapPost("/api/travel", async (
    PlanRequest request,
    GenerativeAiService generativeService,
    ITravelRepository repository) =>
{
    if (request.Documents is null || request.Documents.Count == 0)
        return Results.BadRequest(new { error = "No documents provided." });

    try
    {
        var plan = await generativeService.BuildPlanAsync(request.Documents);
        await repository.AddAsync(plan);
        return Results.Ok(plan);
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Could not build the trip plan",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).DisableAntiforgery();

app.MapPost("/api/travel/{id}/chat", async (
    string id,
    ChatRequest request,
    GenerativeAiService generativeService,
    ITravelRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Message))
        return Results.BadRequest(new { error = "Message is empty." });

    var plan = await repository.GetAsync(id);
    if (plan is null)
        return Results.NotFound(new { error = "Trip not found." });

    try
    {
        var history = plan.ChatHistory.ToList();
        var answer = await generativeService.ChatAsync(plan, request.Message, history);

        history.Add(new ChatTurn { Role = "user", Content = request.Message });
        history.Add(new ChatTurn { Role = "assistant", Content = answer });
        plan.ChatHistory = history;

        await repository.UpdateAsync(plan);

        return Results.Ok(new { answer, history = plan.ChatHistory });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Chat failed",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).DisableAntiforgery();

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
