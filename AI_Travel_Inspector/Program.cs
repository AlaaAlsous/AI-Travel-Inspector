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
