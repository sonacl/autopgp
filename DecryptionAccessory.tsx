/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";
import { Parser, React } from "@webpack/common";

const DecryptionSetters = new Map<string, (v: string) => void>();

export function handleDecrypt(messageId: string, decryptedText: string) {
    const setter = DecryptionSetters.get(messageId);
    if (setter) setter(decryptedText);
}

function Dismiss({ onDismiss }: { onDismiss: () => void; }) {
    return (
        <button
            onClick={onDismiss}
            style={{ background: "none", border: "none", color: "var(--text-link)", padding: 0, cursor: "pointer" }}
        >
            Dismiss
        </button>
    );
}

const DecryptIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "4px" }}>
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
);

export function DecryptionAccessory({ message }: { message: Message; }) {
    const [decryptedText, setDecryptedText] = React.useState<string>();

    React.useEffect(() => {
        DecryptionSetters.set(message.id, setDecryptedText);
        return () => void DecryptionSetters.delete(message.id);
    }, [message.id]);

    if (!decryptedText) return null;

    return (
        <div style={{ color: "var(--text-muted)", marginTop: "4px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
                <DecryptIcon />
                <strong>Decrypted:</strong>
            </div>
            {Parser.parse(decryptedText)}
            <br />
            (<Dismiss onDismiss={() => setDecryptedText(undefined)} />)
        </div>
    );
}
