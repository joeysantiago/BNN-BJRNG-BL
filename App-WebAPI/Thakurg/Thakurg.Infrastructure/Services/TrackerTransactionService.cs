using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Thakurg.Application.Repositories;
using Thakurg.Application.Services;
using Thakurg.Contracts.Configurations;
using Thakurg.Contracts.Exceptions;
using Thakurg.Contracts.Messages;
using Thakurg.Contracts.Tracker;
using Thakurg.Contracts.Wrappers;
using Thakurg.Domain.Entities;
using Thakurg.Infrastructure.Common;

namespace Thakurg.Infrastructure.Services;

// SnapTracker's transactions. A pasted or shared SMS goes through the same steps as the Android app will send it: sender list, OTP and promotion filters
// (the "phone" steps), then failed payments, parsing, category, duplicate check (same text, same reference, or the same amount, direction and merchant
// within Tracker:Limits:DuplicateMinutes) and approval by the user's mode. The answer lists every step, so the app can show why a message was kept or not.
// An SMS backup comes in batches: each message keeps the date it was received, one imported before is only counted, and an import makes no alerts.
public class TrackerTransactionService : ITrackerTransactionService
{
    private readonly TrackerOptions _options;

    private readonly ITrackerSmsReader _reader;

    private readonly ITrackerRepository _repository;

    private readonly IMessageService _messageService;

    private readonly ITrackerService _trackerService;

    private readonly ITrackerSecretProtector _protector;

    public TrackerTransactionService(ITrackerRepository repository, ITrackerSmsReader reader, ITrackerSecretProtector protector, ITrackerService trackerService, IMessageService messageService, IOptions<TrackerOptions> options)
    {
        _repository = repository;
        _reader = reader;
        _protector = protector;
        _trackerService = trackerService;
        _messageService = messageService;
        _options = options.Value;
    }

    #region Public Methods

    public async Task<ServiceResultDto<TrackerDataDto>> RemoveAsync(TrackerCallerDto caller, int id, CancellationToken cancellationToken)
    {
        await _repository.RemoveTransactionAsync(await TransactionAsync(caller, id, cancellationToken), cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerDeleted, cancellationToken);
    }

    public async Task<TrackerSmsReadDto> ReadSmsAsync(TrackerCallerDto caller, TrackerSmsRequestDto request, CancellationToken cancellationToken)
    {
        var body = Regex.Replace(request.Body ?? string.Empty, @"\s+", " ").Trim();

        if (body.Length == 0)
            throw new BusinessException(MessageCodes.TrackerSmsEmpty, 400);

        if (body.Length > _options.Limits.MaxSmsLength)
            throw new BusinessException(MessageCodes.TrackerSmsTooLong, 400, _options.Limits.MaxSmsLength);

        var user = await UserAsync(caller, cancellationToken);
        var sender = string.IsNullOrWhiteSpace(request.Sender) ? GuessSender(body) : request.Sender.Trim();
        var result = await ProcessAsync(user, sender, body, DateTime.UtcNow, true, cancellationToken);

        return new TrackerSmsReadDto { Result = result, State = await _trackerService.GetStateAsync(caller, cancellationToken) };
    }

