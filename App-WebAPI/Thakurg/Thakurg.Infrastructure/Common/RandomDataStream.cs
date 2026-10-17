using System.Security.Cryptography;

namespace Thakurg.Infrastructure.Common;

public sealed class RandomDataStream : Stream
{
    private long _position;

    private readonly long _length;

    public override bool CanRead => true;

    public override bool CanSeek => false;

    public override bool CanWrite => false;

    public override long Length => _length;

    private static readonly byte[] Block = CreateBlock();

    public override long Position
    {
        get => _position;
        set => throw new NotSupportedException();
    }

    public RandomDataStream(long length)
    {
        _length = length;
    }

    #region Public Methods

    public override void Flush()
    {
    }

    public override void SetLength(long value)
    {
        throw new NotSupportedException();
    }

    public override int Read(Span<byte> buffer)
    {
        var count = (int)Math.Min(Math.Min(buffer.Length, Block.Length), _length - _position);

        if (count <= 0)
            return 0;

        Block.AsSpan(0, count).CopyTo(buffer);
        _position += count;

        return count;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        throw new NotSupportedException();
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        return Read(buffer.AsSpan(offset, count));
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException();
    }

    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult(Read(buffer.Span));
    }

    #endregion

    #region Private Methods

    private static byte[] CreateBlock()
    {
        var block = new byte[65536];
        RandomNumberGenerator.Fill(block);

        return block;
    }

    #endregion
}
