namespace AI_Travel_Inspector.Models;

public class TravelPlan
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public string Destination { get; set; } = "";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public List<string> Travelers { get; set; } = new();
    public string Summary { get; set; } = "";
    public List<TripSegment> Segments { get; set; } = new();
    public List<TravelDocument> Documents { get; set; } = new();
    public List<ChatTurn> ChatHistory { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TripSegment
{
    public string Type { get; set; } = "Other";
    public string Title { get; set; } = "";
    public string Location { get; set; } = "";
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
    public string Details { get; set; } = "";
    public string Reference { get; set; } = "";
}

public class TravelDocument
{
    public string FileName { get; set; } = "";
    public int PageCount { get; set; }
    public string Text { get; set; } = "";
}

public class ChatTurn
{
    public string Role { get; set; } = "";
    public string Content { get; set; } = "";
}
