/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { User } from "@vencord/discord-types";
import { Button, Forms, React, TextArea } from "@webpack/common";

interface KeyInputModalProps extends ModalProps {
    user: User;
    existingKey: string;
    onSave: (key: string) => void;
}

function KeyInputModal({ user, existingKey, onSave, ...props }: KeyInputModalProps) {
    const [key, setKey] = React.useState(existingKey);

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">
                    Set PGP Key for {user.username}
                </Forms.FormTitle>
            </ModalHeader>
            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>
                    PGP Public Key
                </Forms.FormTitle>
                <TextArea
                    value={key}
                    onChange={setKey}
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----...-----END PGP PUBLIC KEY BLOCK-----"
                    rows={10}
                />
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        onSave(key.trim());
                        props.onClose();
                    }}
                >
                    Save Key
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

export function buildKeyInputModal(user: User, existingKey: string, onSave: (key: string) => void) {
    openModal((props: ModalProps) => <KeyInputModal {...props} user={user} existingKey={existingKey} onSave={onSave} />);
}
