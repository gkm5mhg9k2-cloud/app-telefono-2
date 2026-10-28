/* Apre le pagine cifrate del portafoglio (AES-GCM, chiave dalla password con PBKDF2).
   La password si chiede una volta per dispositivo: poi la chiave resta in localStorage. */
(function () {
  'use strict';
  var radice = document.currentScript.getAttribute('data-radice') || '';
  // un nome per sito: i siti dello stesso account GitHub hanno la stessa origine, quindi lo stesso localStorage
  var POSTO = document.currentScript.getAttribute('data-posto') || 'portafoglio-chiave';
  var dati = JSON.parse(document.getElementById('cifrato').textContent);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(radice + 'sw.js').catch(function () {});
  }

  function byte(b64) {
    var s = atob(b64), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function base64(buf) {
    var a = new Uint8Array(buf), s = '';
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s);
  }
  function decifra(chiave) {
    return crypto.subtle.decrypt({name: 'AES-GCM', iv: byte(dati.iv)}, chiave, byte(dati.dati))
      .then(function (buf) { return new TextDecoder().decode(buf); });
  }
  function mostra(html) {
    // a caricamento in corso document.write aggiungerebbe in coda invece di sostituire la pagina
    var scrivi = function () {
      document.open();
      document.write(html);
      document.close();
    };
    if (document.readyState === 'complete') scrivi();
    else window.addEventListener('load', scrivi);
  }
  function ricordata() {
    try {
      var s = JSON.parse(localStorage.getItem(POSTO) || 'null');
      return s && s.sale === dati.sale ? byte(s.chiave) : null;
    } catch (e) { return null; }
  }
  function ricorda(chiave) {
    return crypto.subtle.exportKey('raw', chiave).then(function (raw) {
      try { localStorage.setItem(POSTO, JSON.stringify({sale: dati.sale, chiave: base64(raw)})); } catch (e) {}
    });
  }
  function dimentica() {
    try { localStorage.removeItem(POSTO); } catch (e) {}
  }

  function chiedi() {
    var modulo = document.getElementById('modulo');
    var campo = document.getElementById('password');
    var bottone = document.getElementById('apri');
    var errore = document.getElementById('errore');
    document.getElementById('sblocca').hidden = false;
    if (!window.crypto || !crypto.subtle) {
      errore.textContent = 'Questo browser non apre pagine cifrate: usa Safari con un indirizzo https.';
      bottone.disabled = true;
      return;
    }
    campo.focus();
    modulo.addEventListener('submit', function (ev) {
      ev.preventDefault();
      bottone.disabled = true;
      errore.textContent = 'Apertura…';
      crypto.subtle.importKey('raw', new TextEncoder().encode(campo.value), 'PBKDF2', false, ['deriveKey'])
        .then(function (base) {
          return crypto.subtle.deriveKey({name: 'PBKDF2', salt: byte(dati.sale), iterations: dati.iter, hash: 'SHA-256'},
            base, {name: 'AES-GCM', length: 256}, true, ['decrypt']);
        })
        .then(function (chiave) {
          return decifra(chiave).then(function (html) {
            return ricorda(chiave).then(function () { mostra(html); });
          });
        })
        .catch(function () {
          errore.textContent = 'Password sbagliata. Riprova.';
          bottone.disabled = false;
          campo.select();
        });
    });
  }

  var raw = window.crypto && crypto.subtle ? ricordata() : null;
  if (!raw) return chiedi();
  crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
    .then(decifra)
    .then(mostra)
    .catch(function () { dimentica(); chiedi(); });
})();
