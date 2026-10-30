namespace Thakurg.Contracts.Khata;

public class BookContactsDto
{
    public BookDto Book { get; set; } = new();

    public List<ContactDto> Contacts { get; set; } = [];
}
