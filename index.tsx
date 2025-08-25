/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import {
    addMessagePreSendListener,
    removeMessagePreSendListener,
} from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Logger } from "@utils/Logger";
import { Message } from "@vencord/discord-types";
import {
    ChannelStore,
    Menu,
    React,
    showToast,
    Toasts,
    UserStore,
} from "@webpack/common";

import { DecryptionAccessory, handleDecrypt } from "./DecryptionAccessory";
import { buildKeyInputModal } from "./KeyInputModal";

const pgpBlockRegex = /(-----BEGIN PGP (?:PUBLIC KEY|PRIVATE KEY|MESSAGE) BLOCK-----)([\s\S]*?)(-----END PGP (?:PUBLIC KEY|PRIVATE KEY|MESSAGE) BLOCK-----)/;

declare global {
    interface Window {
        openpgp: any;
    }
}

const settings = definePluginSettings({
    publicKey: {
        type: OptionType.STRING,
        description: "Your PGP public key",
        default: "",
        multiline: true,
    },
    privateKey: {
        type: OptionType.STRING,
        description: "Your PGP private key",
        default: "",
        multiline: true,
    },
    passphrase: {
        type: OptionType.STRING,
        description: "Passphrase for your private key (if any)",
        default: "",
    },
    decryptMessages: {
        type: OptionType.BOOLEAN,
        description: "Enable auto message decryption",
        default: true,
    },
});

const logger = new Logger("AutoPGP");

const cleanPgpKey = (key: string) => {
    if (!key || typeof key !== "string") return "";
    key = key.trim();

    const match = key.match(pgpBlockRegex);

    if (!match) return key;

    const header = match[1].trim();
    const body = match[2].trim();
    const footer = match[3].trim();

    return `${header}\n\n${body}\n${footer}`;
};

const pgpError = (msg: string) => showToast(`PGP error: ${msg}`, Toasts.Type.FAILURE);

const readKeyFromArmored = (armoredKey: string) => window.openpgp.readKey({ armoredKey: cleanPgpKey(armoredKey) });
const readMessageFromArmored = (armoredMessage: string) => window.openpgp.readMessage({ armoredMessage: cleanPgpKey(armoredMessage) });

async function loadPrivateKey(privateKeyArmored: string, passphrase: string) {
    if (!privateKeyArmored) return null;
    let key = await readKeyFromArmored(privateKeyArmored);
    if (!key) return null;
    if (!passphrase) return key;
    try {
        key = await window.openpgp.decryptKey({ privateKey: key, passphrase });
        return key;
    } catch (e) {
        logger.error("PGP: could not decrypt private key", e);
        return null;
    }
}

async function readKeysFromArmored(armoredKeys: string[]) {
    return Promise.all(armoredKeys.map(k => readKeyFromArmored(k)));
}

async function decryptPGPMessage(armoredMessage: string): Promise<string | null> {
    try {
        const { privateKey: privateKeyArmored, passphrase } = settings.store;

        if (!privateKeyArmored) {
            logger.error("Private key not set for decryption");
            return null;
        }

        const privateKey = await loadPrivateKey(privateKeyArmored, passphrase);
        if (!privateKey) return null;

        const { data } = await window.openpgp.decrypt({
            message: await readMessageFromArmored(armoredMessage),
            decryptionKeys: privateKey,
        });

        return typeof data === "string" ? data : new TextDecoder().decode(data);
    } catch (error) {
        logger.error("PGP Decryption failed:", error);
        return null;
    }
}

const saveUserKey = async (userId: string, key: string) => {
    const currentKeys = (await DataStore.get("userKeys")) ?? {};
    await DataStore.set("userKeys", {
        ...currentKeys,
        [userId]: cleanPgpKey(key),
    });
};

const PgpToggle: ChatBarButtonFactory = ({ channel, isMainChat }) => {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        DataStore.get("pgpChannelStates").then(states => {
            setEnabled(states?.[channel.id] ?? false);
        });
    }, [channel.id]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable PGP Encryption" : "Enable PGP Encryption"}
            onClick={async () => {
                const newEnabled = !enabled;
                setEnabled(newEnabled);
                const currentStates = (await DataStore.get("pgpChannelStates")) ?? {};
                await DataStore.set("pgpChannelStates", {
                    ...currentStates,
                    [channel.id]: newEnabled,
                });
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                    fill="currentColor"
                    d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                />
                {!enabled && (
                    <path
                        fill="var(--status-danger)"
                        d="m21.178 1.707 1.414 1.414L4.12 21.593l-1.414-1.415L21.178 1.707Z"
                    />
                )}
            </svg>
        </ChatBarButton>
    );
};

