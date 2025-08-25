# AutoPGP

A Vencord plugin to encrypt and decrypt Discord messages automatically with PGP using your own public and private keys.

## Features

Auto decryption

--todo

Decryption on demand

--todo

## Todo

- [x] Add support for group chats
- [ ] Keep decrypted messages in memory when navigating around
- [ ] Add support for encrypting attachments

This plugin uses the **openpgp.js** lib from `https://cdn.jsdelivr.net/npm/openpgp@5/dist/openpgp.min.js`
The keys and passphrases are stored locally using DataStore
