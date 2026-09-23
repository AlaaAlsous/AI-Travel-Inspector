using System.Text.Json;
using AI_Travel_Inspector.Models;

namespace AI_Travel_Inspector.Repositories;

public class JsonTravelRepository : ITravelRepository
{
    private readonly string _filePath;
    private readonly JsonSerializerOptions _options = new() { WriteIndented = true };
    private readonly SemaphoreSlim _lock = new(1, 1);

    public JsonTravelRepository(IWebHostEnvironment env)
    {
        var dataDirectory = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "travel.json");
    }

    public async Task<List<TravelPlan>> GetAllAsync()
    {
        await _lock.WaitAsync();
        try { return await LoadAsync(); }
        finally { _lock.Release(); }
    }

    public async Task<TravelPlan?> GetAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var plans = await LoadAsync();
            return plans.FirstOrDefault(x => x.Id == id);
        }
        finally { _lock.Release(); }
    }

    public async Task AddAsync(TravelPlan plan)
    {
        await _lock.WaitAsync();
        try
        {
            var plans = await LoadAsync();
            plans.Add(plan);
            await SaveAsync(plans);
        }
        finally { _lock.Release(); }
    }

    public async Task UpdateAsync(TravelPlan plan)
    {
        await _lock.WaitAsync();
        try
        {
            var plans = await LoadAsync();
            var index = plans.FindIndex(x => x.Id == plan.Id);
            if (index >= 0)
                plans[index] = plan;
            await SaveAsync(plans);
        }
        finally { _lock.Release(); }
    }

    public async Task DeleteAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var plans = await LoadAsync();
            plans.RemoveAll(x => x.Id == id);
            await SaveAsync(plans);
        }
        finally { _lock.Release(); }
    }

    private async Task<List<TravelPlan>> LoadAsync()
    {
        if (!File.Exists(_filePath))
            return new List<TravelPlan>();

        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<List<TravelPlan>>(json)
            ?? new List<TravelPlan>();
    }

    private async Task SaveAsync(List<TravelPlan> plans)
    {
        var json = JsonSerializer.Serialize(plans, _options);
        await File.WriteAllTextAsync(_filePath, json);
    }
}
