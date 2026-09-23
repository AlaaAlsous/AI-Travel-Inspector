namespace AI_Travel_Inspector.Models;

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