    public async Task<ServiceResultDto<TrackerDataDto>> ActAsync(TrackerCallerDto caller, int id, string action, CancellationToken cancellationToken)
    {
        var transaction = await TransactionAsync(caller, id, cancellationToken);
        var code = action switch
        {
            "confirm" => MessageCodes.TrackerConfirmed,
            "ignore" => MessageCodes.TrackerIgnored,
            "restore" => MessageCodes.TrackerRestored,
            "not-duplicate" => MessageCodes.TrackerNotDuplicate,
            _ => throw new BusinessException(MessageCodes.TrackerInvalid, 400),
        };
        transaction.Status = action switch { "ignore" => TrackerStatuses.Ignored, "not-duplicate" => TrackerStatuses.Pending, _ => TrackerStatuses.Confirmed };

        if (action == "not-duplicate")
        {
            transaction.DuplicateOfId = null;
            transaction.DuplicateReason = null;
        }

        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, code, cancellationToken);
    }

    // Confirm, ignore, restore, or "not a duplicate" (which puts it back in the user's check list).
    public async Task<TrackerImportReadDto> ImportSmsAsync(TrackerCallerDto caller, TrackerImportRequestDto request, CancellationToken cancellationToken)
    {
        if (request.Messages is not { Count: > 0 } || request.Messages.Count > _options.Limits.MaxImportBatch)
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);

        var user = await UserAsync(caller, cancellationToken);
        var result = new TrackerImportResultDto();
        var latest = DateTime.UtcNow.AddDays(1);

        foreach (var message in request.Messages.OrderBy(m => m.ReceivedAt.ToUniversalTime()))
        {
            var body = Regex.Replace(message.Body ?? string.Empty, @"\s+", " ").Trim();
            var receivedAt = TrackerMapper.Utc(message.ReceivedAt.ToUniversalTime());

            if (body.Length == 0 || body.Length > _options.Limits.MaxSmsLength || receivedAt <= DateTime.UnixEpoch || receivedAt > latest)
                result.Skipped++;
            else if (await _repository.HasSmsAsync(user.Id, Hash(body), receivedAt, cancellationToken))
                result.Already++;
            else
                Count(result, (await ProcessAsync(user, message.Sender?.Trim() ?? string.Empty, body, receivedAt, false, cancellationToken)).Outcome);
        }

        return new TrackerImportReadDto { Result = result, State = await _trackerService.GetStateAsync(caller, cancellationToken) };
    }

    public async Task<ServiceResultDto<TrackerDataDto>> AddAsync(TrackerCallerDto caller, TrackerTxnRequestDto request, CancellationToken cancellationToken)
    {
        Check(request);
        var transaction = new TrackerTransaction { TrackerUserId = caller.UserId, Source = TrackerSources.Manual, Status = TrackerStatuses.Confirmed, Confidence = 100, CurrencyCode = _options.CurrencyCode };
        Apply(transaction, request);
        _repository.AddTransaction(transaction);
        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerAdded, cancellationToken);
    }

    public async Task<ServiceResultDto<TrackerDataDto>> EditAsync(TrackerCallerDto caller, int id, TrackerTxnRequestDto request, CancellationToken cancellationToken)
    {
        Check(request);
        var transaction = await TransactionAsync(caller, id, cancellationToken);
        Apply(transaction, request);
        transaction.IsEdited = true;
        transaction.TypeGuessed = false;

        if (transaction.Status == TrackerStatuses.Pending)
            transaction.Status = TrackerStatuses.Confirmed;

        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerSaved, cancellationToken);
    }

    // A new category; "remember" also files every later transaction of this merchant there (TrackerCategoryRules).
    public async Task<ServiceResultDto<TrackerDataDto>> SetCategoryAsync(TrackerCallerDto caller, int id, TrackerCategoryRequestDto request, CancellationToken cancellationToken)
    {
        if (!_options.Categories.Contains(request.Category))
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);

        var transaction = await TransactionAsync(caller, id, cancellationToken);
        transaction.CategoryCode = request.Category;
        transaction.IsEdited = true;

        if (!request.Remember || transaction.Merchant is null)
        {
            await _repository.SaveChangesAsync(cancellationToken);

            return await ResultAsync(caller, MessageCodes.TrackerCategorySaved, cancellationToken);
        }

        var key = transaction.Merchant.ToLowerInvariant();
        var rule = (await _repository.GetRulesAsync(caller.UserId, cancellationToken)).FirstOrDefault(r => r.MerchantKey == key);

        if (rule is null)
            _repository.AddRule(new TrackerCategoryRule { TrackerUserId = caller.UserId, MerchantKey = key, CategoryCode = request.Category });
        else
            rule.CategoryCode = request.Category;

        await _repository.SaveChangesAsync(cancellationToken);

        return await ResultAsync(caller, MessageCodes.TrackerCategoryRule, cancellationToken, transaction.Merchant);
    }

    #endregion

    #region Private Methods

    private static string Hash(string text)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));
    }

    // A pasted SMS often comes without its sender: the bank named in the text stands in for it (AD-HDFCBK-S for "HDFC Bank").
    private string GuessSender(string body)
    {
        var hit = _options.Senders.FirstOrDefault(s => body.Contains(Regex.Replace(s.Value, " Bank$", string.Empty), StringComparison.OrdinalIgnoreCase));

        return hit.Key is null ? string.Empty : $"AD-{hit.Key}-S";
    }

    private void Check(TrackerTxnRequestDto request)
    {
        var limits = _options.Limits;
        var minor = (long)Math.Round(request.Amount * 100);
        var valid = minor > 0 && minor <= limits.MaxAmountMinor && request.Type is TrackerTypes.Debit or TrackerTypes.Credit && _options.Categories.Contains(request.Category) && TrackerMethods.All.Contains(request.Method)
            && (request.Merchant?.Trim().Length ?? 0) <= limits.MerchantLength && (request.Note?.Trim().Length ?? 0) <= limits.NoteLength && request.At > DateTime.UnixEpoch;

        if (!valid)
            throw new BusinessException(MessageCodes.TrackerInvalid, 400);
    }

    private static string? Cut(string? text, int length)
    {
        return text is null || text.Length <= length ? text : text[..length];
    }

    private static void Count(TrackerImportResultDto result, string outcome)
    {
        if (outcome == "created")
            result.Created++;
        else if (outcome == "duplicate")
            result.Duplicates++;
        else
            result.Skipped++;
    }

    private void Alert(TrackerUser user, string type, TrackerTransaction? transaction)
    {
        if (!user.AlertTypes.Split(',').Contains(type))
            return;

        var args = transaction is null ? "{}" : JsonSerializer.Serialize(new { merchant = transaction.Merchant ?? string.Empty, amount = transaction.AmountMinor / 100m, credit = transaction.Type == TrackerTypes.Credit ? 1 : 0 });
        _repository.AddAlert(new TrackerAlert { TrackerUserId = user.Id, Type = type, TransactionId = transaction?.Id, Args = args });
    }

    private static void Apply(TrackerTransaction transaction, TrackerTxnRequestDto request)
    {
        transaction.AmountMinor = (long)Math.Round(request.Amount * 100);
        transaction.Type = request.Type;
        transaction.CategoryCode = request.Category;
        transaction.Method = request.Method;
        transaction.Merchant = string.IsNullOrWhiteSpace(request.Merchant) ? null : request.Merchant.Trim();
        transaction.Note = request.Note?.Trim() ?? string.Empty;
        transaction.OccurredOn = request.At.ToUniversalTime();
    }

    private async Task<TrackerUser> UserAsync(TrackerCallerDto caller, CancellationToken cancellationToken)
    {
        return await _repository.GetUserAsync(caller.UserId, cancellationToken) ?? throw new BusinessException(MessageCodes.AuthSessionInvalid, 401);
    }

    private async Task<TrackerTransaction> TransactionAsync(TrackerCallerDto caller, int id, CancellationToken cancellationToken)
    {
        return await _repository.GetTransactionAsync(caller.UserId, id, cancellationToken) ?? throw new BusinessException(MessageCodes.TrackerNotFound, 404);
    }

    // The same message twice, the same reference (the bank and the UPI app both sent one), or the same amount, direction and merchant within the window.
    private async Task<(TrackerTransaction Original, string Why)?> FindDuplicateAsync(TrackerTransaction t, string hash, CancellationToken cancellationToken)
    {
        var window = TimeSpan.FromMinutes(_options.Limits.DuplicateMinutes);
        var candidates = await _repository.GetDuplicateCandidatesAsync(t.TrackerUserId, t.Reference, hash, t.AmountMinor, t.OccurredOn - window, t.OccurredOn + window, cancellationToken);

        foreach (var x in candidates)
        {
            if (x.SmsText is not null && x.SmsText.BodyHash == hash && (t.SmsText!.ReceivedOn - x.SmsText.ReceivedOn).Duration() < TimeSpan.FromDays(1))
                return (x, "sameText");

            if (t.Reference is not null && x.Reference == t.Reference && x.Type == t.Type)
                return (x, "sameRef");

            if (x.AmountMinor == t.AmountMinor && x.Type == t.Type && (x.OccurredOn - t.OccurredOn).Duration() <= window && (t.Merchant is null || x.Merchant is null || x.Merchant == t.Merchant) && (t.AccountLast4 is null || x.AccountLast4 is null || x.AccountLast4 == t.AccountLast4))
                return (x, "sameAmount");
        }

        return null;
    }

    private async Task<ServiceResultDto<TrackerDataDto>> ResultAsync(TrackerCallerDto caller, string code, CancellationToken cancellationToken, params object[] arguments)
    {
        return new ServiceResultDto<TrackerDataDto> { Message = await _messageService.GetAsync(code, arguments), Data = await _trackerService.GetStateAsync(caller, cancellationToken) };
    }

    private async Task<TrackerSmsResultDto> ProcessAsync(TrackerUser user, string sender, string body, DateTime receivedAt, bool alerts, CancellationToken cancellationToken)
    {
        var steps = new List<TrackerStepDto>();
        void Step(string where, string key, bool ok, Dictionary<string, object>? args = null) => steps.Add(new TrackerStepDto { Where = where, Key = key, Ok = ok, Args = args ?? [] });

        async Task<TrackerSmsResultDto> SkipAsync(Action count, string reason)
        {
            count();
            await _repository.SaveChangesAsync(cancellationToken);

            return new TrackerSmsResultDto { Outcome = "skipped", Reason = reason, Steps = steps };
        }

        var parsedSender = _reader.ParseSender(sender);
        var senderName = parsedSender is { } s ? _reader.SenderName(s.Code) : null;

        if (parsedSender is null || senderName is null)
        {
            Step("phone", "sender", false, new() { ["sender"] = sender.Length > 0 ? sender : "—" });

            return await SkipAsync(() => user.FilteredOther++, "notBank");
        }

        var kind = parsedSender.Value.Kind switch { "S" => "service", "P" => "promotional", "G" => "government", _ => "transactional" };
        Step("phone", "sender", true, new() { ["name"] = senderName, ["kind"] = kind });

        if (_reader.IsOtp(body))
        {
            Step("phone", "otp", false);

            return await SkipAsync(() => user.FilteredOtp++, "otp");
        }

        Step("phone", "otp", true);

        if (_reader.IsPromotion(body, parsedSender.Value.Kind))
        {
            Step("phone", "promo", false, new() { ["why"] = parsedSender.Value.Kind == "P" ? "header" : "words" });

            return await SkipAsync(() => user.FilteredPromo++, "promo");
        }

        Step("phone", "promo", true);

        if (_reader.IsFailed(body))
        {
            Step("server", "status", false);

            return await SkipAsync(() => user.FilteredFailed++, "failed");
        }

        var parsed = _reader.Parse(body, receivedAt);

        if (parsed.Amount <= 0)
        {
            Step("server", "amount", false);

            return await SkipAsync(() => user.FilteredOther++, "noAmount");
        }

        Step("server", "details", true, new() { ["amount"] = parsed.Amount, ["type"] = parsed.Type ?? string.Empty, ["method"] = parsed.Method, ["account"] = parsed.Account ?? string.Empty, ["ref"] = parsed.Ref ?? string.Empty });
        var rules = (await _repository.GetRulesAsync(user.Id, cancellationToken)).ToDictionary(r => r.MerchantKey, r => r.CategoryCode);
        var category = _reader.Categorize(parsed, body, rules);
        var marks = new[] { parsed.AmountText, parsed.MerchantRaw, parsed.AccountText, parsed.RefText }.Where(m => !string.IsNullOrEmpty(m));
        var hash = Hash(body);
        var transaction = new TrackerTransaction
        {
            TrackerUserId = user.Id,
            Source = TrackerSources.Sms,
            Type = parsed.Type ?? TrackerTypes.Debit,
            TypeGuessed = parsed.Type is null,
            AmountMinor = (long)Math.Round(parsed.Amount * 100),
            CurrencyCode = _options.CurrencyCode,
            Merchant = Cut(parsed.Merchant, _options.Limits.MerchantLength),
            CategoryCode = category,
            Kind = parsed.MerchantKind,
            Method = parsed.Method,
            AccountLast4 = parsed.Account,
            Reference = Cut(parsed.Ref, 30),
            OccurredOn = parsed.At,
            Confidence = _reader.Confidence(parsed, category),
            Note = string.Empty,
            SmsText = new TrackerSmsText { SenderHeader = Cut(sender.ToUpperInvariant(), 20)!, SenderName = senderName, BodyProtected = _protector.Protect(body), BodyHash = hash, Marks = JsonSerializer.Serialize(marks), ReceivedOn = receivedAt },
        };
        Step("server", "category", true, new() { ["category"] = category, ["found"] = parsed.Known ? "known" : parsed.Merchant is not null ? "text" : "none" });

        if (await FindDuplicateAsync(transaction, hash, cancellationToken) is { } duplicate)
        {
            transaction.Status = TrackerStatuses.Duplicate;
            transaction.DuplicateOfId = duplicate.Original.Id;
            transaction.DuplicateReason = duplicate.Why;
            Step("server", "duplicate", false, new() { ["why"] = duplicate.Why, ["ref"] = transaction.Reference ?? string.Empty });
        }
        else
        {
            Step("server", "duplicate", true);
            var sure = parsed.Type is not null && transaction.Confidence >= user.AutoApprovePercent;
            transaction.Status = user.ApprovalMode == TrackerApprovals.Auto ? (parsed.Type is not null ? TrackerStatuses.Auto : TrackerStatuses.Pending) : user.ApprovalMode == TrackerApprovals.Smart && sure ? TrackerStatuses.Auto : TrackerStatuses.Pending;
        }

        _repository.AddTransaction(transaction);
        await _repository.SaveChangesAsync(cancellationToken);
        Step("server", "save", true, new() { ["status"] = transaction.Status, ["confidence"] = transaction.Confidence });
        var answer = new TrackerSmsResultDto { Outcome = transaction.Status == TrackerStatuses.Duplicate ? "duplicate" : "created", Steps = steps, Txn = TrackerMapper.ToDto(transaction, _protector) };

        if (!alerts)
            return answer;

        Alert(user, transaction.Status == TrackerStatuses.Duplicate ? TrackerAlertTypes.Duplicate : TrackerAlertTypes.NewTx, transaction);

        if (transaction.Status == TrackerStatuses.Auto)
            Alert(user, TrackerAlertTypes.Categorized, transaction);

        if (transaction.Status == TrackerStatuses.Pending)
            Alert(user, TrackerAlertTypes.Verify, transaction);

        await _repository.SaveChangesAsync(cancellationToken);
        await _repository.TrimAlertsAsync(user.Id, _options.Limits.MaxAlerts, cancellationToken);

        return answer;
    }

    #endregion
}
