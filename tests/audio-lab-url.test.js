'use strict';
const assert = require('node:assert/strict');
const { prepararUrlAudioLab } = require('../src/audio-lab-url');

const original = 'https://aguiacast.com/webdj/R0ExM2Q=';
assert.equal(prepararUrlAudioLab(original), original + '?agc_audio_lab=1');
assert.equal(prepararUrlAudioLab(original+'?t=4#mix'), original+'?t=4&agc_audio_lab=1#mix');
assert.equal(prepararUrlAudioLab(original+'?agc_audio_lab=1'), null);
assert.equal(prepararUrlAudioLab(original+'?agc_audio_lab=0'), null);
assert.equal(prepararUrlAudioLab('https://aguiacast.com/webdj-studio'), null);
assert.equal(prepararUrlAudioLab('https://aguiacast.com/login'), null);
assert.equal(prepararUrlAudioLab('https://aguiacast.com/dashboard'), null);
assert.equal(prepararUrlAudioLab('https://outro.exemplo/webdj/R0ExM2Q='), null);
assert.equal(prepararUrlAudioLab('https://aguiacast.com.evil.example/webdj/R0ExM2Q='), null);
assert.equal(prepararUrlAudioLab('https://aguiacast.com/webdj/R0ExM2Q=/invalido'), null);
assert.equal(prepararUrlAudioLab('invalido'), null);
console.log('OK: 11 cenarios de URL verificados');
