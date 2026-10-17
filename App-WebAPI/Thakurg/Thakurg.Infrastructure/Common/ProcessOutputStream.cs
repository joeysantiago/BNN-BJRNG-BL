using System.Diagnostics;

namespace Thakurg.Infrastructure.Common;

public sealed class ProcessOutputStream : Stream
{
    private readonly Stream _output;

    private readonly Stream _source;

    private readonly Process _process;

    public override bool CanRead => true;

    public override bool CanSeek => false;

    public override bool CanWrite => false;

    private readonly CancellationTokenSource _cancellation = new();

    public override long Length => throw new NotSupportedException();

    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public ProcessOutputStream(Process process, Stream source)
    {
        _process = process;
        _source = source;
        _output = process.StandardOutput.BaseStream;
        process.ErrorDataReceived += (_, _) => { };
        process.BeginErrorReadLine();
        _ = PumpAsync();
    }

    #region Public Methods

    public override void Flush()
    {
    }

    public override void SetLength(long value)
    {
        throw new NotSupportedException();
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        throw new NotSupportedException();
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        return _output.Read(buffer, offset, count);
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException();
    }

    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        return _output.ReadAsync(buffer, cancellationToken);
    }

    #endregion

    #region Private Methods

    private async Task PumpAsync()
    {
        try
        {
            await _source.CopyToAsync(_process.StandardInput.BaseStream, _cancellation.Token);
        }
        catch (Exception)
        {
        }
        finally
        {
            try
            {
                _process.StandardInput.Close();
            }
            catch (Exception)
            {
            }
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _cancellation.Cancel();

            try
            {
                if (!_process.HasExited)
                    _process.Kill(true);
            }
            catch (InvalidOperationException)
            {
            }

            _process.Dispose();
            _source.Dispose();
        }

        base.Dispose(disposing);
    }

    #endregion
}
