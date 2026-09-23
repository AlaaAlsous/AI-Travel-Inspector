using AI_Travel_Inspector.Models;

namespace AI_Travel_Inspector.Repositories;

public interface ITravelRepository
{
    Task<List<TravelPlan>> GetAllAsync();
    Task<TravelPlan?> GetAsync(string id);
    Task AddAsync(TravelPlan plan);
    Task UpdateAsync(TravelPlan plan);
    Task DeleteAsync(string id);
}