const UserContextMenu: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user) return;

    const KeyIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M8,9 C8,5.13400675 11.1340068,2 15,2 C18.8659932,2 22,5.13400675 22,9 C22,12.8659932 18.8659932,16 15,16 L13,16 L13,18 L11,18 L11,20 L9,20 L9,22 L2,22 L2,16.5857864 L8.14800517,10.4377813 C8.0499525,9.96846804 8,9.48730703 8,9 Z M11,14 L15,14 C17.7614237,14 20,11.7614237 20,9 C20,6.23857625 17.7614237,4 15,4 C12.2385763,4 10,6.23857625 10,9 C10,9.49863276 10.0726899,9.98638049 10.2140786,10.4528677 L10.3878889,11.0263246 L4,17.4142136 L4,20 L7,20 L7,18 L9,18 L9,16 L11,16 L11,14 Z M15,11 C13.8954305,11 13,10.1045695 13,9 C13,7.8954305 13.8954305,7 15,7 C16.1045695,7 17,7.8954305 17,9 C17,10.1045695 16.1045695,11 15,11 Z" />
        </svg>
    );

    children.push(
        <Menu.MenuItem
            id="vc-set-pgp-key"
            label="Set PGP Key"
            icon={KeyIcon}
            action={() => {
                DataStore.get("userKeys").then(userKeys => {
                    const existingKey = (userKeys ?? {})[user.id] ?? "";
                    buildKeyInputModal(user, existingKey, key => saveUserKey(user.id, key));
                });
            }}
        />
    );
};

export default definePlugin({
    name: "AutoPGP",
    description: "Encrypt and decrypt messages automatically with PGP.",
    authors: [{ name: "spitkov", id: 1092100801478004816n }],
    settings,

    start() {
        if (!window.openpgp) {
            fetch("https://cdn.jsdelivr.net/npm/openpgp@5.11.1/dist/openpgp.min.js")
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch openpgp.js");
                    return res.text();
                })
                .then(eval)
                .catch(err => {
                    logger.error("Failed to load openpgp.js:", err);
                    showToast("Failed to load openpgp.js. The plugin will not work.", Toasts.Type.FAILURE);
                });
        }


        const listener = (async (channelId: string, message: { content: string; }) => {
            const channel = ChannelStore.getChannel(channelId);
            const channelStates = (await DataStore.get("pgpChannelStates")) ?? {};
            const isEnabled = channelStates[channelId] ?? false;

            if (!isEnabled || !channel || ![1, 3].includes(channel.type) || !message.content?.trim()) {
                return true;
            }

            const userKeys = (await DataStore.get("userKeys")) ?? {};
            const recipientsWithoutKeys = channel.recipients.filter(id => !userKeys[id]);

            if (recipientsWithoutKeys.length > 0) {
                const userNames = recipientsWithoutKeys
                    .map(id => {
                        const user = UserStore.getUser(id);
                        return user ? user.username : null;
                    })
                    .filter(Boolean)
                    .join(", ");

                showToast(`PGP key not found for: ${userNames}. Message not sent.`, Toasts.Type.FAILURE);
                message.content = "";
                return false;
            }

            try {
                const { publicKey: publicKeyArmored, privateKey: privateKeyArmored, passphrase } = settings.store;

                if (!privateKeyArmored || !publicKeyArmored) {
                    pgpError("your public or private key is not set. Message not sent.");
                    message.content = "";
                    return false;
                }

                const decryptedPrivateKey = await loadPrivateKey(privateKeyArmored, passphrase);
                if (!decryptedPrivateKey) {
                    pgpError("could not unlock your private key. Check your key and passphrase. Message not sent.");
                    message.content = "";
                    return false;
                }

                const encryptionKeys = await readKeysFromArmored([
                    ...channel.recipients.map(id => userKeys[id]),
                    publicKeyArmored,
                ]);

                const encryptedMessage = await window.openpgp.encrypt({
                    message: await window.openpgp.createMessage({ text: message.content }),
                    encryptionKeys,
                    signingKeys: decryptedPrivateKey,
                });

                message.content = encryptedMessage;
                return true;
            } catch (error) {
                logger.error("PGP Encryption failed:", error);
                pgpError("could not encrypt the message. It will not be sent.");
                message.content = "";
                return false;
            }
        });

        this.listener = listener;
        addMessagePreSendListener(this.listener);
    },

    stop() {
        if (this.listener) {
            removeMessagePreSendListener(this.listener);
            this.listener = null;
        }
    },

    renderChatBarButton: PgpToggle,

    renderMessageAccessory: props => <DecryptionAccessory message={props.message} />,

    async decryptPgpMessage(armoredMessage: string): Promise<string | null> {
        return decryptPGPMessage(armoredMessage);
    },


    contextMenus: {
        "user-context": UserContextMenu,
    },

    renderMessagePopoverButton(message: Message) {
        if (!message.content?.includes("-----BEGIN PGP MESSAGE-----")) return null;

        const DecryptIcon = () => (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
            </svg>
        );

        return {
            label: "Decrypt Message",
            icon: DecryptIcon,
            message,
            channel: ChannelStore.getChannel(message.channel_id),
            onClick: async () => {
                const decryptedText = await this.decryptPgpMessage(message.content);
                if (decryptedText) {
                    handleDecrypt(message.id, decryptedText);
                } else {
                    showToast("Could not decrypt the message. Check your key and passphrase.", Toasts.Type.FAILURE);
                }
            },
        };
    },

    flux: {
        MESSAGE_CREATE: async function (action) {
            const { optimistic, type, message, channelId } = action;

            if (optimistic || type !== "MESSAGE_CREATE" || message.state === "SENDING" || !message.content?.includes("-----BEGIN PGP MESSAGE-----") || !settings.store.decryptMessages) {
                return;
            }

            const decryptedText = await decryptPGPMessage(message.content);
            if (decryptedText) {
                handleDecrypt(message.id, decryptedText);
            }
        },
    },
});
