import { describe, it, expect } from 'vitest';
import { resolveUri, decodeJsonDataUri, normalizeMetadata } from './metadata.js';

describe('resolveUri', () => {
  it('rewrites ipfs:// to the gateway', () => {
    expect(resolveUri('ipfs://QmHash/1.png')).toBe('https://ipfs.io/ipfs/QmHash/1.png');
  });
  it('strips a redundant ipfs/ prefix', () => {
    expect(resolveUri('ipfs://ipfs/QmHash')).toBe('https://ipfs.io/ipfs/QmHash');
  });
  it('leaves http(s) and data URIs untouched', () => {
    expect(resolveUri('https://x.com/a.png')).toBe('https://x.com/a.png');
    expect(resolveUri('data:image/svg+xml;base64,AAAA')).toBe('data:image/svg+xml;base64,AAAA');
  });
  it('honors a custom gateway', () => {
    expect(resolveUri('ipfs://QmHash', 'https://cf.example/ipfs/')).toBe(
      'https://cf.example/ipfs/QmHash',
    );
  });
});

describe('decodeJsonDataUri', () => {
  it('decodes a base64 json data uri', () => {
    const json = JSON.stringify({ name: 'On-chain' });
    const uri = `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
    expect(decodeJsonDataUri(uri)).toBe(json);
  });
  it('decodes a plain (url-encoded) json data uri', () => {
    const uri = 'data:application/json,%7B%22name%22%3A%22Plain%22%7D';
    expect(decodeJsonDataUri(uri)).toBe('{"name":"Plain"}');
  });
  it('returns null for non-json data uris', () => {
    expect(decodeJsonDataUri('https://x.com/1.json')).toBeNull();
  });
});

describe('normalizeMetadata', () => {
  it('picks name/description and resolves the image', () => {
    const meta = normalizeMetadata({
      name: 'Punk #1',
      description: 'cool',
      image: 'ipfs://QmImg/1.png',
    });
    expect(meta).toEqual({
      name: 'Punk #1',
      description: 'cool',
      image: 'https://ipfs.io/ipfs/QmImg/1.png',
    });
  });
  it('accepts image_url / imageUrl aliases', () => {
    expect(normalizeMetadata({ image_url: 'https://x/a.png' }).image).toBe('https://x/a.png');
    expect(normalizeMetadata({ imageUrl: 'https://x/b.png' }).image).toBe('https://x/b.png');
  });
  it('is tolerant of junk', () => {
    expect(normalizeMetadata(null)).toEqual({});
    expect(normalizeMetadata({ name: 42, image: '' })).toEqual({});
  });
});
