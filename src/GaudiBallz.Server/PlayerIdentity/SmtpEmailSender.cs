using MailKit.Net.Smtp;
using MimeKit;

namespace GaudiBallz.Server.PlayerIdentity;

public sealed class SmtpOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string From { get; set; } = "noreply@example.com";
}

public sealed partial class SmtpEmailSender(SmtpOptions options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendCodeAsync(string email, string code, CancellationToken token = default)
    {
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(options.From));
        message.To.Add(MailboxAddress.Parse(email));
        message.Subject = "Your login code";
        message.Body = new TextPart("plain")
        {
            Text = $"Your code is: {code}\n\nIt expires in 10 minutes.",
        };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(options.Host, options.Port, MailKit.Security.SecureSocketOptions.Auto, token);

            if (!string.IsNullOrEmpty(options.Username))
            {
                await client.AuthenticateAsync(options.Username, options.Password ?? string.Empty, token);
            }

            await client.SendAsync(message, token);
            await client.DisconnectAsync(true, token);
        }
        catch (Exception ex)
        {
            SendFailed(logger, email, ex);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Failed to send email code to {Email}")]
    private static partial void SendFailed(ILogger logger, string email, Exception ex);
}
