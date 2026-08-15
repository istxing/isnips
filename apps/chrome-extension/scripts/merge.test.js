const assert = require('assert');
const { mergeSnippets } = require('../merge');

const local = [
  { id: '1', text: 'a', updated_at: 1000 },
  { id: '2', text: 'b', updated_at: 1000 }
];
const remote = [
  { id: '1', text: 'a-remote', updated_at: 2000 },
  { id: '3', text: 'c', updated_at: 500 }
];

const merged = mergeSnippets(local, remote, { preferRemoteOnTie: true });

assert.equal(merged.length, 3);
assert.equal(merged.find(s => s.id === '1').text, 'a-remote');
assert.equal(merged.find(s => s.id === '2').text, 'b');
assert.equal(merged.find(s => s.id === '3').text, 'c');

const tie = mergeSnippets(
  [{ id: '4', text: 'l', updated_at: 1000 }],
  [{ id: '4', text: 'r', updated_at: 1000 }],
  { preferRemoteOnTie: true }
);
assert.equal(tie.find(s => s.id === '4').text, 'r');

console.log('merge.test.js: ok');
