import React from 'react';

/**
 * Props for `PowerupGuideModal` component
 */
export interface PowerupGuideModalProps {
    /** Controls whether the modal is visible */
    readonly isOpen: boolean;
    /** Called when the modal requests to be closed (overlay or Close button) */
    readonly onClose: () => void;
}

/**
 * Modal dialog that lists all power-ups with icon and guidance text.
 *
 * Renders nothing when `isOpen` is false. The modal can be closed by clicking
 * the overlay or the Close button.
 */
const PowerupGuideModal: React.FC<PowerupGuideModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="powerup-guide-title"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                    width: 'min(584px, 92%)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="powerup-guide-title" style={{ marginTop: 0, marginBottom: 12 }}>
                    Power-ups instruction
                </h2>
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/images/chance_second.png" alt="Second Chance" width={72} height={72} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, textAlign: 'left' }}>Second Chance</div>
                            <div style={{ fontSize: 14, color: '#555', textAlign: 'left' }}>
                                The player can have another selection if they had a bad one.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/images/chance_reveal.png" alt="Reveal Two" width={72} height={72} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, textAlign: 'left' }}>Reveal Two</div>
                            <div style={{ fontSize: 14, color: '#555', textAlign: 'left' }}>
                                Show the first two cards at all positions while keeping the last card hidden.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/images/chance_shield.png" alt="Life Shield" width={72} height={72} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, textAlign: 'left' }}>Life Shield</div>
                            <div style={{ fontSize: 14, color: '#555', textAlign: 'left' }}>
                                Prevent elimination for your team in this duel even if you lose.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/images/chance_block.png" alt="Lock All" width={72} height={72} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, textAlign: 'left' }}>Lock All</div>
                            <div style={{ fontSize: 14, color: '#555', textAlign: 'left' }}>
                                Lock the opponent from using any power-ups for the rest of this duel.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/images/chance_remove.png" alt="Remove Worst" width={72} height={72} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, textAlign: 'left' }}>Remove Worst</div>
                            <div style={{ fontSize: 14, color: '#555', textAlign: 'left' }}>
                                Remove the worst card group from selection.
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                    <button type="button" className={'btn'} onClick={onClose} style={{ marginBottom: 8 }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PowerupGuideModal;


