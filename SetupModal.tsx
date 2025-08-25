/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Button, Forms, React, TextArea, TextInput } from "@webpack/common";

interface SetupModalProps extends ModalProps {
    existingPublicKey: string;
    existingPrivateKey: string;
    existingPassphrase: string;
    onSave: (publicKey: string, privateKey: string, passphrase: string) => void;
}

function SetupModal({ existingPublicKey, existingPrivateKey, existingPassphrase, onSave, ...props }: SetupModalProps) {
    const [publicKey, setPublicKey] = React.useState(existingPublicKey ?? "");
    const [privateKey, setPrivateKey] = React.useState(existingPrivateKey ?? "");
    const [passphrase, setPassphrase] = React.useState(existingPassphrase ?? "");

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Setup PGP Keys and Passphrase</Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: 10 }}>Public Key</Forms.FormTitle>
                <TextArea
                    value={publicKey}
                    onChange={setPublicKey}
                    rows={8}
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----"
                />

                <Forms.FormTitle tag="h5" style={{ marginTop: 10 }}>Private Key</Forms.FormTitle>
                <TextArea
                    value={privateKey}
                    onChange={setPrivateKey}
                    rows={10}
                    placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----\n...\n-----END PGP PRIVATE KEY BLOCK-----"
                />

                <Forms.FormTitle tag="h5" style={{ marginTop: 10 }}>Passphrase (optional)</Forms.FormTitle>
                <TextInput
                    value={passphrase}
                    onChange={(v: string) => setPassphrase(v)}
                    placeholder="Your key's passphrase"
                    type="password"
                />
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        onSave(publicKey.trim(), privateKey.trim(), passphrase);
                        props.onClose();
                    }}
                >
                    Save
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={props.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function buildSetupModal(
    existingPublicKey: string,
    existingPrivateKey: string,
    existingPassphrase: string,
    onSave: (publicKey: string, privateKey: string, passphrase: string) => void
) {
    openModal((props: ModalProps) => (
        <SetupModal
            {...props}
            existingPublicKey={existingPublicKey}
            existingPrivateKey={existingPrivateKey}
            existingPassphrase={existingPassphrase}
            onSave={onSave}
        />
    ));
}
