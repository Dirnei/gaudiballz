namespace GaudiBallz.Server.PlayerIdentity;

internal interface IEmailSender
{
    public Task SendCodeAsync(string email, string code, CancellationToken token = default);
}
