namespace Thakurg.Infrastructure.Common;

public sealed class BoundedStream : Stream
{
    private long _remaining;

    private readonly Stream _inner;

    public override bool CanRead => true;

    public override bool CanSeek => false;

    public override bool CanWrite => false;

    public override long Length => throw new NotSupportedException();

    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public BoundedStream(Stream inner, long start, long length)
    {
        _inner = inner;
        _remaining = length;
        _inner.Seek(start, SeekOrigin.Begin);
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
        var read = _inner.Read(buffer, offset, (int)Math.Min(count, _remaining));
        _remaining -= read;

        return read;
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException();
    }

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        var read = await _inner.ReadAsync(buffer[..(int)Math.Min(buffer.Length, _remaining)], cancellationToken);
        _remaining -= read;

        return read;
    }

    #endregion

    #region Private Methods

    protected override void Dispose(bool disposing)
    {
        if (disposing)
            _inner.Dispose();

        base.Dispose(disposing);
    }

    #endregion
}
